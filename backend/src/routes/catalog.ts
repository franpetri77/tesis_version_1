// =============================================
// RUTAS DEL CATÁLOGO PÚBLICO
// GET /catalog/products        - listado con filtros y paginación
// GET /catalog/products/:slug  - detalle de producto
// GET /catalog/products/featured - productos destacados
// GET /catalog/categories      - todas las categorías activas
// =============================================

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";
import { requireAuth } from "./auth";

// Mismo secreto que en auth.ts; se extrae para el endpoint de visitas (token opcional)
const JWT_SECRET = process.env.JWT_SECRET ?? "tele-import-dev-secret-2024";

interface AuthRequest extends Request {
  user: { userId: string; role: string };
}
const castAuth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;

interface ReviewRow extends RowDataPacket {
  id: string;
  product_id: string;
  user_id: string;
  user_first_name: string;
  user_last_name: string;
  rating: number;
  title: string | null;
  body: string;
  created_at: string;
}

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

// -----------------------------------------------
// GET /catalog/products/:productId/reviews
// Reseñas aprobadas de un producto con promedio
// -----------------------------------------------
catalogRouter.get("/products/:productId/reviews", async (req, res) => {
  const { productId } = req.params;
  try {
    const [pRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM products WHERE id = ? AND is_active = 1 LIMIT 1",
      [productId]
    );
    if (!pRows[0]) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const [reviews] = await db.query<ReviewRow[]>(
      `SELECT r.id, r.product_id, r.user_id,
              u.first_name AS user_first_name,
              u.last_name  AS user_last_name,
              r.rating, r.title, r.body, r.created_at
       FROM product_reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? AND r.is_approved = 1
       ORDER BY r.created_at DESC`,
      [productId]
    );

    const total = reviews.length;
    const average_rating =
      total > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
        : 0;

    res.json({ data: reviews, meta: { total, average_rating } });
  } catch (error) {
    console.error("[Catalog] Error obteniendo reseñas:", error);
    res.status(500).json({ error: "Error al obtener las reseñas" });
  }
});

// -----------------------------------------------
// POST /catalog/products/:productId/reviews
// Crea una reseña (requiere auth de cliente)
// -----------------------------------------------
catalogRouter.post("/products/:productId/reviews", castAuth, async (req, res) => {
  const { productId } = req.params;
  const authReq = req as AuthRequest;
  const { rating, title, body } = req.body as {
    rating?: unknown;
    title?: string;
    body?: string;
  };

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    res.status(400).json({ error: "El rating debe ser un número entero entre 1 y 5" });
    return;
  }
  if (!body?.trim()) {
    res.status(400).json({ error: "El comentario no puede estar vacío" });
    return;
  }

  try {
    const [pRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM products WHERE id = ? AND is_active = 1 LIMIT 1",
      [productId]
    );
    if (!pRows[0]) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    // Un usuario solo puede dejar una reseña por producto
    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id FROM product_reviews WHERE product_id = ? AND user_id = ? LIMIT 1",
      [productId, authReq.user.userId]
    );
    if (existing.length > 0) {
      res.status(409).json({ error: "Ya dejaste una reseña para este producto" });
      return;
    }

    const reviewId = randomUUID();
    await db.query(
      `INSERT INTO product_reviews
         (id, product_id, user_id, rating, title, body, is_approved, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [reviewId, productId, authReq.user.userId, ratingNum, title?.trim() ?? null, body.trim()]
    );

    res.status(201).json({
      message: "Reseña enviada. Será publicada luego de ser aprobada.",
      review: { id: reviewId, rating: ratingNum, title: title?.trim() ?? null, body: body.trim() },
    });
  } catch (error) {
    console.error("[Catalog] Error creando reseña:", error);
    res.status(500).json({ error: "Error al guardar la reseña" });
  }
});

// -----------------------------------------------
// POST /catalog/products/:productId/view
// Registra una visita al detalle de un producto.
// Endpoint público: no requiere autenticación.
// Si el request incluye un Bearer token válido,
// se asocia la visita al usuario correspondiente.
// -----------------------------------------------
catalogRouter.post("/products/:productId/view", async (req, res) => {
  const { productId } = req.params;

  // Intentar extraer user_id del token si viene en el header (sin bloquear si no)
  let userId: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { userId: string };
      userId = payload.userId;
    } catch { /* token inválido o expirado — se registra como anónimo */ }
  }

  try {
    // Solo registrar si el producto existe y está activo (evita ruido de slugs inválidos)
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM products WHERE id = ? AND is_active = 1 LIMIT 1",
      [productId]
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    await db.query(
      `INSERT INTO product_views (id, product_id, user_id, ip_address, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [randomUUID(), productId, userId, req.ip ?? null]
    );

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error("[Catalog] Error registrando visita:", error);
    res.status(500).json({ error: "Error al registrar la visita" });
  }
});
