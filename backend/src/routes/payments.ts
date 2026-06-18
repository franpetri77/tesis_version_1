// =============================================
// RUTA: PAGOS CON MERCADO PAGO
// POST /payments/validate-coupon  — valida un cupón de descuento
// POST /payments/create-order     — crea el pedido en DB y la preferencia en MP
// POST /payments/create-preference — uso interno / legado (sin creación de pedido)
// =============================================

import { Router, type Request, type Response, type NextFunction } from "express";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { randomUUID } from "crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";
import { requireAuth } from "./auth";
import { sendOrderNotificationToManager } from "../services/email";

export const paymentsRouter = Router();

// -----------------------------------------------
// Tipos internos
// -----------------------------------------------
interface AuthRequest extends Request {
  user: { userId: string; role: string };
}

interface DbUser extends RowDataPacket {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface DbProduct extends RowDataPacket {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  is_active: number;
}

interface DbPromotion extends RowDataPacket {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  current_uses: number;
  is_active: number;
  valid_from: string;
  valid_until: string | null;
}

// requireAuth no extiende Express.RequestHandler exactamente; se castea igual
// que en admin.ts y reports.ts para evitar errores de tipo.
const castAuth = requireAuth as unknown as (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

// -----------------------------------------------
// Cliente de Mercado Pago (compartido entre endpoints)
// -----------------------------------------------
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN ?? "",
});

// -----------------------------------------------
// Helper: genera número de pedido legible y único
// Formato: TI-AAAAMMDD-XXXXXX (6 hex en mayúsculas)
// -----------------------------------------------
function generateOrderNumber(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const suffix = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `TI-${date}-${suffix}`;
}

// -----------------------------------------------
// Helper: crea la preferencia de pago en MP
// Centraliza la llamada para que create-order y
// create-preference (legado) la reutilicen.
// -----------------------------------------------
async function buildMpPreference(params: {
  orderId: string;
  orderNumber: string;
  items: Array<{ id: string; title: string; quantity: number; unit_price: number }>;
  payer: { email: string; name: string; surname: string };
}): Promise<{
  preference_id: string | null;
  init_point: string | null;
  sandbox_init_point: string | null;
}> {
  const preferenceClient = new Preference(mpClient);

  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const backendUrl  = process.env.BACKEND_URL  ?? "http://localhost:4000";

  // Mercado Pago RECHAZA la preferencia cuando se usa `auto_return` con
  // `back_urls` localhost, o cuando `notification_url` es localhost, porque
  // exige URLs públicamente alcanzables. En entorno local los omitimos para
  // poder generar la preferencia y probar la compra de punta a punta; en
  // producción (URLs https públicas) se incluyen normalmente.
  const isLocal = (u: string) => /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(u);

  const pref = await preferenceClient.create({
    body: {
      items: params.items.map((i) => ({ ...i, currency_id: "ARS" })),
      payer: params.payer,
      back_urls: {
        success: `${frontendUrl}/checkout/exitoso?order=${params.orderId}`,
        failure: `${frontendUrl}/checkout/fallido?order=${params.orderId}`,
        pending: `${frontendUrl}/checkout/pendiente?order=${params.orderId}`,
      },
      external_reference: params.orderId,
      statement_descriptor: "TELE IMPORT",
      metadata: { order_number: params.orderNumber },
      // Solo con URLs públicas (no localhost):
      ...(isLocal(frontendUrl) ? {} : { auto_return: "approved" as const }),
      ...(isLocal(backendUrl) ? {} : { notification_url: `${backendUrl}/webhooks/mercadopago` }),
    },
  });
  return {
    preference_id: pref.id ?? null,
    init_point: pref.init_point ?? null,
    sandbox_init_point: pref.sandbox_init_point ?? null,
  };
}

// =============================================
// SECCIÓN: VALIDACIÓN DE CUPONES
// =============================================

const validateCouponSchema = z.object({
  code:     z.string().min(1),
  subtotal: z.number().nonnegative(),
});

