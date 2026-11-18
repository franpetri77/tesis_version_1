import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";
import { lockStockOrder, releaseOrderPromotion, restoreLockedOrderStock } from "./orderStock";
import { dispatch, notifyOrderPaid, notifyOrderStatus } from "./notifications";

interface OrderPayment {
  mp_payment_id: string;
  mp_status: string | null;
  // Importe informado por MP (transaction_amount). null = ausente o inválido.
  amount: number | null;
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
    // Se guarda el importe tal como lo informó MP, incluido 0; si falta o no es
    // un número finito queda NULL. Nunca se completa con orders.total.
    const receivedAmount = typeof payment.amount === "number" && Number.isFinite(payment.amount)
      ? payment.amount : null;
    // Sólo un cobro positivo por exactamente orders.total confirma el pedido.
    const amountMatches = receivedAmount !== null && receivedAmount > 0 &&
      Math.round(receivedAmount * 100) === Math.round(Number(order.total) * 100);
    const values = [incoming, receivedAmount, JSON.stringify(payment.raw_response)];
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
    // Un aprobado con importe distinto (o sin importe) queda registrado como
    // approved en payments, pero el pedido sigue pending: no es una venta para
    // los reportes. Ese cobro retiene la reserva (ver las consultas de pagos
    // "abiertos" abajo y en orderStock) hasta que se concilie.
    if (incoming === "approved" && order.status === "pending" && amountMatches) nextStatus = "paid";
    if ((incoming === "rejected" || incoming === "cancelled") && order.status === "pending" && order.expired) {
      // Un intento fallido no termina el checkout: conservar la reserva durante
      // el plazo de pago y su margen. Después, tampoco cerrar otro pago en revisión.
      const [pendingPayments] = await conn.query<RowDataPacket[]>(
        `SELECT id FROM payments WHERE order_id = ? AND status IN ('pending', 'approved') LIMIT 1 FOR UPDATE`, [orderId]
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
    // El cupón se devuelve sólo al cancelar; un reembolso no lo reutiliza.
    if (nextStatus === "cancelled") {
      await releaseOrderPromotion(conn, order);
    }
    if (nextStatus !== order.status) {
      await conn.query("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?", [nextStatus, orderId]);
    }
    await conn.commit();

    // T5: avisos después de confirmar; un fallo no revierte el pago.
    if (nextStatus === "paid" && order.status === "pending") {
      dispatch(`pedido pagado ${orderId}`, () => notifyOrderPaid(orderId));
    } else if (nextStatus !== order.status && (nextStatus === "cancelled" || nextStatus === "refunded")) {
      dispatch(`pedido ${nextStatus} ${orderId}`, () => notifyOrderStatus(orderId, nextStatus));
    }

    // Un cobro que llega después de liberar la reserva necesita conciliación;
    // nunca reabrir automáticamente un pedido cuyo stock ya quedó disponible.
    // P3b: MP debe cobrar exactamente orders.total. El pedido ya quedó sin
    // confirmar (arriba); el log identifica el cobro a conciliar.
    if (incoming === "approved" && !amountMatches) {
      console.error(`[Payments] Conciliación requerida: pago ${payment.mp_payment_id} por ${receivedAmount ?? "importe ausente"} y pedido ${orderId} por ${order.total}; el pedido no se confirmó`);
    }
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
