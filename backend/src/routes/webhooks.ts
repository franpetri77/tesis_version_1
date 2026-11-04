// =============================================
// RUTA: WEBHOOKS DE MERCADO PAGO
// Recibe las notificaciones de pago de MP y actualiza
// el estado del pedido directamente en MySQL.
// =============================================

import { Router, type Request } from "express";
import { MercadoPagoConfig, Payment } from "mercadopago";
import crypto from "crypto";
import { recordOrderPayment } from "../services/orderPayments";

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

    // Actualizar el pedido directamente en MySQL
    await recordOrderPayment(orderId, {
      mp_payment_id: String(paymentId),
      mp_status: paymentStatus ?? null,
      amount: paymentData.transaction_amount ?? 0,
      raw_response: paymentData,
    });

    console.log(
      `[Webhook] Pago de pedido ${orderId} procesado (MP: ${paymentStatus})`
    );

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error procesando notificación:", error);
    // Una transacción fallida debe reintentarse; no confirmar una reposición perdida.
    res.status(500).json({ error: "No se pudo procesar la notificación" });
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