// -----------------------------------------------
// POST /payments/validate-coupon
// Valida un cupón contra la tabla promotions.
// No requiere autenticación.
// No incrementa current_uses (solo valida).
// -----------------------------------------------
paymentsRouter.post("/validate-coupon", async (req, res) => {
  try {
    const { code, subtotal } = validateCouponSchema.parse(req.body);
    const today = new Date().toISOString().split("T")[0]!; // YYYY-MM-DD

    const [rows] = await db.query<DbPromotion[]>(
      "SELECT * FROM promotions WHERE code = ? AND is_active = 1 LIMIT 1",
      [code.toUpperCase()]
    );
    const promo = rows[0];

    if (!promo) {
      return res.json({ valid: false, error: "Código inválido o inactivo" });
    }
    if (promo.valid_from > today) {
      return res.json({ valid: false, error: "El cupón aún no está vigente" });
    }
    if (promo.valid_until && promo.valid_until < today) {
      return res.json({ valid: false, error: "El cupón venció" });
    }
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return res.json({ valid: false, error: "El cupón alcanzó el límite de usos" });
    }
    if (promo.min_order_amount !== null && subtotal < promo.min_order_amount) {
      return res.json({
        valid: false,
        error: `El pedido mínimo para este cupón es $${promo.min_order_amount.toLocaleString("es-AR")}`,
      });
    }

    // Calcular el descuento monetario según el tipo de promoción
    let discount_amount = 0;
    if (promo.type === "percentage") {
      discount_amount = Math.round(subtotal * promo.value) / 100;
    } else if (promo.type === "fixed_amount") {
      discount_amount = Math.min(promo.value, subtotal);
    }
    // free_shipping: descuento = 0 en el subtotal (el envío se vuelve gratis en el total)

    return res.json({
      valid: true,
      discount_amount,
      promotion: {
        code:  promo.code,
        name:  promo.name,
        type:  promo.type,
        value: promo.value,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ valid: false, error: "Datos inválidos" });
    }
    console.error("[Payments] Error validando cupón:", error);
    return res.status(500).json({ valid: false, error: "Error interno al validar el cupón" });
  }
});

// =============================================
// SECCIÓN: CREACIÓN DE PEDIDO + PREFERENCIA MP
// =============================================

// Schema del body del checkout enviado desde el frontend
const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string(),
        // z.coerce tolera numéricos que llegan como string (precios DECIMAL de
        // MySQL o carritos viejos persistidos en localStorage del cliente).
        quantity:   z.coerce.number().int().positive(),
        unit_price: z.coerce.number().positive(),
        product: z.object({
          name: z.string(),
          sku:  z.string(),
        }),
      })
    )
    .min(1, "El carrito no puede estar vacío"),
  delivery_method: z.enum(["pickup", "shipping"]),
  shipping_address: z
    .object({
      street:      z.string(),
      number:      z.string(),
      floor:       z.string().optional().default(""),
      apartment:   z.string().optional().default(""),
      city:        z.string(),
      province:    z.string(),
      postal_code: z.string(),
      country:     z.string().default("Argentina"),
    })
    .nullable(),
  coupon_code:     z.string().optional(),
  subtotal:        z.coerce.number().nonnegative(),
  discount_amount: z.coerce.number().nonnegative(),
  shipping_cost:   z.coerce.number().nonnegative(),
  total:           z.coerce.number().positive(),
  notes:           z.string().optional(),
});

