// =============================================
// SERVICIO: GESTIÓN DE ESTADOS DEL PEDIDO (T3)
// El administrador avanza el pedido por su circuito logístico con
// transiciones validadas. La cancelación administrativa sólo aplica
// a pedidos sin pagar: repone la reserva de stock y devuelve el cupón
// con los mismos servicios idempotentes del checkout.
// =============================================

import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import db from "../db/database";
import { lockStockOrder, releaseOrderPromotion, restoreLockedOrderStock } from "./orderStock";

export type OrderStatus =
  | "pending" | "paid" | "processing" | "ready_to_ship" | "shipped" | "delivered" | "cancelled" | "refunded";
export type DeliveryMethod = "pickup" | "shipping";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente de pago",
  paid: "Pagado",
  processing: "En preparación",
  ready_to_ship: "Listo para enviar o retirar",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

// Transiciones que puede hacer el administrador. pending → paid y
// cualquier estado → refunded los decide Mercado Pago por webhook.
export function allowedTransitions(status: string, delivery: string): OrderStatus[] {
  switch (status) {
    case "pending": return ["cancelled"];
    case "paid": return ["processing"];
    case "processing": return ["ready_to_ship"];
    case "ready_to_ship": return delivery === "pickup" ? ["delivered"] : ["shipped"];
    case "shipped": return ["delivered"];
    default: return [];
  }
}

export class OrderStatusError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

interface LockedOrder extends RowDataPacket {
  id: string;
  status: OrderStatus;
  delivery_method: DeliveryMethod;
}

async function audit(conn: PoolConnection, orderId: string, actorId: string, ip: string | null,
  previous: OrderStatus, next: OrderStatus, note: string | null): Promise<void> {
  await conn.query(
    `INSERT INTO audit_logs (id, action, entity_type, entity_id, user_id, previous_value, new_value, ip_address, created_at)
     VALUES (?, 'order_status', 'order', ?, ?, ?, ?, ?, NOW())`,
    [randomUUID(), orderId, actorId, JSON.stringify({ status: previous }), JSON.stringify({ status: next, note }), ip]
  );
}

export async function changeOrderStatus(params: {
  orderId: string;
  next: string;
  actorId: string;
  note?: string | null;
  ip?: string | null;
}): Promise<{ id: string; previous: OrderStatus; status: OrderStatus }> {
  const note = params.note?.trim() ? params.note.trim().slice(0, 500) : null;
  if (!(params.next in ORDER_STATUS_LABELS)) throw new OrderStatusError(400, "Estado de destino inválido");
  const next = params.next as OrderStatus;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<LockedOrder[]>(
      "SELECT id, status, delivery_method FROM orders WHERE id = ? FOR UPDATE", [params.orderId]
    );
    const order = rows[0];
    if (!order) throw new OrderStatusError(404, "Pedido no encontrado");

    if (!allowedTransitions(order.status, order.delivery_method).includes(next)) {
      const hint = next === "cancelled" && order.status !== "pending"
        ? " Un pedido pagado se cancela reembolsándolo desde Mercado Pago; el sistema registra el reembolso y repone el stock."
        : "";
      throw new OrderStatusError(409,
        `No se puede pasar de "${ORDER_STATUS_LABELS[order.status]}" a "${ORDER_STATUS_LABELS[next]}".${hint}`);
    }

    if (next === "cancelled") {
      // Un intento de pago abierto o un cobro a conciliar todavía puede
      // confirmar el pedido: no se cancela por encima de Mercado Pago.
      const [open] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM payments WHERE order_id = ? AND status IN ('pending', 'approved') LIMIT 1 FOR UPDATE",
        [order.id]
      );
      if (open.length > 0) {
        throw new OrderStatusError(409, "El pedido tiene un pago en proceso o a conciliar en Mercado Pago; no se puede cancelar todavía.");
      }
      const stockOrder = await lockStockOrder(conn, order.id);
      if (stockOrder) {
        await restoreLockedOrderStock(conn, stockOrder);
        await releaseOrderPromotion(conn, stockOrder);
      }
    }

    await conn.query("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?", [next, order.id]);
    await audit(conn, order.id, params.actorId, params.ip ?? null, order.status, next, note);
    await conn.commit();
    return { id: order.id, previous: order.status, status: next };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
