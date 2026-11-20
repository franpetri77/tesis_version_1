// =============================================
// SERVICIO: NOTIFICACIONES (T5)
// Genera las notificaciones de la campana (tabla notifications) y el
// email al encargado. Se llama DESPUÉS de confirmar cada operación:
// un fallo acá se registra en el log y nunca revierte un pedido, un pago
// ni un cambio de producto.
// =============================================

import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import db from "../db/database";
import { sendChatEmail, sendNewOrderEmail } from "./mailer";
import { withTransaction } from "./audit";

type NotificationType = "order_new" | "order_status" | "stock_low" | "review_new" | "product_new" | "price_drop" | "offer" | "chat_message";
const LOW_STOCK_THRESHOLD = 5;
const MAX_AUDIENCE = 500;

const ARS = (n: number) => `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Ejecuta un envío de notificaciones sin afectar a quien lo dispara. */
export function dispatch(label: string, job: () => Promise<unknown>): void {
  void job().catch((error) => console.error(`[Notificaciones] ${label}:`, error));
}

async function insertMany(
  rows: Array<{ userId: string; type: NotificationType; title: string; message: string; link: string | null }>,
  exec: Pick<PoolConnection, "query"> = db,
): Promise<number> {
  if (rows.length === 0) return 0;
  const values = rows.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
  await exec.query(
    `INSERT INTO notifications (id, user_id, type, title, message, link) VALUES ${values}`,
    rows.flatMap((r) => [randomUUID(), r.userId, r.type, r.title.slice(0, 255), r.message, r.link])
  );
  return rows.length;
}

async function adminIds(): Promise<string[]> {
  const [rows] = await db.query<RowDataPacket[]>("SELECT id FROM users WHERE role = 'admin'");
  return rows.map((r) => String(r.id));
}

interface OrderInfo extends RowDataPacket {
  id: string; order_number: string; user_id: string; total: number; delivery_method: string;
  first_name: string; last_name: string; email: string; phone: string | null; shipping_address: string | null;
}
async function orderInfo(orderId: string): Promise<OrderInfo | undefined> {
  const [rows] = await db.query<OrderInfo[]>(
    `SELECT o.id, o.order_number, o.user_id, o.total, o.delivery_method, o.shipping_address,
            u.first_name, u.last_name, u.email, u.phone
     FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`, [orderId]
  );
  return rows[0];
}

const STATUS_MESSAGE: Record<string, (pickup: boolean) => string> = {
  paid: () => "Recibimos tu pago. Vamos a preparar tu pedido.",
  processing: () => "Estamos preparando tu pedido.",
  ready_to_ship: (pickup) => pickup ? "Tu pedido está listo para retirar en el local." : "Tu pedido está listo para ser enviado.",
  shipped: () => "Tu pedido fue enviado.",
  delivered: () => "Tu pedido fue entregado. ¡Gracias por tu compra!",
  cancelled: () => "Tu pedido fue cancelado.",
  refunded: () => "Se registró el reembolso de tu pedido.",
};

/** Aviso al cliente por cada cambio de estado de su pedido. */
export async function notifyOrderStatus(orderId: string, status: string): Promise<void> {
  const order = await orderInfo(orderId);
  const message = STATUS_MESSAGE[status];
  if (!order || !message) return;
  await insertMany([{
    userId: order.user_id, type: "order_status",
    title: `Pedido ${order.order_number}`,
    message: message(order.delivery_method === "pickup"),
    link: `/perfil/pedidos/${order.id}`,
  }]);
}

/** Avisos de stock bajo a los administradores (uno por producto por día). */
export async function notifyLowStock(productIds: string[]): Promise<number> {
  if (productIds.length === 0) return 0;
  const [products] = await db.query<RowDataPacket[]>(
    `SELECT id, name, stock_quantity FROM products
     WHERE id IN (${productIds.map(() => "?").join(",")}) AND stock_quantity <= ?`,
    [...productIds, LOW_STOCK_THRESHOLD]
  );
  if (products.length === 0) return 0;
  const admins = await adminIds();
  let total = 0;
  for (const p of products) {
    const link = `/admin/stock?producto=${p.id}`;
    const msg = Number(p.stock_quantity) <= 0 ? "Sin stock disponible." : `Quedan ${p.stock_quantity} unidades.`;
    // Control e inserción atómicos: la fila del producto queda bloqueada
    // mientras se consulta el aviso del día y se inserta, así dos llamadas
    // simultáneas no generan dos avisos para el mismo producto.
    total += await withTransaction(async (conn) => {
      await conn.query("SELECT id FROM products WHERE id = ? FOR UPDATE", [p.id]);
      const [recent] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM notifications WHERE type = 'stock_low' AND link = ? AND created_at >= NOW() - INTERVAL 1 DAY LIMIT 1", [link]
      );
      if (recent.length) return 0;
      return insertMany(admins.map((userId) => ({ userId, type: "stock_low" as const, title: `Stock bajo: ${p.name}`, message: msg, link })), conn);
    });
  }
  return total;
}

/**
 * Pedido pagado: aviso al cliente, a los administradores, email al
 * encargado y control de stock bajo de los productos vendidos.
 */
export async function notifyOrderPaid(orderId: string): Promise<void> {
  const order = await orderInfo(orderId);
  if (!order) return;
  const [items] = await db.query<RowDataPacket[]>(
    `SELECT oi.product_id, oi.quantity, oi.unit_price, oi.total_price, p.name, p.sku
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`, [orderId]
  );
  await notifyOrderStatus(orderId, "paid");
  const admins = await adminIds();
  const customer = `${order.first_name} ${order.last_name}`.trim();
  await insertMany(admins.map((userId) => ({
    userId, type: "order_new" as const,
    title: `Nuevo pedido: ${order.order_number}`,
    message: `${customer} · ${ARS(order.total)} · ${order.delivery_method === "pickup" ? "retiro en el local" : "envío a domicilio"}`,
    link: `/admin/pedidos/${order.id}`,
  })));
  let address: Record<string, string> | null = null;
  try { address = order.shipping_address ? JSON.parse(order.shipping_address) : null; } catch { address = null; }
  await sendNewOrderEmail({
    orderId: order.id, orderNumber: order.order_number, total: Number(order.total),
    deliveryMethod: order.delivery_method, customer, email: order.email, phone: order.phone, address,
    items: items.map((i) => ({ name: String(i.name ?? "Producto"), sku: i.sku ? String(i.sku) : null, quantity: Number(i.quantity), total: Number(i.total_price) })),
  });
  await notifyLowStock(items.map((i) => String(i.product_id)));
}

/** Clientes con interés en una categoría: compras del último año o visitas de los últimos 90 días. */
async function audienceForCategory(categoryId: string): Promise<string[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT u.id FROM users u
     WHERE u.role = 'customer' AND (
       EXISTS (SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id
               WHERE o.user_id = u.id AND p.category_id = ?
                 AND o.status IN ('paid','processing','ready_to_ship','shipped','delivered')
                 AND o.created_at >= NOW() - INTERVAL 365 DAY)
       OR EXISTS (SELECT 1 FROM product_views v JOIN products p ON p.id = v.product_id
                  WHERE v.user_id = u.id AND p.category_id = ? AND v.created_at >= NOW() - INTERVAL 90 DAY))
     LIMIT ${MAX_AUDIENCE}`,
    [categoryId, categoryId]
  );
  return rows.map((r) => String(r.id));
}

