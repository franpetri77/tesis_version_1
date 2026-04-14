// =============================================
// RUTA: ADMINISTRACIÓN (protegida - solo admins)
// Gestión de usuarios, productos y operaciones
// que requieren rol 'admin'.
// =============================================

import { Router, Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";
import { requireAuth } from "./auth";

export const adminRouter = Router();

// -----------------------------------------------
// Tipo extendido para el request con usuario
// -----------------------------------------------
interface AuthRequest extends Request {
  user: {
    userId: string;
    role: string;
  };
}

// -----------------------------------------------
// Middleware: verifica que el usuario sea admin
// Se aplica después de requireAuth
// -----------------------------------------------
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthRequest;
  if (authReq.user?.role !== "admin") {
    res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
    return;
  }
  next();
}

// Aplicar ambos middlewares a todas las rutas de admin
adminRouter.use(requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void);
adminRouter.use(requireAdmin);

// -----------------------------------------------
// Función auxiliar: genera un slug desde un texto
// Normaliza tildes, quita caracteres especiales
// -----------------------------------------------
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// -----------------------------------------------
// Tipos internos para las consultas
// -----------------------------------------------
interface DbProduct extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  compare_price: number | null;
  category_id: string;
  category_name: string | null;
  stock_quantity: number;
  brand: string | null;
  model: string | null;
  description: string | null;
  short_description: string | null;
  is_active: number;
  is_featured: number;
  created_at: string;
  updated_at: string;
}

interface DbImage extends RowDataPacket {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
}

interface ImageInput {
  url: string;
  alt?: string;
}

// =============================================
// SECCIÓN: GESTIÓN DE USUARIOS
// =============================================

// -----------------------------------------------
// GET /admin/users
// Lista todos los usuarios sin contraseña
// -----------------------------------------------
adminRouter.get("/users", async (_req, res) => {
  try {
    const [users] = await db.query<RowDataPacket[]>(
      `SELECT id, email, first_name, last_name, phone, role, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({ data: users });
  } catch (error) {
    console.error("[Admin] Error listando usuarios:", error);
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
});

// -----------------------------------------------
// PUT /admin/users/:id/role
// Actualiza el rol de un usuario
// Body: { role: 'admin' | 'customer' | 'readonly' }
// -----------------------------------------------
adminRouter.put("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body as { role: string };

    const validRoles = ["admin", "customer", "readonly"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: "Rol inválido. Debe ser: admin, customer o readonly" });
      return;
    }

    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    // NOW() reemplaza datetime('now') de SQLite
    await db.query(
      "UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?",
      [role, id]
    );

    const [updatedRows] = await db.query<RowDataPacket[]>(
      "SELECT id, email, first_name, last_name, phone, role, created_at, updated_at FROM users WHERE id = ?",
      [id]
    );

    res.json({ data: updatedRows[0] });
  } catch (error) {
    console.error("[Admin] Error actualizando rol:", error);
    res.status(500).json({ error: "Error al actualizar el rol del usuario" });
  }
});

// -----------------------------------------------
// DELETE /admin/users/:id
// Elimina un usuario (no puede eliminarse a sí mismo)
// -----------------------------------------------
adminRouter.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const authReq = req as unknown as AuthRequest;
    const currentUserId = authReq.user.userId;

    // Proteger contra auto-eliminación
    if (id === currentUserId) {
      res.status(400).json({ error: "No podés eliminar tu propia cuenta" });
      return;
    }

    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    await db.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("[Admin] Error eliminando usuario:", error);
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
});

// =============================================
// SECCIÓN: GESTIÓN DE PRODUCTOS
// =============================================

// -----------------------------------------------
// GET /admin/products/:id
// Obtiene un producto por ID con sus imágenes
// -----------------------------------------------
adminRouter.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [productRows] = await db.query<DbProduct[]>(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?
       LIMIT 1`,
      [id]
    );
    const product = productRows[0];

    if (!product) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const [images] = await db.query<DbImage[]>(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
      [id]
    );

    res.json({
      data: {
        ...product,
        is_active: Boolean(product.is_active),
        is_featured: Boolean(product.is_featured),
        images,
      },
    });
  } catch (error) {
    console.error("[Admin] Error obteniendo producto:", error);
    res.status(500).json({ error: "Error al obtener el producto" });
  }
});

