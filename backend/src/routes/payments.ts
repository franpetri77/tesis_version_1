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
import {
  cancelPendingOrder, CheckoutConflict, consolidateStockItems, deductOrderStock,
  lockStockProducts, RESERVATION_MINUTES,
} from "../services/orderStock";

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
  expiresAt: string;
}): Promise<{
  preference_id: string | null;
  init_point: string | null;
  sandbox_init_point: string | null;
}> {
  const preferenceClient = new Preference(mpClient);
  const pref = await preferenceClient.create({
    body: {
      items: params.items.map((i) => ({ ...i, currency_id: "ARS" })),
      payer: params.payer,
      back_urls: {
        success: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/checkout/exitoso?order=${params.orderId}`,
        failure: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/checkout/fallido?order=${params.orderId}`,
        pending: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/checkout/pendiente?order=${params.orderId}`,
      },
      auto_return: "approved",
      external_reference: params.orderId,
      expires: true,
      expiration_date_to: params.expiresAt,
      notification_url: `${process.env.BACKEND_URL ?? "http://localhost:4000"}/webhooks/mercadopago`,
      statement_descriptor: "TELE IMPORT",
      metadata: { order_number: params.orderNumber },
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
        product_id: z.string().min(1).max(50),
        quantity:   z.number().int().positive().max(2147483647),
        unit_price: z.number().positive(),
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
  subtotal:        z.number().nonnegative(),
  discount_amount: z.number().nonnegative(),
  shipping_cost:   z.number().nonnegative(),
  total:           z.number().positive(),
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
    const items = consolidateStockItems(body.items);

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
    const productIds   = items.map((i) => i.product_id);
    const placeholders = productIds.map(() => "?").join(",");

    const [productRows] = await db.query<DbProduct[]>(
      `SELECT id, name, price, stock_quantity, is_active
       FROM products
       WHERE id IN (${placeholders})`,
      productIds
    );
    const productMap = new Map(productRows.map((p) => [p.id.toLowerCase(), p]));

    let serverSubtotal = 0;
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return res.status(400).json({ error: `Producto no encontrado: ${item.product_id}` });
      }
      if (!product.is_active) {
        return res.status(400).json({ error: `El producto "${product.name}" ya no está disponible` });
      }
      if (product.stock_quantity < item.quantity) {
        return res.status(409).json({
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
    let expiresAt: string;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const lockedProducts = await lockStockProducts(conn, items);

      // Insertar la orden principal
      await conn.query(
        `INSERT INTO orders
           (id, order_number, user_id, status, subtotal, discount_amount,
            shipping_cost, total, delivery_method, shipping_address, notes,
            created_at, updated_at, stock_reserved_at, payment_expires_at)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(),
                 DATE_ADD(NOW(), INTERVAL ${RESERVATION_MINUTES} MINUTE))`,
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
      for (const item of items) {
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

      await deductOrderStock(conn, orderId, authReq.user.userId, items, lockedProducts);
      // La fecha de MP se deriva del mismo reloj de MySQL que vence la reserva.
      const [expiry] = await conn.query<RowDataPacket[]>(
        "SELECT UNIX_TIMESTAMP(payment_expires_at) AS expires_at FROM orders WHERE id = ?", [orderId]
      );
      expiresAt = new Date(Number(expiry[0]!.expires_at) * 1000).toISOString();

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
    const mpItems = items.map((item) => {
      const product = productMap.get(item.product_id)!;
      return {
        id:         item.product_id,
        title:      product.name,
        quantity:   item.quantity,
        unit_price: product.price,
      };
    });

    let mpResult;
    try {
      mpResult = await buildMpPreference({
        orderId, orderNumber, items: mpItems, expiresAt,
        payer: { email: user.email, name: user.first_name, surname: user.last_name },
      });
      if (!mpResult.preference_id || (!mpResult.init_point && !mpResult.sandbox_init_point)) {
        throw new Error("Mercado Pago no devolvió una preferencia utilizable");
      }
    } catch (error) {
      // Si falla MP, el cliente no puede pagar: liberar la reserva inmediatamente.
      await cancelPendingOrder(orderId);
      throw error;
    }

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
    if (error instanceof CheckoutConflict) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("[Payments] Error creando pedido:", error);
    return res.status(500).json({ error: "Error al crear el pedido" });
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
paymentsRouter.post("/create-preference", castAuth, async (req, res) => {
  try {
    const body = createPreferenceSchema.parse(req.body);

    // El legado tampoco puede pagar pedidos ajenos, sin reserva o vencidos,
    // ni extender los 60 minutos creando otra preferencia.
    const [orders] = await db.query<RowDataPacket[]>(
      `SELECT o.order_number, UNIX_TIMESTAMP(o.payment_expires_at) AS expires_at,
              u.email, u.first_name, u.last_name
       FROM orders o JOIN users u ON u.id = o.user_id
       WHERE o.id = ? AND o.user_id = ? AND o.status = 'pending'
         AND o.stock_reserved_at IS NOT NULL AND o.stock_released_at IS NULL
         AND o.payment_expires_at > NOW()`, [body.order_id, (req as AuthRequest).user.userId]
    );
    const order = orders[0];
    if (!order) return res.status(409).json({ error: "El pedido no tiene una reserva de stock vigente" });
    const [storedItems] = await db.query<RowDataPacket[]>(
      `SELECT oi.product_id AS id, p.name AS title, oi.quantity, oi.unit_price
       FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`, [body.order_id]
    );

    const mpResult = await buildMpPreference({
      orderId:     body.order_id,
      orderNumber: order.order_number as string,
      items: storedItems as Array<RowDataPacket & { id: string; title: string; quantity: number; unit_price: number }>,
      payer: { email: order.email as string, name: order.first_name as string, surname: order.last_name as string },
      expiresAt: new Date(Number(order.expires_at) * 1000).toISOString(),
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
