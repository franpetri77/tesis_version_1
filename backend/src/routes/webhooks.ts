// =============================================
// RUTA: WEBHOOKS DE MERCADO PAGO
// Recibe las notificaciones de pago de MP y actualiza
// el estado del pedido en Directus.
// =============================================

import { Router, type Request } from "express";
import { MercadoPagoConfig, Payment } from "mercadopago";
import crypto from "crypto";

export const webhooksRouter = Router();

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN ?? "",
});

/**
 * POST /webhooks/mercadopago
 * Endpoint que Mercado Pago llama cuando cambia el estado de un pago.
 * Verifica la firma de la notificación y actualiza el pedido en Directus.
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

    // Actualizar el pedido en Directus
    await updateOrderStatus(orderId, orderStatus, {
      mp_payment_id: String(paymentId),
      mp_status: paymentStatus,
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
    approved: "paid",
    rejected: "cancelled",
    cancelled: "cancelled",
    refunded: "refunded",
    pending: "pending",
    in_process: "pending",
    authorized: "pending",
  };
  return map[mpStatus] ?? "pending";
}

/**
 * Actualiza el estado del pedido en Directus via REST API.
 */
async function updateOrderStatus(
  orderId: string,
  status: string,
  paymentData: { mp_payment_id: string; mp_status: string | null }
): Promise<void> {
  const directusUrl = process.env.DIRECTUS_URL ?? "http://localhost:8055";
  const token = process.env.DIRECTUS_SERVICE_TOKEN ?? "";

  // Actualizar estado del pedido
  await fetch(`${directusUrl}/items/orders/${orderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  // Actualizar registro de pago
  await fetch(`${directusUrl}/items/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      order_id: orderId,
      mp_payment_id: paymentData.mp_payment_id,
      status: paymentData.mp_status === "approved" ? "approved" : "rejected",
    }),
  });
}
