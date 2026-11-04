import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import db from "../db/database";

export const RESERVATION_MINUTES = 60;
export const RESERVATION_GRACE_MINUTES = 10;

export class CheckoutConflict extends Error {
  readonly status = 409;
}

export interface StockItem {
  product_id: string;
  quantity: number;
}

export interface StockProduct extends RowDataPacket {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  is_active: number;
}

export interface StockOrder extends RowDataPacket {
  id: string;
  status: string;
  total: number;
  stock_reserved_at: string | null;
  stock_released_at: string | null;
  expired: number;
}

// Un único renglón por producto y el mismo orden de bloqueo en compra y reposición.
export function consolidateStockItems(items: StockItem[]): StockItem[] {
  const quantities = new Map<string, number>();
  for (const item of items) {
    const id = item.product_id.toLowerCase();
    const quantity = (quantities.get(id) ?? 0) + item.quantity;
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 2147483647) {
      throw new CheckoutConflict("La cantidad solicitada supera el máximo permitido");
    }
    quantities.set(id, quantity);
  }
  return [...quantities].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([product_id, quantity]) => ({ product_id, quantity }));
}

// El llamador mantiene la transacción hasta guardar pedido, ítems y movimientos.
export async function lockStockProducts(conn: PoolConnection, items: StockItem[]): Promise<StockProduct[]> {
  const products: StockProduct[] = [];
  for (const item of items) {
    const [rows] = await conn.query<StockProduct[]>(
      "SELECT id, name, price, stock_quantity, is_active FROM products WHERE id = ? FOR UPDATE",
      [item.product_id]
    );
    const product = rows[0];
    if (!product || !product.is_active) {
      throw new CheckoutConflict("Uno de los productos del carrito ya no está disponible");
    }
    if (product.stock_quantity < item.quantity) {
      throw new CheckoutConflict(
        `Stock insuficiente para "${product.name}". Disponible: ${product.stock_quantity}, solicitado: ${item.quantity}`
      );
    }
    products.push(product);
  }
  return products;
}

export async function deductOrderStock(
  conn: PoolConnection, orderId: string, userId: string,
  items: StockItem[], products: StockProduct[]
): Promise<void> {
  for (const [index, item] of items.entries()) {
    const product = products[index]!;
    const next = product.stock_quantity - item.quantity;
    await conn.query("UPDATE products SET stock_quantity = ?, updated_at = NOW() WHERE id = ?", [next, product.id]);
    await conn.query(
      `INSERT INTO stock_movements
       (id, product_id, type, quantity, previous_quantity, new_quantity, reason, reference_id, user_id)
       VALUES (?, ?, 'venta', ?, ?, ?, 'Reserva al crear el pedido', ?, ?)`,
      [randomUUID(), product.id, item.quantity, product.stock_quantity, next, orderId, userId]
    );
  }
}

export async function lockStockOrder(conn: PoolConnection, orderId: string): Promise<StockOrder | undefined> {
  const [rows] = await conn.query<StockOrder[]>(
    `SELECT id, status, total, stock_reserved_at, stock_released_at,
            (payment_expires_at <= DATE_SUB(NOW(), INTERVAL ${RESERVATION_GRACE_MINUTES} MINUTE)) AS expired
     FROM orders WHERE id = ? FOR UPDATE`, [orderId]
  );
  return rows[0];
}

// Requiere la fila del pedido bloqueada. Los pedidos anteriores a P2 no reservaron stock.
export async function restoreLockedOrderStock(conn: PoolConnection, order: StockOrder): Promise<boolean> {
  if (!order.stock_reserved_at || order.stock_released_at) return false;

  const [rows] = await conn.query<(RowDataPacket & StockItem)[]>(
    "SELECT product_id, quantity FROM order_items WHERE order_id = ? ORDER BY product_id", [order.id]
  );
  if (rows.length === 0) throw new Error("Reserva sin ítems: no se puede reponer stock");
  for (const item of consolidateStockItems(rows)) {
    const [products] = await conn.query<StockProduct[]>(
      "SELECT id, stock_quantity FROM products WHERE id = ? FOR UPDATE", [item.product_id]
    );
    const product = products[0];
    if (!product) throw new Error("Producto de una reserva no encontrado");
    const next = product.stock_quantity + item.quantity;
    await conn.query("UPDATE products SET stock_quantity = ?, updated_at = NOW() WHERE id = ?", [next, product.id]);
    await conn.query(
      `INSERT INTO stock_movements
       (id, product_id, type, quantity, previous_quantity, new_quantity, reason, reference_id, user_id)
       VALUES (?, ?, 'ajuste', ?, ?, ?, 'Reposición por pedido cancelado', ?, NULL)`,
      [randomUUID(), product.id, item.quantity, product.stock_quantity, next, order.id]
    );
  }
  await conn.query("UPDATE orders SET stock_released_at = NOW() WHERE id = ?", [order.id]);
  return true;
}

// También disponible para la futura gestión de pedidos (P4b), sin exponer una ruta nueva.
export async function cancelPendingOrder(orderId: string, onlyExpired = false): Promise<boolean> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const order = await lockStockOrder(conn, orderId);
    if (!order || order.status !== "pending" ||
        (onlyExpired && (!order.expired || !order.stock_reserved_at || order.stock_released_at))) {
      await conn.rollback();
      return false;
    }
    if (onlyExpired) {
      // Revalidar después de bloquear el pedido: un webhook pudo registrar el
      // pago mientras el barrido esperaba. La lectura bloqueante ve su commit.
      const [pendingPayments] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM payments WHERE order_id = ? AND status = 'pending' LIMIT 1 FOR UPDATE", [order.id]
      );
      if (pendingPayments.length > 0) {
        await conn.rollback();
        return false;
      }
    }
    await restoreLockedOrderStock(conn, order);
    await conn.query("UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ?", [order.id]);
    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function expirePendingOrders(): Promise<number> {
  const [orders] = await db.query<RowDataPacket[]>(
    `SELECT id FROM orders WHERE status = 'pending' AND stock_reserved_at IS NOT NULL
     AND stock_released_at IS NULL
     AND payment_expires_at <= DATE_SUB(NOW(), INTERVAL ${RESERVATION_GRACE_MINUTES} MINUTE)
     AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = orders.id AND p.status = 'pending')
     ORDER BY payment_expires_at LIMIT 100`
  );
  let cancelled = 0;
  for (const order of orders) {
    try {
      if (await cancelPendingOrder(order.id as string, true)) cancelled++;
    } catch (error) {
      console.error(`[Stock] No se pudo vencer la reserva ${order.id}:`, error);
    }
  }
  return cancelled;
}

export function startReservationExpiry(): NodeJS.Timeout {
  let running = false;
  const sweep = async () => {
    if (running) return;
    running = true;
    try {
      await expirePendingOrders();
    } catch (error) {
      console.error("[Stock] Error al vencer reservas:", error);
    } finally {
      running = false;
    }
  };
  void sweep();
  const timer = setInterval(() => { void sweep(); }, 60_000);
  timer.unref();
  return timer;
}
