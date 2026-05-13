// =============================================
// RUTA: REPORTES ADMINISTRATIVOS
// Genera reportes de ventas, productos más/menos vendidos,
// métricas globales, listados y gestión de stock.
// Usa MySQL directamente.
// =============================================

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";
import { requireAuth } from "./auth";

interface AuthRequest extends Request {
  user: { userId: string; role: string };
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if ((req as AuthRequest).user?.role !== "admin") {
    res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
    return;
  }
  next();
}

const castAuth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;

export const reportsRouter = Router();

// -----------------------------------------------
// Tipos internos para las consultas
// -----------------------------------------------
interface SalesRow extends RowDataPacket {
  revenue: number | null;
  count: number;
}

interface TopProductRow extends RowDataPacket {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  category_name: string | null;
  total_sold: number;
  total_revenue: number;
}

interface OrderRow extends RowDataPacket {
  id: string;
  order_number: string;
  status: string;
  total: number;
  delivery_method: string;
  created_at: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
}

interface MetricsRow extends RowDataPacket {
  total_orders: number;
  total_revenue: number | null;
  total_products: number;
  total_users: number;
  orders_today: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

interface StatusRow extends RowDataPacket {
  status: string;
  count: number;
}

// -----------------------------------------------
// GET /reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
// Reporte de ventas por período
// -----------------------------------------------
reportsRouter.get("/sales", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };

    // Fechas por defecto: primer día del mes actual hasta hoy
    const today = new Date().toISOString().split("T")[0];
    const firstOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
    const dateFrom = from ?? firstOfMonth;
    const dateTo = to ?? today;

    // Agregar T23:59:59 al final para incluir todo el día final
    const dateToFull = `${dateTo}T23:59:59`;

    const [rows] = await db.query<SalesRow[]>(
      `SELECT SUM(total) as revenue, COUNT(*) as count
       FROM orders
       WHERE status IN ('paid','processing','shipped','delivered')
         AND created_at >= ?
         AND created_at <= ?`,
      [dateFrom, dateToFull]
    );
    const row = rows[0];

    const totalRevenue = row?.revenue ?? 0;
    const totalOrders = row?.count ?? 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      period: { from: dateFrom, to: dateTo },
      metrics: {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_orders: totalOrders,
        average_order_value: Math.round(averageOrderValue * 100) / 100,
      },
    });
  } catch (error) {
    console.error("[Reports] Error en reporte de ventas:", error);
    res.status(500).json({ error: "Error al generar el reporte de ventas" });
  }
});

// -----------------------------------------------
// GET /reports/top-products?limit=10
// Productos más vendidos por unidades
// -----------------------------------------------
reportsRouter.get("/top-products", async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 10);

    const [rows] = await db.query<TopProductRow[]>(
      `SELECT
         p.id,
         p.name,
         p.sku,
         p.brand,
         c.name AS category_name,
         SUM(oi.quantity) AS total_sold,
         SUM(oi.total_price) AS total_revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE o.status IN ('paid','processing','shipped','delivered')
       GROUP BY p.id, p.name, p.sku, p.brand, c.name
       ORDER BY total_sold DESC
       LIMIT ?`,
      [limit]
    );

    res.json({ top_products: rows });
  } catch (error) {
    console.error("[Reports] Error en top productos:", error);
    res.status(500).json({ error: "Error al generar el reporte de top productos" });
  }
});

// -----------------------------------------------
// GET /reports/worst-products?limit=10
// Productos menos vendidos (incluye productos con 0 ventas)
// -----------------------------------------------
reportsRouter.get("/worst-products", async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 10);

    const [rows] = await db.query<TopProductRow[]>(
      `SELECT
         p.id,
         p.name,
         p.sku,
         p.brand,
         COALESCE(SUM(oi.quantity), 0) AS total_sold,
         COALESCE(SUM(oi.total_price), 0) AS total_revenue
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON o.id = oi.order_id
         AND o.status IN ('paid','processing','shipped','delivered')
       WHERE p.is_active = 1
       GROUP BY p.id, p.name, p.sku, p.brand
       ORDER BY total_sold ASC
       LIMIT ?`,
      [limit]
    );

    res.json({ worst_products: rows });
  } catch (error) {
    console.error("[Reports] Error en worst productos:", error);
    res.status(500).json({ error: "Error al generar el reporte de peores productos" });
  }
});

