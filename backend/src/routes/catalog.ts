// =============================================
// RUTAS DEL CATÁLOGO PÚBLICO
// GET /catalog/products        - listado con filtros y paginación
// GET /catalog/products/:slug  - detalle de producto
// GET /catalog/products/featured - productos destacados
// GET /catalog/categories      - todas las categorías activas
// =============================================

import { Router } from "express";
import db from "../db/database";

export const catalogRouter = Router();

// -----------------------------------------------
// Tipos internos de la capa de datos
// -----------------------------------------------
interface DbProduct {
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

// -----------------------------------------------
// Helper: agrega imágenes a un producto
// -----------------------------------------------
function attachImages(productId: string) {
  return db
    .prepare(
      "SELECT id, image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC"
    )
    .all(productId) as { id: string; image_url: string; alt_text: string | null; sort_order: number }[];
}

// -----------------------------------------------
// GET /catalog/categories
// Devuelve todas las categorías activas ordenadas por sort_order
// -----------------------------------------------
catalogRouter.get("/categories", (_req, res) => {
  const categories = db
    .prepare(
      "SELECT id, name, slug, description, image_url, parent_id, sort_order FROM categories WHERE is_active = 1 ORDER BY sort_order ASC"
    )
    .all();
  res.json({ data: categories });
});

// -----------------------------------------------
// GET /catalog/products/featured
// Devuelve los N productos marcados como is_featured
// Query param: limit (default 8)
// -----------------------------------------------
catalogRouter.get("/products/featured", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 8, 20);

  const rows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1 AND p.is_featured = 1 AND p.stock_quantity > 0
       ORDER BY CASE WHEN p.compare_price > p.price THEN (p.compare_price - p.price) * 1.0 / p.compare_price ELSE 0 END DESC, p.created_at DESC
       LIMIT ?`
    )
    .all(limit) as DbProduct[];

  const data = rows.map((p) => ({ ...p, images: attachImages(p.id) }));
  res.json({ data });
});

// -----------------------------------------------
// GET /catalog/products
// Listado con filtros: category, search, min_price, max_price, sort, page, limit
// -----------------------------------------------
catalogRouter.get("/products", (req, res) => {
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
  // Dentro de los con stock, el criterio secundario varía según `sort`:
  //   - newest/default: mejor descuento primero, luego más reciente
  //   - price_asc/desc: precio ordenado
  //   - name_asc: nombre A-Z
  // ─────────────────────────────────────────────────────────────────────────
  const stockFirst = "CASE WHEN p.stock_quantity > 0 THEN 0 ELSE 1 END ASC";
  const discountDesc = "CASE WHEN p.compare_price > p.price THEN (p.compare_price - p.price) * 1.0 / p.compare_price ELSE 0 END DESC";

  const secondarySortMap: Record<string, string> = {
    newest:     `${discountDesc}, p.created_at DESC`,
    price_asc:  "p.price ASC",
    price_desc: "p.price DESC",
    name_asc:   "p.name ASC",
  };
  const secondaryOrder = secondarySortMap[sort] ?? `${discountDesc}, p.created_at DESC`;
  const orderBy = `${stockFirst}, ${secondaryOrder}`;

  // Contar total para paginación
  const total = (
    db
      .prepare(
        `SELECT COUNT(*) as count
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE ${where}`
      )
      .get(...params) as { count: number }
  ).count;

  // Obtener la página
  const rows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...params, limitNum, offset) as DbProduct[];

  const data = rows.map((p) => ({ ...p, images: attachImages(p.id) }));

  res.json({
    data,
    meta: {
      total_count: total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum),
    },
  });
});

// -----------------------------------------------
// GET /catalog/products/:slug
// Detalle completo de un producto por su slug
// -----------------------------------------------
catalogRouter.get("/products/:slug", (req, res) => {
  const { slug } = req.params;

  const product = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ? AND p.is_active = 1
       LIMIT 1`
    )
    .get(slug) as DbProduct | undefined;

  if (!product) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }

  const images = attachImages(product.id);
  res.json({ data: { ...product, images } });
});
