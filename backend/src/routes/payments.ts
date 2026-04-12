// =============================================
// RUTA: PAGOS CON MERCADO PAGO
// Crea la preferencia de pago en MP y devuelve la URL
// de checkout al frontend para redirigir al usuario.
// =============================================

import { Router } from "express";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { z } from "zod";

export const paymentsRouter = Router();

// Inicializar el cliente de Mercado Pago con el access token
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN ?? "",
});

// Schema de validación para crear una preferencia de pago
const createPreferenceSchema = z.object({
  order_id: z.string(),
  order_number: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      quantity: z.number().int().positive(),
      unit_price: z.number().positive(),
      currency_id: z.string().default("ARS"),
    })
  ),
  payer: z.object({
    email: z.string().email(),
    name: z.string(),
    surname: z.string(),
  }),
});

/**
 * POST /payments/create-preference
 * Crea una preferencia de pago en Mercado Pago y devuelve la init_point
 * (URL de checkout de MP) para redirigir al usuario.
 */
paymentsRouter.post("/create-preference", async (req, res) => {
  try {
    const body = createPreferenceSchema.parse(req.body);

    const preferenceClient = new Preference(mpClient);

    const preference = await preferenceClient.create({
      body: {
        items: body.items,
        payer: body.payer,
        // URLs de retorno después del pago
        back_urls: {
          success: `${process.env.FRONTEND_URL}/checkout/exitoso?order=${body.order_id}`,
          failure: `${process.env.FRONTEND_URL}/checkout/fallido?order=${body.order_id}`,
          pending: `${process.env.FRONTEND_URL}/checkout/pendiente?order=${body.order_id}`,
        },
        auto_return: "approved",
        // Referencia externa para identificar el pedido en el webhook
        external_reference: body.order_id,
        // URL del webhook para recibir notificaciones de pago
        notification_url: `${process.env.BACKEND_URL ?? "http://localhost:4000"}/webhooks/mercadopago`,
        statement_descriptor: "TELE IMPORT",
        metadata: {
          order_number: body.order_number,
        },
      },
    });

    res.json({
      preference_id: preference.id,
      init_point: preference.init_point,        // URL para producción
      sandbox_init_point: preference.sandbox_init_point, // URL para sandbox
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Datos inválidos", details: error.errors });
    }
    console.error("[Payments] Error al crear preferencia:", error);
    res.status(500).json({ error: "Error al crear la preferencia de pago" });
  }
});
