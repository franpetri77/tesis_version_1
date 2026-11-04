import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";
import { lockStockOrder, restoreLockedOrderStock } from "./orderStock";

interface OrderPayment {
  mp_payment_id: string;
  mp_status: string | null;
  amount: number;
  raw_response: unknown;
}

// Fila de pedido, pago y reposición se confirman juntos. El bloqueo del pedido
// serializa avisos repetidos y la carrera entre webhook y vencimiento.
export async function recordOrderPayment(orderId: string, payment: OrderPayment): Promise<void> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const order = await lockStockOrder(conn, orderId);
    if (!order) {
      await conn.rollback();
      return;
    }
    const [previous] = await conn.query<RowDataPacket[]>(
      "SELECT id, status FROM payments WHERE order_id = ? AND mp_payment_id = ? LIMIT 1",
      [orderId, payment.mp_payment_id]
    );
    const statusMap: Record<string, string> = {
      approved: "approved", rejected: "rejected", cancelled: "cancelled", refunded: "refunded",
      pending: "pending", in_process: "pending", authorized: "pending",
    };
    const incoming = statusMap[payment.mp_status ?? ""];
    if (!incoming) {
      await conn.rollback();
      return;
    }
    const oldStatus = previous[0]?.status as string | undefined;
    // Una lectura demorada de MP no deshace un pago o un reembolso registrado.
    if (oldStatus === "refunded" || (oldStatus === "approved" && incoming !== "refunded")) {
      await conn.rollback();
      return;
    }
    const values = [incoming, payment.amount || order.total, JSON.stringify(payment.raw_response)];
    if (previous[0]) {
      await conn.query("UPDATE payments SET status = ?, amount = ?, raw_response = ? WHERE id = ?",
        [...values, previous[0].id]);
    } else {
      await conn.query(
        `INSERT INTO payments (id, order_id, mp_payment_id, status, amount, currency, raw_response)
         VALUES (?, ?, ?, ?, ?, 'ARS', ?)`,
        [randomUUID(), orderId, payment.mp_payment_id, ...values]
      );
    }

    let nextStatus = order.status;
    if (incoming === "approved" && order.status === "pending") nextStatus = "paid";
    if ((incoming === "rejected" || incoming === "cancelled") && order.status === "pending" && order.expired) {
      // Un intento fallido no termina el checkout: conservar la reserva durante
      // el plazo de pago y su margen. Después, tampoco cerrar otro pago en revisión.
      const [pendingPayments] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM payments WHERE order_id = ? AND status = 'pending' LIMIT 1 FOR UPDATE", [orderId]
      );
      if (pendingPayments.length === 0) nextStatus = "cancelled";
    }
    if (incoming === "refunded") {
      const [otherApproved] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM payments WHERE order_id = ? AND mp_payment_id <> ? AND status = 'approved' LIMIT 1",
        [orderId, payment.mp_payment_id]
      );
      // Reembolsar otro intento no cancela una compra que sigue pagada.
      if (otherApproved.length === 0) nextStatus = "refunded";
    }
    if (nextStatus === "cancelled" || nextStatus === "refunded") {
      await restoreLockedOrderStock(conn, order);
    }
    if (nextStatus !== order.status) {
      await conn.query("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?", [nextStatus, orderId]);
    }
    await conn.commit();

    // Un cobro que llega después de liberar la reserva necesita conciliación;
    // nunca reabrir automáticamente un pedido cuyo stock ya quedó disponible.
    if (incoming === "approved" && (order.status === "cancelled" || order.status === "refunded")) {
      console.error(`[Payments] Conciliación requerida: pago ${payment.mp_payment_id} aprobado para pedido ${orderId} ${order.status}`);
    }
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
