// =============================================
// RUTAS DEL CATÁLOGO PÚBLICO
// GET /catalog/products        - listado con filtros y paginación
// GET /catalog/products/:slug  - detalle de producto
// GET /catalog/products/featured - productos destacados
// GET /catalog/categories      - todas las categorías activas
// =============================================

import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";

export const catalogRouter = Router();

// -----------------------------------------------
// Tipos internos de la capa de datos
// -----------------------------------------------
interface DbProduct extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  sku: string;
  price: number;
  compare_price: number | null;
  category_id: string;
  category_name: string;
  category_slug: string;
  stock_quantity: number;
  is_active: number;
  is_featured: number;
  brand: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

interface DbImage extends RowDataPacket {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
}

// -----------------------------------------------
// Helper: obtiene imágenes de un producto
// -----------------------------------------------
async function attachImages(productId: string): Promise<DbImage[]> {
  const [rows] = await db.query<DbImage[]>(
    "SELECT id, image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
    [productId]
  );
  return rows;
}

// -----------------------------------------------
// GET /catalog/categories
// Devuelve todas las categorías activas ordenadas por sort_order
// -----------------------------------------------
catalogRouter.get("/categories", async (_req, res) => {
  try {
    const [categories] = await db.query<RowDataPacket[]>(
      "SELECT id, name, slug, description, image_url, parent_id, sort_order FROM categories WHERE is_active = 1 ORDER BY sort_order ASC"
    );
    res.json({ data: categories });
  } catch (error) {
    console.error("[Catalog] Error en GET /categories:", error);
    res.status(500).json({ error: "Error al obtener las categorías" });
  }
});

// -----------------------------------------------
// GET /catalog/products/featured
// Devuelve los N productos marcados como is_featured
// Query param: limit (default 8)
// -----------------------------------------------
catalogRouter.get("/products/featured", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 8, 20);

  try {
    const [rows] = await db.query<DbProduct[]>(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1 AND p.is_featured = 1 AND p.stock_quantity > 0
       ORDER BY CASE WHEN p.compare_price > p.price THEN (p.compare_price - p.price) / p.compare_price ELSE 0 END DESC,
                p.created_at DESC
       LIMIT ?`,
      [limit]
    );

    const data = await Promise.all(rows.map(async (p) => ({ ...p, images: await attachImages(p.id) })));
    res.json({ data });
  } catch (error) {
    console.error("[Catalog] Error en GET /products/featured:", error);
    res.status(500).json({ error: "Error al obtener los productos destacados" });
  }
});

// -----------------------------------------------
// GET /catalog/products
// Listado con filtros: category, search, min_price, max_price, sort, page, limit
// -----------------------------------------------
catalogRouter.get("/products", async (req, res) => {
  const {
    category,
    search,
    min_price,
    max_price,
    sort = "newest",
    page = "1",
    limit = "24",
    featured,
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(parseInt(limit) || 24, 100);
  const offset = (pageNum - 1) * limitNum;

  // Construir condiciones WHERE dinámicamente
  const conditions: string[] = ["p.is_active = 1"];
  const params: (string | number)[] = [];

  if (featured === "1" || featured === "true") {
    conditions.push("p.is_featured = 1");
  }

  if (category) {
    conditions.push("c.slug = ?");
    params.push(category);
  }

  if (search) {
    conditions.push("(p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  if (min_price) {
    conditions.push("p.price >= ?");
    params.push(parseFloat(min_price));
  }

  if (max_price) {
    conditions.push("p.price <= ?");
    params.push(parseFloat(max_price));
  }

  const where = conditions.join(" AND ");

  // ─── Ordenamiento ────────────────────────────────────────────────────────
  // Regla fija: primero productos CON stock, luego sin stock.
  // Dentro de los con stock, el criterio secundario varía según `sort`.
  // ─────────────────────────────────────────────────────────────────────────
  const stockFirst = "CASE WHEN p.stock_quantity > 0 THEN 0 ELSE 1 END ASC";
  const discountDesc = "CASE WHEN p.compare_price > p.price THEN (p.compare_price - p.price) / p.compare_price ELSE 0 END DESC";

  const secondarySortMap: Record<string, string> = {
    newest:     `${discountDesc}, p.created_at DESC`,
    price_asc:  "p.price ASC",
    price_desc: "p.price DESC",
    name_asc:   "p.name ASC",
  };
  const secondaryOrder = secondarySortMap[sort] ?? `${discountDesc}, p.created_at DESC`;
  const orderBy = `${stockFirst}, ${secondaryOrder}`;

  try {
    // Contar total para paginación (params sin limit/offset)
    const [countRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE ${where}`,
      params
    );
    const total = (countRows[0] as { count: number }).count;

    // Obtener la página solicitada
    const [rows] = await db.query<DbProduct[]>(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const data = await Promise.all(rows.map(async (p) => ({ ...p, images: await attachImages(p.id) })));

    res.json({
      data,
      meta: {
        total_count: total,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[Catalog] Error en GET /products:", error);
    res.status(500).json({ error: "Error al obtener los productos" });
  }
});

// -----------------------------------------------
// GET /catalog/products/:slug
// Detalle completo de un producto por su slug
// -----------------------------------------------
catalogRouter.get("/products/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const [rows] = await db.query<DbProduct[]>(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ? AND p.is_active = 1
       LIMIT 1`,
      [slug]
    );
    const product = rows[0];

    if (!product) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const images = await attachImages(product.id);
    res.json({ data: { ...product, images } });
  } catch (error) {
    console.error("[Catalog] Error en GET /products/:slug:", error);
    res.status(500).json({ error: "Error al obtener el producto" });
  }
});
