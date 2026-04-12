// =============================================
// RUTA: REPORTES ADMINISTRATIVOS
// Genera reportes de ventas, productos más/menos vendidos,
// métricas globales y listados. Usa SQLite directamente.
// =============================================

import { Router } from "express";
import db from "../db/database";

export const reportsRouter = Router();

// -----------------------------------------------
// Tipos internos para las consultas
// -----------------------------------------------
interface SalesRow {
  revenue: number | null;
  count: number;
}

interface TopProductRow {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  category_name: string | null;
  total_sold: number;
  total_revenue: number;
}

interface OrderRow {
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

interface MetricsRow {
  total_orders: number;
  total_revenue: number | null;
  total_products: number;
  total_users: number;
  orders_today: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

interface StatusRow {
  status: string;
  count: number;
}

// -----------------------------------------------
// GET /reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
// Reporte de ventas por período
// -----------------------------------------------
reportsRouter.get("/sales", (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };

    // Fechas por defecto: primer día del mes actual hasta hoy
    const today = new Date().toISOString().split("T")[0];
    const firstOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
    const dateFrom = from ?? firstOfMonth;
    const dateTo = to ?? today;

    // Agregar T23:59:59 al final para incluir todo el día final
    const dateToFull = `${dateTo}T23:59:59`;

    const row = db
      .prepare(
        `SELECT SUM(total) as revenue, COUNT(*) as count
         FROM orders
         WHERE status IN ('paid','processing','shipped','delivered')
           AND created_at >= ?
           AND created_at <= ?`
      )
      .get(dateFrom, dateToFull) as SalesRow;

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
reportsRouter.get("/top-products", (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 10);

    const rows = db
      .prepare(
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
         GROUP BY p.id
         ORDER BY total_sold DESC
         LIMIT ?`
      )
      .all(limit) as TopProductRow[];

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
reportsRouter.get("/worst-products", (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 10);

    const rows = db
      .prepare(
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
         GROUP BY p.id
         ORDER BY total_sold ASC
         LIMIT ?`
      )
      .all(limit) as TopProductRow[];

    res.json({ worst_products: rows });
  } catch (error) {
    console.error("[Reports] Error en worst productos:", error);
    res.status(500).json({ error: "Error al generar el reporte de peores productos" });
  }
});

// -----------------------------------------------
// GET /reports/orders?limit=50
// Lista de pedidos con datos de usuario
// -----------------------------------------------
reportsRouter.get("/orders", (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 50);

    const orders = db
      .prepare(
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
         ORDER BY o.created_at DESC
         LIMIT ?`
      )
      .all(limit) as OrderRow[];

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
reportsRouter.get("/users", (req, res) => {
  try {
    const users = db
      .prepare(
        `SELECT id, email, first_name, last_name, phone, role, created_at, updated_at
         FROM users
         ORDER BY created_at DESC`
      )
      .all();

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
reportsRouter.get("/metrics", (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString().replace("T", " ").split(".")[0];

    // Métricas principales en una sola consulta agregada
    const base = db
      .prepare(
        `SELECT
           COUNT(*) AS total_orders,
           SUM(CASE WHEN status IN ('paid','processing','shipped','delivered') THEN total ELSE 0 END) AS total_revenue,
           (SELECT COUNT(*) FROM products) AS total_products,
           (SELECT COUNT(*) FROM users) AS total_users,
           SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS orders_today,
           (SELECT COUNT(*) FROM products WHERE stock_quantity > 0 AND stock_quantity <= 5) AS low_stock_count,
           (SELECT COUNT(*) FROM products WHERE stock_quantity <= 0) AS out_of_stock_count
         FROM orders`
      )
      .get(todayStr) as MetricsRow;

    // Conteo de pedidos por estado
    const statusRows = db
      .prepare(
        `SELECT status, COUNT(*) AS count FROM orders GROUP BY status`
      )
      .all() as StatusRow[];

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