/** Producto nuevo y activo: aviso personalizado a quienes compraron o miraron esa categoría. */
export async function notifyNewProduct(productId: string): Promise<number> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT p.id, p.name, p.slug, p.price, p.category_id, c.name AS category_name
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.id = ? AND p.is_active = 1 AND c.is_active = 1`, [productId]
  );
  const p = rows[0];
  if (!p) return 0;
  const audience = await audienceForCategory(String(p.category_id));
  return insertMany(audience.map((userId) => ({
    userId, type: "product_new" as const,
    title: `Nuevo en ${p.category_name}`,
    message: `${p.name} · ${ARS(p.price)}`,
    link: `/producto/${p.slug}`,
  })));
}

/** Baja de precio: aviso a quienes miraron ese producto en los últimos 90 días. */
export async function notifyPriceDrop(productId: string, previousPrice: number, newPrice: number): Promise<number> {
  if (!(newPrice < previousPrice)) return 0;
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT id, name, slug FROM products WHERE id = ? AND is_active = 1", [productId]
  );
  const p = rows[0];
  if (!p) return 0;
  const [viewers] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT v.user_id FROM product_views v JOIN users u ON u.id = v.user_id
     WHERE v.product_id = ? AND u.role = 'customer' AND v.created_at >= NOW() - INTERVAL 90 DAY
     LIMIT ${MAX_AUDIENCE}`, [productId]
  );
  return insertMany(viewers.map((v) => ({
    userId: String(v.user_id), type: "price_drop" as const,
    title: `Bajó el precio de ${p.name}`,
    message: `Antes ${ARS(previousPrice)}, ahora ${ARS(newPrice)}.`,
    link: `/producto/${p.slug}`,
  })));
}

