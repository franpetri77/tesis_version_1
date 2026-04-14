// =============================================
// RUTA: WEBHOOKS DE MERCADO PAGO
// Recibe las notificaciones de pago de MP y actualiza
// el estado del pedido directamente en MySQL.
// =============================================

import { Router, type Request } from "express";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { randomUUID } from "crypto";
import crypto from "crypto";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";

export const webhooksRouter = Router();

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN ?? "",
});

/**
 * POST /webhooks/mercadopago
 * Endpoint que Mercado Pago llama cuando cambia el estado de un pago.
 * Verifica la firma de la notificación y actualiza el pedido en MySQL.
 */
webhooksRouter.post("/mercadopago", async (req: Request, res) => {
  try {
    // Verificar la firma del webhook para evitar notificaciones falsas
    const xSignature = req.headers["x-signature"] as string;
    const xRequestId = req.headers["x-request-id"] as string;

    if (!verifyWebhookSignature(req.body as Buffer, xSignature, xRequestId)) {
      console.warn("[Webhook] Firma inválida, ignorando notificación");
      return res.status(401).json({ error: "Firma inválida" });
    }

    const body = JSON.parse((req.body as Buffer).toString()) as {
      type: string;
      data?: { id?: string };
    };

    // Solo procesar notificaciones de tipo "payment"
    if (body.type !== "payment" || !body.data?.id) {
      return res.status(200).json({ received: true });
    }

    const paymentId = body.data.id;

    // Obtener el detalle completo del pago desde la API de MP
    const paymentClient = new Payment(mpClient);
    const paymentData = await paymentClient.get({ id: paymentId });

    const orderId = paymentData.external_reference;
    const paymentStatus = paymentData.status;

    if (!orderId) {
      console.warn("[Webhook] Pago sin external_reference:", paymentId);
      return res.status(200).json({ received: true });
    }

    // Mapear el estado de MP al estado interno del pedido
    const orderStatus = mapMpStatusToOrderStatus(paymentStatus ?? "");

    // Actualizar el pedido directamente en MySQL
    await updateOrderInDb(orderId, orderStatus, {
      mp_payment_id: String(paymentId),
      mp_status: paymentStatus ?? null,
      amount: paymentData.transaction_amount ?? 0,
      raw_response: paymentData,
    });

    console.log(
      `[Webhook] Pedido ${orderId} actualizado a ${orderStatus} (MP: ${paymentStatus})`
    );

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error procesando notificación:", error);
    // Siempre responder 200 a MP para que no reintente infinitamente
    res.status(200).json({ received: true });
  }
});

// -----------------------------------------------
// Funciones auxiliares (no exportadas)
// -----------------------------------------------

/**
 * Verifica la firma HMAC SHA-256 del webhook de Mercado Pago.
 */
function verifyWebhookSignature(
  rawBody: Buffer,
  xSignature: string,
  xRequestId: string
): boolean {
  if (!process.env.MP_WEBHOOK_SECRET) return true; // Omitir en desarrollo local

  const parts = xSignature.split(",");
  const tsValue = parts.find((p) => p.startsWith("ts="))?.split("=")[1] ?? "";
  const v1Value = parts.find((p) => p.startsWith("v1="))?.split("=")[1] ?? "";

  const manifest = `id:${xRequestId};request-id:${xRequestId};ts:${tsValue};`;
  const expectedHash = crypto
    .createHmac("sha256", process.env.MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");

  return expectedHash === v1Value;
}

/**
 * Mapea el estado de Mercado Pago al estado interno de pedido.
 */
function mapMpStatusToOrderStatus(mpStatus: string): string {
  const map: Record<string, string> = {
    approved:   "paid",
    rejected:   "cancelled",
    cancelled:  "cancelled",
    refunded:   "refunded",
    pending:    "pending",
    in_process: "pending",
    authorized: "pending",
  };
  return map[mpStatus] ?? "pending";
}

/**
 * Actualiza el estado del pedido y registra el pago en MySQL.
 * Reemplaza la integración con Directus que estaba en la versión anterior.
 */
async function updateOrderInDb(
  orderId: string,
  status: string,
  paymentData: {
    mp_payment_id: string;
    mp_status: string | null;
    amount: number;
    raw_response: unknown;
  }
): Promise<void> {
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    // Actualizar estado del pedido
    await conn.query(
      "UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, orderId]
    );

    // Obtener el total del pedido para registrar en payments
    const [orderRows] = await conn.query<RowDataPacket[]>(
      "SELECT total FROM orders WHERE id = ?",
      [orderId]
    );

    if (orderRows.length > 0) {
      const paymentId = randomUUID();
      const mpPaymentStatus = paymentData.mp_status === "approved" ? "approved" : "pending";

      await conn.query(
        `INSERT INTO payments
           (id, order_id, mp_payment_id, status, amount, currency, raw_response)
         VALUES (?, ?, ?, ?, ?, 'ARS', ?)`,
        [
          paymentId,
          orderId,
          paymentData.mp_payment_id,
          mpPaymentStatus,
          paymentData.amount || (orderRows[0] as { total: number }).total,
          JSON.stringify(paymentData.raw_response),
        ]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