// -----------------------------------------------
// POST /payments/create-order
// Requiere autenticación (Bearer token).
// Flujo:
//   1. Valida body con Zod
//   2. Verifica productos y stock en DB
//   3. Recalcula totales server-side (no confía en el cliente)
//   4. Valida el cupón si viene
//   5. Crea order + order_items en transacción con FOR UPDATE
//   6. Incrementa current_uses del cupón si aplica
//   7. Crea la preferencia de pago en MP
//   8. Devuelve order_id, order_number, init_point, sandbox_init_point
// -----------------------------------------------
paymentsRouter.post("/create-order", castAuth, async (req, res) => {
  const authReq = req as AuthRequest;

  try {
    const body = createOrderSchema.parse(req.body);

    // Validar: envío requiere dirección
    if (body.delivery_method === "shipping" && !body.shipping_address) {
      return res.status(400).json({ error: "Se requiere dirección de envío para el método 'shipping'" });
    }

    // ── 1. Obtener datos del usuario autenticado ──────────────────────────
    const [userRows] = await db.query<DbUser[]>(
      "SELECT id, email, first_name, last_name FROM users WHERE id = ? LIMIT 1",
      [authReq.user.userId]
    );
    const user = userRows[0];
    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    // ── 2. Verificar productos y calcular subtotal server-side ────────────
    const productIds   = body.items.map((i) => i.product_id);
    const placeholders = productIds.map(() => "?").join(",");

    const [productRows] = await db.query<DbProduct[]>(
      `SELECT id, name, price, stock_quantity, is_active
       FROM products
       WHERE id IN (${placeholders})`,
      productIds
    );
    const productMap = new Map(productRows.map((p) => [p.id, p]));

    let serverSubtotal = 0;
    for (const item of body.items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return res.status(400).json({ error: `Producto no encontrado: ${item.product_id}` });
      }
      if (!product.is_active) {
        return res.status(400).json({ error: `El producto "${product.name}" ya no está disponible` });
      }
      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({
          error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock_quantity}, solicitado: ${item.quantity}`,
        });
      }
      serverSubtotal += product.price * item.quantity;
    }
    serverSubtotal = Math.round(serverSubtotal * 100) / 100;

    // ── 3. Validar cupón si viene ─────────────────────────────────────────
    let serverDiscountAmount = 0;
    let promotionId: string | null = null;
    let isFreeShipping = false;

    if (body.coupon_code) {
      const today = new Date().toISOString().split("T")[0]!;
      const [promoRows] = await db.query<DbPromotion[]>(
        "SELECT * FROM promotions WHERE code = ? AND is_active = 1 LIMIT 1",
        [body.coupon_code.toUpperCase()]
      );
      const promo = promoRows[0];

      if (!promo || promo.valid_from > today) {
        return res.status(400).json({ error: "Cupón inválido o aún no vigente" });
      }
      if (promo.valid_until && promo.valid_until < today) {
        return res.status(400).json({ error: "El cupón ya venció" });
      }
      if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
        return res.status(400).json({ error: "El cupón alcanzó el límite de usos" });
      }
      if (promo.min_order_amount !== null && serverSubtotal < promo.min_order_amount) {
        return res.status(400).json({ error: "El subtotal no alcanza el mínimo requerido por el cupón" });
      }

      if (promo.type === "percentage") {
        serverDiscountAmount = Math.round(serverSubtotal * promo.value) / 100;
      } else if (promo.type === "fixed_amount") {
        serverDiscountAmount = Math.min(promo.value, serverSubtotal);
      } else if (promo.type === "free_shipping") {
        isFreeShipping = true;
      }

      promotionId = promo.id;
    }

    // ── 4. Calcular totales definitivos ───────────────────────────────────
    // El costo de envío fijo lo define el backend (mismo valor que SHIPPING_COST del frontend)
    const SHIPPING_FLAT = 3500;
    const serverShippingCost = body.delivery_method === "shipping" && !isFreeShipping
      ? SHIPPING_FLAT
      : 0;
    const serverTotal = Math.round((serverSubtotal - serverDiscountAmount + serverShippingCost) * 100) / 100;

    // ── 5. Crear order + order_items en transacción ───────────────────────
    const orderId     = randomUUID();
    const orderNumber = generateOrderNumber();

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Bloquear filas de productos para evitar sobreventas concurrentes
      for (const item of body.items) {
        const [locked] = await conn.query<DbProduct[]>(
          "SELECT id, stock_quantity FROM products WHERE id = ? FOR UPDATE",
          [item.product_id]
        );
        if (!locked[0] || locked[0].stock_quantity < item.quantity) {
          await conn.rollback();
          return res.status(409).json({
            error: `Stock insuficiente (race condition) para el producto ${item.product_id}`,
          });
        }
      }

      // Insertar la orden principal
      await conn.query(
        `INSERT INTO orders
           (id, order_number, user_id, status, subtotal, discount_amount,
            shipping_cost, total, delivery_method, shipping_address, notes,
            created_at, updated_at)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          orderId,
          orderNumber,
          authReq.user.userId,
          serverSubtotal,
          serverDiscountAmount,
          serverShippingCost,
          serverTotal,
          body.delivery_method,
          body.shipping_address ? JSON.stringify(body.shipping_address) : null,
          body.notes ?? null,
        ]
      );

      // Insertar cada ítem del pedido (precio tomado de la DB, no del cliente)
      for (const item of body.items) {
        const product    = productMap.get(item.product_id)!;
        const unitPrice  = product.price;
        const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;

        await conn.query(
          `INSERT INTO order_items
             (id, order_id, product_id, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [randomUUID(), orderId, item.product_id, item.quantity, unitPrice, totalPrice]
        );
      }

      // Incrementar current_uses del cupón si se usó uno
      if (promotionId) {
        await conn.query(
          "UPDATE promotions SET current_uses = current_uses + 1 WHERE id = ?",
          [promotionId]
        );
      }

      await conn.commit();
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }

    // ── 6. Crear preferencia en Mercado Pago ──────────────────────────────
    const mpItems = body.items.map((item) => {
      const product = productMap.get(item.product_id)!;
      return {
        id:         item.product_id,
        title:      product.name,
        quantity:   item.quantity,
        unit_price: product.price,
      };
    });

    const mpResult = await buildMpPreference({
      orderId,
      orderNumber,
      items: mpItems,
      payer: {
        email:   user.email,
        name:    user.first_name,
        surname: user.last_name,
      },
    });

    // ── 7. Notificar por email al encargado de la sucursal (no bloqueante) ──
    // El pedido ya fue creado: avisamos al encargado para que prepare el despacho.
    void sendOrderNotificationToManager({
      orderNumber,
      customerName:   `${user.first_name} ${user.last_name}`.trim(),
      customerEmail:  user.email,
      deliveryMethod: body.delivery_method,
      shippingAddress: body.shipping_address,
      items: body.items.map((i) => ({
        name:     productMap.get(i.product_id)?.name ?? i.product.name,
        quantity: i.quantity,
      })),
      total: serverTotal,
      notes: body.notes,
    });

    return res.status(201).json({
      order_id:            orderId,
      order_number:        orderNumber,
      preference_id:       mpResult.preference_id,
      init_point:          mpResult.init_point,
      sandbox_init_point:  mpResult.sandbox_init_point,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Datos del pedido inválidos", details: error.errors });
    }
    // Mercado Pago (y otros) suelen anidar el motivo real en cause/message.
    // Lo exponemos para poder diagnosticar (token inválido, back_url, etc.).
    const mpError = error as { message?: string; cause?: unknown; status?: number };
    const detail =
      (Array.isArray(mpError.cause) && mpError.cause[0]?.description) ||
      mpError.message ||
      String(error);
    console.error("[Payments] Error creando pedido:", detail, error);
    return res.status(500).json({ error: "Error al crear el pedido", detail });
  }
});

// =============================================
// SECCIÓN: PREFERENCIA DIRECTA (legado)
// Usado si se tiene un order_id preexistente y
// solo se necesita generar la URL de pago de MP.
// =============================================

const createPreferenceSchema = z.object({
  order_id:     z.string(),
  order_number: z.string(),
  items: z.array(
    z.object({
      id:          z.string(),
      title:       z.string(),
      quantity:    z.number().int().positive(),
      unit_price:  z.number().positive(),
      currency_id: z.string().default("ARS"),
    })
  ),
  payer: z.object({
    email:   z.string().email(),
    name:    z.string(),
    surname: z.string(),
  }),
});

// -----------------------------------------------
// POST /payments/create-preference
// No crea pedido en DB. Llama directamente a MP.
// -----------------------------------------------
paymentsRouter.post("/create-preference", async (req, res) => {
  try {
    const body = createPreferenceSchema.parse(req.body);

    const mpResult = await buildMpPreference({
      orderId:     body.order_id,
      orderNumber: body.order_number,
      items:       body.items,
      payer:       body.payer,
    });

    return res.json({
      preference_id:      mpResult.preference_id,
      init_point:         mpResult.init_point,
      sandbox_init_point: mpResult.sandbox_init_point,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Datos inválidos", details: error.errors });
    }
    console.error("[Payments] Error al crear preferencia:", error);
    return res.status(500).json({ error: "Error al crear la preferencia de pago" });
  }
});