// -----------------------------------------------
// POST /admin/products
// Crea un nuevo producto con sus imágenes
// -----------------------------------------------
adminRouter.post("/products", async (req, res) => {
  try {
    const {
      name,
      slug: slugInput,
      sku,
      price,
      compare_price,
      category_id,
      stock_quantity = 0,
      brand,
      model,
      description,
      short_description,
      is_featured = false,
      is_active = true,
      images = [],
    } = req.body as {
      name: string;
      slug?: string;
      sku: string;
      price: number;
      compare_price?: number;
      category_id: string;
      stock_quantity?: number;
      brand?: string;
      model?: string;
      description?: string;
      short_description?: string;
      is_featured?: boolean;
      is_active?: boolean;
      images?: ImageInput[];
    };

    // Validaciones básicas
    if (!name || !sku || !price || !category_id) {
      res.status(400).json({ error: "Nombre, SKU, precio y categoría son requeridos" });
      return;
    }

    // Generar slug si no viene
    const slug = slugInput?.trim() || slugify(name);

    // Verificar que SKU y slug sean únicos
    const [dupSku] = await db.query<RowDataPacket[]>(
      "SELECT id FROM products WHERE sku = ?",
      [sku]
    );
    if (dupSku.length > 0) {
      res.status(409).json({ error: "Ya existe un producto con ese SKU" });
      return;
    }

    const [dupSlug] = await db.query<RowDataPacket[]>(
      "SELECT id FROM products WHERE slug = ?",
      [slug]
    );
    if (dupSlug.length > 0) {
      res.status(409).json({ error: "Ya existe un producto con ese slug" });
      return;
    }

    // Generar UUID antes del INSERT para usarlo también en las imágenes
    const productId = randomUUID();

    // Insertar producto e imágenes en una transacción MySQL
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      await conn.query(
        `INSERT INTO products
           (id, name, slug, sku, price, compare_price, category_id, stock_quantity,
            brand, model, description, short_description, is_featured, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId, name, slug, sku, price,
          compare_price ?? null, category_id, stock_quantity,
          brand ?? null, model ?? null, description ?? null, short_description ?? null,
          is_featured ? 1 : 0, is_active ? 1 : 0,
        ]
      );

      // Insertar imágenes
      if (images.length > 0) {
        for (let idx = 0; idx < images.length; idx++) {
          const imgId = randomUUID();
          await conn.query(
            `INSERT INTO product_images (id, product_id, image_url, alt_text, sort_order)
             VALUES (?, ?, ?, ?, ?)`,
            [imgId, productId, images[idx].url, images[idx].alt ?? null, idx]
          );
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // Devolver el producto completo con imágenes
    const [productRows] = await db.query<DbProduct[]>(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`,
      [productId]
    );
    const [productImages] = await db.query<DbImage[]>(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
      [productId]
    );

    res.status(201).json({
      data: {
        ...productRows[0],
        is_active: Boolean(productRows[0].is_active),
        is_featured: Boolean(productRows[0].is_featured),
        images: productImages,
      },
    });
  } catch (error) {
    console.error("[Admin] Error creando producto:", error);
    res.status(500).json({ error: "Error al crear el producto" });
  }
});

