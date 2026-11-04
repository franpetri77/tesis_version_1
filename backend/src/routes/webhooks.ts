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
    const rawBody = req.body as Buffer;
    let body: { type?: string; data?: { id?: string | number } };
    try {
      body = JSON.parse(rawBody.toString()) as typeof body;
    } catch {
      return res.status(400).json({ error: "Cuerpo inválido" });
    }

    // MP firma el data.id que viaja en la URL de la notificación (?data.id=…).
    const queryId = readQueryDataId(req.query);
    const bodyId = body.data?.id !== undefined ? String(body.data.id) : undefined;
    if (queryId && bodyId && queryId.toLowerCase() !== bodyId.toLowerCase()) {
      console.warn("[Webhook] data.id de la URL y del cuerpo no coinciden, ignorando notificación");
      return res.status(401).json({ error: "Firma inválida" });
    }

    // Solo se procesan notificaciones de tipo "payment". Las demás (merchant_order,
    // formato IPN) se confirman sin efecto para que MP no las reintente.
    const paymentId = queryId ?? bodyId;
    if (body.type !== "payment" || !paymentId) {
      return res.status(200).json({ received: true });
    }

    // Verificar la firma del webhook para evitar notificaciones falsas
    const signature = verifyWebhookSignature({
      dataId: queryId,
      xSignature: headerValue(req.headers["x-signature"]),
      xRequestId: headerValue(req.headers["x-request-id"]),
    });
    // Con firma activa, el id a consultar tiene que ser el firmado (el de la URL).
    const rejection = signature === "valid" && !queryId ? "missing-signed-id" : signature;
    if (rejection !== "valid" && rejection !== "skipped") {
      console.warn(`[Webhook] Notificación rechazada: ${rejection}`);
      return res.status(401).json({ error: "Firma inválida" });
    }

    // Obtener el detalle completo del pago desde la API de MP: el estado y el
    // importe nunca se toman del cuerpo de la notificación.
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
      amount: paymentData.transaction_amount ?? null,
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

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Express deja "data.id" como clave literal; se acepta también la forma anidada.
function readQueryDataId(query: Request["query"]): string | undefined {
  const flat = query["data.id"];
  const nested = (query.data as { id?: unknown } | undefined)?.id;
  const value = typeof flat === "string" ? flat : typeof nested === "string" ? nested : undefined;
  return value && value.length > 0 ? value : undefined;
}

export type SignatureCheck = "valid" | "skipped" | "missing-secret" | "missing-header" | "malformed" | "mismatch";

/**
 * Verifica la firma HMAC SHA-256 del webhook de Mercado Pago.
 *
 * Plantilla oficial ("Validar origen de la notificación"):
 *   id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
 * - data.id es el de la URL de la notificación; si es alfanumérico va en minúsculas.
 * - Si un valor no está presente, su par se omite de la plantilla.
 *
 * Sin MP_WEBHOOK_SECRET sólo se omite la verificación fuera de producción.
 */
export function verifyWebhookSignature(params: {
  dataId?: string;
  xSignature?: string;
  xRequestId?: string;
  secret?: string;
  production?: boolean;
}): SignatureCheck {
  const secret = params.secret ?? process.env.MP_WEBHOOK_SECRET;
  const production = params.production ?? process.env.NODE_ENV === "production";
  if (!secret) return production ? "missing-secret" : "skipped";
  if (!params.xSignature) return "missing-header";

  let ts = "";
  let v1 = "";
  for (const part of params.xSignature.split(",")) {
    const [key, ...rest] = part.split("=");
    const value = rest.join("=").trim();
    if (key?.trim() === "ts") ts = value;
    if (key?.trim() === "v1") v1 = value;
  }
  if (!ts || !/^[0-9a-f]{64}$/i.test(v1)) return "malformed";

  const manifest = buildSignatureManifest(params.dataId, params.xRequestId, ts);
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest();
  const received = Buffer.from(v1, "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected)
    ? "valid"
    : "mismatch";
}

export function buildSignatureManifest(dataId: string | undefined, requestId: string | undefined, ts: string): string {
  let manifest = "";
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return manifest;
}
