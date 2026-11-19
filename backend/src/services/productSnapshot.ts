// =============================================
// SERVICIO: FOTO DE UN PRODUCTO PARA AUDITORÍA
// Una sola forma de describir un producto en la auditoría, compartida por
// el ABM del panel (routes/admin.ts) y la importación CSV (T6b).
// =============================================

import type { Pool, PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { productTags, parseMetadata } from "./productClassification";

export const AUDITED_PRODUCT_FIELDS = [
  "name", "slug", "sku", "price", "compare_price", "category_id", "stock_quantity",
  "brand", "model", "description", "short_description", "is_featured", "is_active",
] as const;

export type ProductSnapshot = Record<string, unknown>;

/** Arma la foto a partir de la fila, sus imágenes y los slugs de sus etiquetas. */
export function buildSnapshot(
  row: Record<string, unknown>,
  images: Array<{ image_url: string; alt_text: string | null }>,
  tagSlugs: string[],
): ProductSnapshot {
  const snap: ProductSnapshot = Object.fromEntries(AUDITED_PRODUCT_FIELDS.map((f) => [f, row[f]]));
  snap.is_active = Boolean(row.is_active);
  snap.is_featured = Boolean(row.is_featured);
  snap.tags = tagSlugs;
  snap.metadata = parseMetadata(row.metadata);
  snap.images = images.map((i) => ({ url: i.image_url, alt: i.alt_text ?? null }));
  return snap;
}

export async function productSnapshot(conn: PoolConnection | Pool, id: string, lock = false): Promise<ProductSnapshot | null> {
  const [rows] = await conn.query<RowDataPacket[]>(`SELECT * FROM products WHERE id = ?${lock ? " FOR UPDATE" : ""}`, [id]);
  const row = rows[0];
  if (!row) return null;
  const [images] = await conn.query<RowDataPacket[]>(
    "SELECT image_url, alt_text FROM product_images WHERE product_id = ? ORDER BY sort_order ASC", [id]
  );
  const tags = (await productTags(conn, id)).map((t) => t.slug);
  return buildSnapshot(row, images as Array<{ image_url: string; alt_text: string | null }>, tags);
}