/** Reseña nueva pendiente de moderación: aviso a los administradores. */
export async function notifyNewReview(productName: string): Promise<number> {
  const admins = await adminIds();
  return insertMany(admins.map((userId) => ({
    userId, type: "review_new" as const,
    title: "Reseña pendiente de moderación",
    message: `Nueva reseña en ${productName}.`,
    link: "/admin/resenas",
  })));
}

// -----------------------------------------------
// T9: mensajería. Se llama sólo con el primer mensaje no leído de cada
// tanda (lo decide services/chat.ts), así no se repite un aviso por mensaje.
// -----------------------------------------------
const preview = (body: string) => (body.length > 120 ? `${body.slice(0, 117).trimEnd()}...` : body);

/** Mensaje de un cliente: campana de cada administrador y correo al encargado. */
export async function notifyChatToStaff(conversationId: string, customerId: string, body: string): Promise<number> {
  const [rows] = await db.query<RowDataPacket[]>("SELECT first_name, last_name, email FROM users WHERE id = ?", [customerId]);
  const u = rows[0];
  const name = u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || String(u.email) : "Un cliente";
  const link = `/admin/mensajes?c=${encodeURIComponent(conversationId)}`;
  const admins = await adminIds();
  const total = await insertMany(admins.map((userId) => ({
    userId, type: "chat_message" as const, title: `Mensaje de ${name}`, message: preview(body), link,
  })));
  const to = process.env.MANAGER_EMAIL;
  if (to) await sendChatEmail({ to, kind: "staff", name, body, path: link });
  else console.warn("[Mailer] MANAGER_EMAIL no configurado: no se avisó al encargado del mensaje nuevo.");
  return total;
}

/** Respuesta del personal: campana y correo al cliente. */
export async function notifyChatToCustomer(customerId: string, staffName: string | null, body: string): Promise<number> {
  const [rows] = await db.query<RowDataPacket[]>("SELECT first_name, email FROM users WHERE id = ? AND role = 'customer'", [customerId]);
  const u = rows[0];
  if (!u) return 0;
  const total = await insertMany([{
    userId: customerId, type: "chat_message", title: "Te respondimos", message: preview(body), link: "/perfil/mensajes",
  }]);
  await sendChatEmail({ to: String(u.email), kind: "customer", name: u.first_name ? String(u.first_name) : "", staffName, body, path: "/perfil/mensajes" });
  return total;
}