// -----------------------------------------------
// PUT /admin/products/:id
// Actualiza un producto existente
// -----------------------------------------------
adminRouter.put("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug: slugInput,
      sku,
      price,
      compare_price,
      category_id,
      stock_quantity,
      brand,
      model,
      description,
      short_description,
      is_featured,
      is_active,
      images,
    } = req.body as {
      name?: string;
      slug?: string;
      sku?: string;
      price?: number;
      compare_price?: number;
      category_id?: string;
      stock_quantity?: number;
      brand?: string;
      model?: string;
      description?: string;
      short_description?: string;
      is_featured?: boolean;
      is_active?: boolean;
      images?: ImageInput[];
    };

    const [existingRows] = await db.query<DbProduct[]>(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );
    const existing = existingRows[0];

    if (!existing) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    // Generar slug si viene un nombre nuevo pero no un slug
    const newSlug = slugInput ?? (name ? slugify(name) : existing.slug);

    // Verificar unicidad de SKU si cambió
    if (sku && sku !== existing.sku) {
      const [dupSku] = await db.query<RowDataPacket[]>(
        "SELECT id FROM products WHERE sku = ? AND id != ?",
        [sku, id]
      );
      if (dupSku.length > 0) {
        res.status(409).json({ error: "Ya existe un producto con ese SKU" });
        return;
      }
    }

    // Verificar unicidad de slug si cambió
    if (newSlug !== existing.slug) {
      const [dupSlug] = await db.query<RowDataPacket[]>(
        "SELECT id FROM products WHERE slug = ? AND id != ?",
        [newSlug, id]
      );
      if (dupSlug.length > 0) {
        res.status(409).json({ error: "Ya existe un producto con ese slug" });
        return;
      }
    }

    // Actualizar producto e imágenes en transacción MySQL
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      // COALESCE preserva el valor actual cuando no se envía el campo
      await conn.query(
        `UPDATE products SET
           name              = COALESCE(?, name),
           slug              = ?,
           sku               = COALESCE(?, sku),
           price             = COALESCE(?, price),
           compare_price     = ?,
           category_id       = COALESCE(?, category_id),
           stock_quantity    = COALESCE(?, stock_quantity),
           brand             = ?,
           model             = ?,
           description       = ?,
           short_description = ?,
           is_featured       = COALESCE(?, is_featured),
           is_active         = COALESCE(?, is_active),
           updated_at        = NOW()
         WHERE id = ?`,
        [
          name ?? null,
          newSlug,
          sku ?? null,
          price ?? null,
          compare_price !== undefined ? compare_price : existing.compare_price,
          category_id ?? null,
          stock_quantity !== undefined ? stock_quantity : null,
          brand !== undefined ? brand : existing.brand,
          model !== undefined ? model : existing.model,
          description !== undefined ? description : existing.description,
          short_description !== undefined ? short_description : existing.short_description,
          is_featured !== undefined ? (is_featured ? 1 : 0) : null,
          is_active !== undefined ? (is_active ? 1 : 0) : null,
          id,
        ]
      );

      // Reemplazar imágenes si se enviaron
      if (images !== undefined) {
        await conn.query("DELETE FROM product_images WHERE product_id = ?", [id]);
        if (images.length > 0) {
          for (let idx = 0; idx < images.length; idx++) {
            const imgId = randomUUID();
            await conn.query(
              `INSERT INTO product_images (id, product_id, image_url, alt_text, sort_order)
               VALUES (?, ?, ?, ?, ?)`,
              [imgId, id, images[idx].url, images[idx].alt ?? null, idx]
            );
          }
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // Devolver el producto actualizado
    const [updatedRows] = await db.query<DbProduct[]>(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`,
      [id]
    );
    const [productImages] = await db.query<DbImage[]>(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
      [id]
    );

    res.json({
      data: {
        ...updatedRows[0],
        is_active: Boolean(updatedRows[0].is_active),
        is_featured: Boolean(updatedRows[0].is_featured),
        images: productImages,
      },
    });
  } catch (error) {
    console.error("[Admin] Error actualizando producto:", error);
    res.status(500).json({ error: "Error al actualizar el producto" });
  }
});

// -----------------------------------------------
// PATCH /admin/products/:id/toggle
// Activa o desactiva un producto (toggle is_active)
// -----------------------------------------------
adminRouter.patch("/products/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id, is_active FROM products WHERE id = ?",
      [id]
    );
    const product = rows[0] as { id: string; is_active: number } | undefined;

    if (!product) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    // Invertir el estado actual
    const newState = product.is_active ? 0 : 1;
    await db.query(
      "UPDATE products SET is_active = ?, updated_at = NOW() WHERE id = ?",
      [newState, id]
    );

    res.json({ data: { id, is_active: Boolean(newState) } });
  } catch (error) {
    console.error("[Admin] Error en toggle de producto:", error);
    res.status(500).json({ error: "Error al cambiar el estado del producto" });
  }
});

// -----------------------------------------------
// DELETE /admin/products/:id
// Elimina un producto (CASCADE elimina imágenes)
// -----------------------------------------------
adminRouter.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id FROM products WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    await db.query("DELETE FROM products WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("[Admin] Error eliminando producto:", error);
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
});
