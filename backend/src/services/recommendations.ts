// =============================================
// SERVICIO: RECOMENDACIONES DE PRODUCTOS
// Lógica de recomendaciones basada en:
//   - Historial de compras del usuario
//   - Categoría del producto actual
//   - Productos trending (más vendidos recientemente)
//
// Migrado de Directus REST API a consultas directas en MySQL.
// =============================================

import type { RowDataPacket } from "mysql2";
import pool from "../db/database";

/**
 * Obtiene los IDs de categorías que el usuario ha comprado.
 * Base para calcular recomendaciones personalizadas.
 */
export async function getUserPreferredCategories(userId: string): Promise<string[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT p.category_id
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = ?
         AND o.status IN ('paid', 'delivered')
       LIMIT 30`,
      [userId]
    );

    return rows.map((r) => (r as { category_id: string }).category_id);
  } catch {
    return [];
  }
}

/**
 * Obtiene productos trending basados en cantidad vendida en los últimos 30 días.
 */
export async function getTrendingProductIds(limit = 10): Promise<string[]> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .split(".")[0];

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT oi.product_id, SUM(oi.quantity) AS total_sold
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.created_at >= ?
         AND o.status IN ('paid', 'delivered')
       GROUP BY oi.product_id
       ORDER BY total_sold DESC
       LIMIT ?`,
      [thirtyDaysAgo, limit]
    );

    return rows.map((r) => (r as { product_id: string }).product_id);
  } catch {
    return [];
  }
}