// -----------------------------------------------
// GET /reports/orders?limit=50&status=pending
// Lista de pedidos con datos de usuario.
// Filtro opcional por estado.
// -----------------------------------------------
reportsRouter.get("/orders", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 500);
    const { status } = req.query as { status?: string };

    const validStatuses = ["pending", "paid", "processing", "ready_to_ship", "shipped", "delivered", "cancelled", "refunded"];
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status && validStatuses.includes(status)) {
      conditions.push("o.status = ?");
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [orders] = await db.query<OrderRow[]>(
      `SELECT
         o.id,
         o.order_number,
         o.status,
         o.total,
         o.delivery_method,
         o.created_at,
         u.email AS user_email,
         u.first_name AS user_first_name,
         u.last_name AS user_last_name
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT ?`,
      [...params, limit]
    );

    res.json({ data: orders });
  } catch (error) {
    console.error("[Reports] Error listando pedidos:", error);
    res.status(500).json({ error: "Error al obtener los pedidos" });
  }
});

// -----------------------------------------------
// GET /reports/users
// Lista todos los usuarios sin contraseña
// -----------------------------------------------
reportsRouter.get("/users", async (_req, res) => {
  try {
    const [users] = await db.query<RowDataPacket[]>(
      `SELECT id, email, first_name, last_name, phone, role, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({ data: users });
  } catch (error) {
    console.error("[Reports] Error listando usuarios:", error);
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
});

// -----------------------------------------------
// GET /reports/metrics
// Métricas globales para el dashboard
// -----------------------------------------------
reportsRouter.get("/metrics", async (_req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    // Formato compatible con DATETIME de MySQL
    const todayStr = todayStart.toISOString().replace("T", " ").split(".")[0];

    // Métricas principales en una sola consulta agregada
    // Nota: MySQL requiere GROUP BY en subconsultas correlacionadas pero
    // las subconsultas escalares (SELECT COUNT(*) FROM ...) son válidas.
    const [baseRows] = await db.query<MetricsRow[]>(
      `SELECT
         COUNT(*) AS total_orders,
         SUM(CASE WHEN status IN ('paid','processing','shipped','delivered') THEN total ELSE 0 END) AS total_revenue,
         (SELECT COUNT(*) FROM products) AS total_products,
         (SELECT COUNT(*) FROM users) AS total_users,
         SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS orders_today,
         (SELECT COUNT(*) FROM products WHERE stock_quantity > 0 AND stock_quantity <= 5) AS low_stock_count,
         (SELECT COUNT(*) FROM products WHERE stock_quantity <= 0) AS out_of_stock_count
       FROM orders`,
      [todayStr]
    );
    const base = baseRows[0];

    // Conteo de pedidos por estado
    const [statusRows] = await db.query<StatusRow[]>(
      "SELECT status, COUNT(*) AS count FROM orders GROUP BY status"
    );

    const orders_by_status: Record<string, number> = {};
    for (const row of statusRows) {
      orders_by_status[row.status] = row.count;
    }

    res.json({
      data: {
        total_orders: base?.total_orders ?? 0,
        total_revenue: Math.round((base?.total_revenue ?? 0) * 100) / 100,
        total_products: base?.total_products ?? 0,
        total_users: base?.total_users ?? 0,
        orders_today: base?.orders_today ?? 0,
        low_stock_count: base?.low_stock_count ?? 0,
        out_of_stock_count: base?.out_of_stock_count ?? 0,
        orders_by_status,
      },
    });
  } catch (error) {
    console.error("[Reports] Error en métricas globales:", error);
    res.status(500).json({ error: "Error al obtener las métricas" });
  }
});

// -----------------------------------------------
// GET /reports/promotions
// Lista todas las promociones (códigos de descuento)
// -----------------------------------------------
interface PromotionRow extends RowDataPacket {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  current_uses: number;
  is_active: number;
  valid_from: string;
  valid_until: string | null;
}

reportsRouter.get("/promotions", async (_req, res) => {
  try {
    const [rows] = await db.query<PromotionRow[]>(
      `SELECT id, code, name, description, type, value,
              min_order_amount, max_uses, current_uses,
              is_active, valid_from, valid_until
       FROM promotions
       ORDER BY code ASC`
    );
    const data = rows.map((p) => ({ ...p, is_active: Boolean(p.is_active) }));
    res.json({ data });
  } catch (error) {
    console.error("[Reports] Error listando promociones:", error);
    res.status(500).json({ error: "Error al obtener las promociones" });
  }
});

// -----------------------------------------------
// Tipos internos para stock
// -----------------------------------------------
interface StockMovementRow extends RowDataPacket {
  id: string;
  product_id: string;
  product_name: string;
  type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  created_at: string;
}

interface ProductStockRow extends RowDataPacket {
  id: string;
  name: string;
  stock_quantity: number;
}

// -----------------------------------------------
// GET /reports/stock-movements?limit=50
// Historial de movimientos de stock (admin)
// -----------------------------------------------
reportsRouter.get("/stock-movements", castAuth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);

    const [rows] = await db.query<StockMovementRow[]>(
      `SELECT
         sm.id,
         sm.product_id,
         p.name     AS product_name,
         sm.type,
         sm.quantity,
         sm.previous_quantity,
         sm.new_quantity,
         sm.reason,
         sm.created_at
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       ORDER BY sm.created_at DESC
       LIMIT ?`,
      [limit]
    );

    // product_id se devuelve como objeto para compatibilidad con el frontend
    const data = rows.map((row) => ({
      id:                row.id,
      product_id:        { id: row.product_id, name: row.product_name },
      type:              row.type,
      quantity:          row.quantity,
      previous_quantity: row.previous_quantity,
      new_quantity:      row.new_quantity,
      reason:            row.reason,
      created_at:        row.created_at,
    }));

    res.json({ data });
  } catch (error) {
    console.error("[Reports] Error listando movimientos de stock:", error);
    res.status(500).json({ error: "Error al obtener los movimientos de stock" });
  }
});

// -----------------------------------------------
// POST /reports/stock-movement
// Registra ingreso, egreso o ajuste de stock (admin)
// Actualiza products.stock_quantity, inserta en
// stock_movements y registra en audit_logs.
// -----------------------------------------------
reportsRouter.post("/stock-movement", castAuth, requireAdmin, async (req, res) => {
  const authReq = req as AuthRequest;
  const { product_id, type, quantity, reason } = req.body as {
    product_id?: string;
    type?: string;
    quantity?: unknown;
    reason?: string;
  };

  // --- Validaciones de entrada ---
  if (!product_id) {
    res.status(400).json({ error: "El campo product_id es requerido" });
    return;
  }
  if (!["ingreso", "egreso", "ajuste"].includes(type ?? "")) {
    res.status(400).json({ error: "Tipo inválido. Valores permitidos: ingreso, egreso, ajuste" });
    return;
  }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    res.status(400).json({ error: "La cantidad debe ser un entero positivo mayor a cero" });
    return;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Verificar que el producto existe y bloquear la fila para la transacción
    const [productRows] = await conn.query<ProductStockRow[]>(
      "SELECT id, name, stock_quantity FROM products WHERE id = ? FOR UPDATE",
      [product_id]
    );
    const product = productRows[0];
    if (!product) {
      await conn.rollback();
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const previousQty = product.stock_quantity;
    let newQty: number;

    if (type === "ingreso") {
      newQty = previousQty + qty;
    } else if (type === "egreso") {
      if (qty > previousQty) {
        await conn.rollback();
        res.status(400).json({
          error: `Stock insuficiente. Stock actual: ${previousQty}, solicitado: ${qty}`,
        });
        return;
      }
      newQty = previousQty - qty;
    } else {
      // ajuste: fija el stock al valor absoluto indicado
      newQty = qty;
    }

    // Actualizar stock en products
    await conn.query(
      "UPDATE products SET stock_quantity = ?, updated_at = NOW() WHERE id = ?",
      [newQty, product_id]
    );

    // Insertar movimiento en stock_movements
    const movementId = randomUUID();
    await conn.query(
      `INSERT INTO stock_movements
         (id, product_id, type, quantity, previous_quantity, new_quantity, reason, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [movementId, product_id, type, qty, previousQty, newQty, reason ?? null, authReq.user.userId]
    );

    // Registrar en audit_logs para trazabilidad completa
    await conn.query(
      `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, user_id, previous_value, new_value, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        randomUUID(),
        `stock_${type}`,
        "product",
        product_id,
        authReq.user.userId,
        JSON.stringify({ stock_quantity: previousQty }),
        JSON.stringify({ stock_quantity: newQty, reason: reason ?? null }),
        req.ip ?? null,
      ]
    );

    await conn.commit();

    res.status(201).json({
      message: "Movimiento registrado correctamente",
      movement: {
        id:                movementId,
        product_id:        { id: product_id, name: product.name },
        type,
        quantity:          qty,
        previous_quantity: previousQty,
        new_quantity:      newQty,
        reason:            reason ?? null,
      },
    });
  } catch (error) {
    await conn.rollback();
    console.error("[Reports] Error registrando movimiento de stock:", error);
    res.status(500).json({ error: "Error al registrar el movimiento de stock" });
  } finally {
    conn.release();
  }
});

// -----------------------------------------------
// Tipo interno para el reporte de visitas
// -----------------------------------------------
interface MostVisitedRow extends RowDataPacket {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  category_name: string | null;
  view_count: number;
}

// -----------------------------------------------
// GET /reports/most-visited-products?limit=10&from=YYYY-MM-DD&to=YYYY-MM-DD
// Productos con más visitas al detalle, orden descendente.
// Rango de fechas opcional; sin rango = histórico completo.
// -----------------------------------------------
reportsRouter.get("/most-visited-products", castAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 10), 100);
  const { from, to } = req.query as { from?: string; to?: string };

  // Las condiciones de fecha van en el ON del LEFT JOIN para no convertirlo
  // en INNER JOIN al usar WHERE sobre una columna de la tabla derecha.
  const dateConditions: string[] = [];
  const dateParams: string[] = [];
  if (from) { dateConditions.push("pv.created_at >= ?"); dateParams.push(from); }
  if (to)   { dateConditions.push("pv.created_at <= ?"); dateParams.push(`${to}T23:59:59`); }

  const extraOn = dateConditions.length > 0 ? ` AND ${dateConditions.join(" AND ")}` : "";

  try {
    const [rows] = await db.query<MostVisitedRow[]>(
      `SELECT
         p.id,
         p.name,
         p.sku,
         p.brand,
         c.name      AS category_name,
         COUNT(pv.id) AS view_count
       FROM products p
       LEFT JOIN product_views pv ON pv.product_id = p.id${extraOn}
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1
       GROUP BY p.id, p.name, p.sku, p.brand, c.name
       HAVING view_count > 0
       ORDER BY view_count DESC
       LIMIT ?`,
      [...dateParams, limit]
    );

    res.json({ data: rows });
  } catch (error) {
    console.error("[Reports] Error en productos más visitados:", error);
    res.status(500).json({ error: "Error al obtener el reporte de visitas" });
  }
});
