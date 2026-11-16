import type { RowDataPacket } from "mysql2";
import db from "../db/database";

// A purchase can still contribute to preferences while the order is in fulfillment.
const PURCHASED = "'paid','processing','ready_to_ship','shipped','delivered'";

export type RecommendationContext =
  | { kind: "catalog" }
  | { kind: "product"; productId: string }
  | { kind: "history"; userId: string }
  | { kind: "order"; userId: string; orderId: string };

interface RecommendationRow extends RowDataPacket {
  id: string;
  matched_category: number;
}

export async function getRecommendedProducts(context: RecommendationContext, limit: number) {
  const available = "p.is_active = 1 AND p.stock_quantity > 0 AND c.is_active = 1";
  const select = "p.*, c.name AS category_name, c.slug AS category_slug";
  const catalogOrder = "p.is_featured DESC, p.created_at DESC, p.id ASC";

  if (context.kind === "catalog" || context.kind === "product") {
    const related = context.kind === "product";
    const [rows] = await db.query<RecommendationRow[]>(
      `SELECT ${select}, ${related ? 1 : 0} AS matched_category
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${related ? "JOIN products current ON current.id = ? AND current.is_active = 1 AND current.category_id = p.category_id" : ""}
       WHERE ${available} ${related ? "AND p.id <> current.id" : ""}
       ORDER BY ${catalogOrder} LIMIT ?`,
      related ? [context.productId, limit] : [limit],
    );
    return rows;
  }

  const byOrder = context.kind === "order";
  const [rows] = await db.query<RecommendationRow[]>(
    `WITH eligible_orders AS (
       SELECT id FROM orders
       WHERE user_id = ? AND status IN (${PURCHASED}) ${byOrder ? "AND id = ?" : ""}
     ), purchases AS (
       SELECT i.product_id, original.category_id, SUM(i.quantity) AS units
       FROM eligible_orders o
       JOIN order_items i ON i.order_id = o.id
       JOIN products original ON original.id = i.product_id
       GROUP BY i.product_id, original.category_id
     ), preferences AS (
       SELECT category_id, SUM(units) AS units FROM purchases GROUP BY category_id
     )
     SELECT ${select}, (pref.category_id IS NOT NULL) AS matched_category
     FROM products p
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN preferences pref ON pref.category_id = p.category_id
     WHERE ${available}
       AND NOT EXISTS (SELECT 1 FROM purchases bought WHERE bought.product_id = p.id)
       ${byOrder ? "AND EXISTS (SELECT 1 FROM eligible_orders)" : ""}
     ORDER BY pref.units DESC, ${catalogOrder} LIMIT ?`,
    byOrder ? [context.userId, context.orderId, limit] : [context.userId, limit],
  );
  return rows;
}
