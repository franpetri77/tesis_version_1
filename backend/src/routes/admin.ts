// =============================================
// RUTA: ADMINISTRACIÓN (protegida - solo admins)
// Gestión de usuarios, productos y operaciones
// que requieren rol 'admin'.
// =============================================

import { Router, Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";
import { classificationInput, saveClassification, attachClassification } from "../services/productClassification";
import { productSnapshot } from "../services/productSnapshot";
import { requireAuth } from "./auth";
import { requirePanelAccess } from "../middleware/roles";
import { OrderStatusError, allowedTransitions, changeOrderStatus, ORDER_STATUS_LABELS } from "../services/orderStatus";
import { promotionsRouter } from "./promotions";
import { productCsvRouter } from "./productCsv";
import { diffFields, logAudit, withTransaction } from "../services/audit";
import type { PoolConnection } from "mysql2/promise";
import { dispatch, notifyLowStock, notifyNewProduct, notifyPriceDrop } from "../services/notifications";
import { adminChatRouter } from "./chat";

const actorOf = (req: Request) => ({ userId: (req as unknown as AuthRequest).user?.userId ?? null, ip: req.ip ?? null });

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

// Autenticación y rol en todas las rutas de admin: el administrador puede
// todo; el rol de solo lectura, sólo consultar (middleware/roles.ts).
adminRouter.use(requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void);
adminRouter.use(requirePanelAccess);
adminRouter.use("/promotions", promotionsRouter);
// Importar/exportar CSV (T6b): antes de /products/:id para que "export" no se tome como id
adminRouter.use("/products", productCsvRouter);

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

// La foto de auditoría de un producto vive en services/productSnapshot.ts,
// compartida con la importación CSV (T6b).

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
// Protección del último administrador (T7)
// Siempre se bloquea primero el conjunto de administradores y después el
// usuario afectado: con ese orden fijo, dos admins que se quitan el rol al
// mismo tiempo se esperan en lugar de cruzarse, y el segundo ve el cambio
// del primero.
// -----------------------------------------------
class LastAdminError extends Error {}
const LAST_ADMIN_MESSAGE = "Es el único administrador: asigná otro administrador antes de quitarle el rol o eliminarlo.";

async function lockAdminIds(conn: PoolConnection): Promise<string[]> {
  const [rows] = await conn.query<RowDataPacket[]>("SELECT id FROM users WHERE role = 'admin' FOR UPDATE");
  return rows.map((r) => String(r.id));
}

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

    // Cambio de rol y auditoría en una sola transacción
    const updated = await withTransaction(async (conn) => {
      const admins = await lockAdminIds(conn);
      const [existing] = await conn.query<RowDataPacket[]>(
        "SELECT id, role FROM users WHERE id = ? FOR UPDATE",
        [id]
      );
      if (existing.length === 0) return null;
      if (existing[0]!.role === "admin" && role !== "admin" && admins.length <= 1) throw new LastAdminError();

      await conn.query(
        "UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?",
        [role, id]
      );
      if (existing[0]!.role !== role) {
        await logAudit({ action: "user_role", entityType: "user", entityId: String(id), ...actorOf(req),
          previous: { role: existing[0]!.role }, next: { role } }, conn);
      }
      const [updatedRows] = await conn.query<RowDataPacket[]>(
        "SELECT id, email, first_name, last_name, phone, role, created_at, updated_at FROM users WHERE id = ?",
        [id]
      );
      return updatedRows[0];
    });
    if (!updated) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.json({ data: updated });
  } catch (error) {
    if (error instanceof LastAdminError) {
      res.status(409).json({ error: LAST_ADMIN_MESSAGE });
      return;
    }
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

    // Baja y auditoría juntas: si el usuario tiene registros asociados, el
    // DELETE falla con ER_ROW_IS_REFERENCED_2 y no queda nada a medias
    const found = await withTransaction(async (conn) => {
      const admins = await lockAdminIds(conn);
      const [existing] = await conn.query<RowDataPacket[]>(
        "SELECT id, email, role FROM users WHERE id = ? FOR UPDATE",
        [id]
      );
      if (existing.length === 0) return false;
      if (existing[0]!.role === "admin" && admins.length <= 1) throw new LastAdminError();
      await conn.query("DELETE FROM users WHERE id = ?", [id]);
      await logAudit({ action: "user_delete", entityType: "user", entityId: String(id), ...actorOf(req),
        previous: { email: existing[0]!.email, role: existing[0]!.role } }, conn);
      return true;
    });
    if (!found) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    if (error instanceof LastAdminError) {
      res.status(409).json({ error: LAST_ADMIN_MESSAGE });
      return;
    }
    if ((error as { code?: string }).code === "ER_ROW_IS_REFERENCED_2") {
      res.status(409).json({ error: "El usuario tiene pedidos o registros asociados. Cambiale el rol en lugar de eliminarlo." });
      return;
    }
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
        ...await attachClassification(db,product),
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
  const extra = classificationInput.safeParse(req.body);
  if (!extra.success) { res.status(400).json({error:extra.error.issues[0].message}); return; }
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

    // Producto, imágenes y auditoría en una sola transacción MySQL
    await withTransaction(async (conn) => {
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

      await saveClassification(conn, productId, extra.data);
      await logAudit({ action: "product_create", entityType: "product", entityId: productId, ...actorOf(req),
        next: await productSnapshot(conn, productId) }, conn);
    });

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

    const created = productRows[0]!;
    if (created.is_active) dispatch(`producto nuevo ${productId}`, () => notifyNewProduct(productId));

    res.status(201).json({
      data: {
        ...await attachClassification(db,productRows[0]),
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
  const extra = classificationInput.safeParse(req.body);
  if (!extra.success) { res.status(400).json({error:extra.error.issues[0].message}); return; }
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

    // Producto, imágenes y auditoría en una sola transacción MySQL.
    // La foto "antes" se toma con la fila bloqueada, para que la auditoría
    // describa exactamente el cambio que hizo esta operación.
    const changes = await withTransaction(async (conn) => {
      const before = await productSnapshot(conn, String(id), true);
      if (!before) throw new Error("Producto eliminado durante la edición");

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

      await saveClassification(conn, String(id), extra.data);
      const after = (await productSnapshot(conn, String(id)))!;
      const diff = diffFields(before, after);
      if (diff) {
        await logAudit({ action: "product_update", entityType: "product", entityId: String(id), ...actorOf(req), ...diff }, conn);
      }
      return diff;
    });

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

    // Avisos sólo después del commit: un fallo acá no revierte la edición
    if (changes) {
      const prevPrice = Number(changes.previous.price), nextPrice = Number(changes.next.price);
      if ("price" in changes.next && nextPrice < prevPrice) {
        dispatch(`baja de precio ${id}`, () => notifyPriceDrop(String(id), prevPrice, nextPrice));
      }
      if ("stock_quantity" in changes.next) dispatch(`stock bajo ${id}`, () => notifyLowStock([String(id)]));
    }

    res.json({
      data: {
        ...await attachClassification(db,updatedRows[0]),
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

    // Invertir el estado y auditar en una sola transacción
    const newState = await withTransaction(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        "SELECT id, is_active FROM products WHERE id = ? FOR UPDATE",
        [id]
      );
      const product = rows[0] as { id: string; is_active: number } | undefined;
      if (!product) return null;

      const state = product.is_active ? 0 : 1;
      await conn.query(
        "UPDATE products SET is_active = ?, updated_at = NOW() WHERE id = ?",
        [state, id]
      );
      await logAudit({ action: "product_toggle", entityType: "product", entityId: String(id), ...actorOf(req),
        previous: { is_active: Boolean(product.is_active) }, next: { is_active: Boolean(state) } }, conn);
      return state;
    });
    if (newState === null) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }
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

    // Baja y auditoría en una sola transacción
    const found = await withTransaction(async (conn) => {
      const [existing] = await conn.query<RowDataPacket[]>(
        "SELECT id, name, sku FROM products WHERE id = ? FOR UPDATE",
        [id]
      );
      if (existing.length === 0) return false;
      await conn.query("DELETE FROM products WHERE id = ?", [id]);
      await logAudit({ action: "product_delete", entityType: "product", entityId: String(id), ...actorOf(req),
        previous: { name: existing[0]!.name, sku: existing[0]!.sku } }, conn);
      return true;
    });
    if (!found) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[Admin] Error eliminando producto:", error);
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
});

// ===============================================
// GESTIÓN DE RESEÑAS
// ===============================================

interface AdminReviewRow extends RowDataPacket {
  id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  user_name: string;
  rating: number;
  title: string | null;
  body: string;
  is_approved: number;
  created_at: string;
}

// -----------------------------------------------
// GET /admin/reviews?approved=0|1
// Lista reseñas con datos de producto y usuario
// -----------------------------------------------
adminRouter.get("/reviews", async (req, res) => {
  const approved = req.query.approved;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (approved === "0" || approved === "1") {
    conditions.push("r.is_approved = ?");
    params.push(Number(approved));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [rows] = await db.query<AdminReviewRow[]>(
      `SELECT r.id, r.product_id, p.name AS product_name,
              r.user_id,
              CONCAT(u.first_name, ' ', u.last_name) AS user_name,
              r.rating, r.title, r.body, r.is_approved, r.created_at
       FROM product_reviews r
       JOIN products p ON p.id = r.product_id
       JOIN users u ON u.id = r.user_id
       ${where}
       ORDER BY r.created_at DESC`,
      params
    );
    res.json({ data: rows });
  } catch (error) {
    console.error("[Admin] Error listando reseñas:", error);
    res.status(500).json({ error: "Error al obtener las reseñas" });
  }
});

// -----------------------------------------------
// PATCH /admin/reviews/:id/approve
// Aprueba o rechaza una reseña (toggle)
// -----------------------------------------------
adminRouter.patch("/reviews/:id/approve", async (req, res) => {
  const { id } = req.params;
  try {
    // Moderación y auditoría en una sola transacción
    const newState = await withTransaction(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        "SELECT id, is_approved FROM product_reviews WHERE id = ? LIMIT 1 FOR UPDATE",
        [id]
      );
      if (!rows[0]) return null;
      const state = rows[0].is_approved === 1 ? 0 : 1;
      await conn.query("UPDATE product_reviews SET is_approved = ? WHERE id = ?", [state, id]);
      await logAudit({ action: state ? "review_approve" : "review_hide", entityType: "review", entityId: String(id), ...actorOf(req),
        previous: { is_approved: Boolean(rows[0].is_approved) }, next: { is_approved: Boolean(state) } }, conn);
      return state;
    });
    if (newState === null) {
      res.status(404).json({ error: "Reseña no encontrada" });
      return;
    }
    res.json({ data: { id, is_approved: Boolean(newState) } });
  } catch (error) {
    console.error("[Admin] Error aprobando reseña:", error);
    res.status(500).json({ error: "Error al actualizar la reseña" });
  }
});

// -----------------------------------------------
// DELETE /admin/reviews/:id
// Elimina una reseña permanentemente
// -----------------------------------------------
adminRouter.delete("/reviews/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Borrado y auditoría en una sola transacción
    const found = await withTransaction(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        "SELECT id, product_id, rating FROM product_reviews WHERE id = ? LIMIT 1 FOR UPDATE",
        [id]
      );
      if (!rows[0]) return false;
      await conn.query("DELETE FROM product_reviews WHERE id = ?", [id]);
      await logAudit({ action: "review_delete", entityType: "review", entityId: String(id), ...actorOf(req),
        previous: { product_id: rows[0].product_id, rating: rows[0].rating } }, conn);
      return true;
    });
    if (!found) {
      res.status(404).json({ error: "Reseña no encontrada" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[Admin] Error eliminando reseña:", error);
    res.status(500).json({ error: "Error al eliminar la reseña" });
  }
});

// ===============================================
// AUDITORÍA
// ===============================================

interface AuditLogRow extends RowDataPacket {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  user_name: string | null;
  entity_name: string | null;
  previous_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string;
}

// -----------------------------------------------
// GET /admin/orders/:id
// Detalle del pedido para el panel: cliente, ítems, pagos, historial
// de estados y transiciones disponibles.
// -----------------------------------------------
adminRouter.get("/orders/:id", async (req, res) => {
  try {
    const [orders] = await db.query<RowDataPacket[]>(
      `SELECT o.id, o.order_number, o.status, o.subtotal, o.discount_amount, o.shipping_cost, o.total,
              o.delivery_method, o.shipping_address, o.notes, o.created_at, o.updated_at,
              o.payment_expires_at, u.email AS user_email, u.first_name AS user_first_name,
              u.last_name AS user_last_name, u.phone AS user_phone
       FROM orders o JOIN users u ON u.id = o.user_id
       WHERE o.id = ?`, [req.params.id]
    );
    const order = orders[0];
    if (!order) { res.status(404).json({ error: "Pedido no encontrado" }); return; }

    const [items] = await db.query<RowDataPacket[]>(
      `SELECT oi.id, oi.product_id, p.name AS product_name, p.sku, oi.quantity, oi.unit_price, oi.total_price
       FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ? ORDER BY p.name`, [order.id]
    );
    const [payments] = await db.query<RowDataPacket[]>(
      `SELECT id, mp_payment_id, status, amount, currency, created_at, updated_at
       FROM payments WHERE order_id = ? ORDER BY created_at`, [order.id]
    );
    const [history] = await db.query<RowDataPacket[]>(
      `SELECT a.id, a.previous_value, a.new_value, a.created_at, u.first_name, u.last_name, u.email
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
       WHERE a.entity_type = 'order' AND a.entity_id = ? AND a.action = 'order_status'
       ORDER BY a.created_at`, [order.id]
    );

    let address: unknown = null;
    try { address = order.shipping_address ? JSON.parse(String(order.shipping_address)) : null; } catch { address = order.shipping_address; }
    const parse = (v: unknown) => { try { return v ? JSON.parse(String(v)) : null; } catch { return null; } };

    res.json({
      data: {
        ...order,
        shipping_address: address,
        status_label: ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status,
        items,
        payments,
        history: history.map((h) => ({
          id: h.id,
          from: (parse(h.previous_value) as { status?: string } | null)?.status ?? null,
          to: (parse(h.new_value) as { status?: string } | null)?.status ?? null,
          note: (parse(h.new_value) as { note?: string } | null)?.note ?? null,
          by: h.email ? `${h.first_name ?? ""} ${h.last_name ?? ""}`.trim() || h.email : null,
          at: h.created_at,
        })),
        allowed_transitions: allowedTransitions(String(order.status), String(order.delivery_method))
          .map((s) => ({ status: s, label: ORDER_STATUS_LABELS[s] })),
      },
    });
  } catch (error) {
    console.error("[Admin] Error obteniendo detalle de pedido:", error);
    res.status(500).json({ error: "Error al obtener el pedido" });
  }
});

// -----------------------------------------------
// PATCH /admin/orders/:id/status  { status, note? }
// Cambia el estado con transiciones validadas y registro en auditoría.
// -----------------------------------------------
adminRouter.patch("/orders/:id/status", async (req, res) => {
  const body = (req.body ?? {}) as { status?: unknown; note?: unknown };
  if (typeof body.status !== "string" || (body.note !== undefined && body.note !== null && typeof body.note !== "string")) {
    res.status(400).json({ error: "Datos inválidos: se espera { status, note? }" });
    return;
  }
  try {
    const result = await changeOrderStatus({
      orderId: req.params.id!,
      next: body.status,
      note: (body.note as string | null | undefined) ?? null,
      actorId: (req as unknown as AuthRequest).user.userId,
      ip: req.ip ?? null,
    });
    res.json({ data: result });
  } catch (error) {
    if (error instanceof OrderStatusError) { res.status(error.status).json({ error: error.message }); return; }
    console.error("[Admin] Error cambiando estado de pedido:", error);
    res.status(500).json({ error: "Error al cambiar el estado del pedido" });
  }
});

// -----------------------------------------------
// GET /admin/audit-logs?action=&entity_type=&limit=50&offset=0
// Lista registros de auditoría con JOIN a usuarios
// y productos (cuando entity_type = 'product')
// -----------------------------------------------
adminRouter.get("/audit-logs", async (req, res) => {
  const { action, entity_type, user_id, entity_id, from, to } = req.query as Record<string, string | undefined>;
  const limit  = Math.min(Number(req.query.limit)  || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0,  0);

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (action)      { conditions.push("al.action = ?");      params.push(action); }
  if (entity_type) { conditions.push("al.entity_type = ?"); params.push(entity_type); }
  if (user_id)     { conditions.push("al.user_id = ?");     params.push(user_id); }
  if (entity_id)   { conditions.push("al.entity_id = ?");   params.push(entity_id); }
  // Fechas inclusivas (AAAA-MM-DD): desde el inicio del primer día hasta antes del día siguiente al último.
  const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
  if ((from && !isDay(from)) || (to && !isDay(to))) {
    res.status(400).json({ error: "Las fechas deben tener el formato AAAA-MM-DD" });
    return;
  }
  if (from) { conditions.push("al.created_at >= ?"); params.push(from); }
  if (to)   { conditions.push("al.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(to); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [[{ total }]] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM audit_logs al ${where}`,
      params
    );

    const [rows] = await db.query<AuditLogRow[]>(
      `SELECT
         al.id,
         al.action,
         al.entity_type,
         al.entity_id,
         al.user_id,
         CONCAT(u.first_name, ' ', u.last_name) AS user_name,
         COALESCE(p.name, o.order_number, CONCAT(eu.first_name, ' ', eu.last_name), pr.code) AS entity_name,
         al.previous_value,
         al.new_value,
         al.ip_address,
         al.created_at
       FROM audit_logs al
       LEFT JOIN users    u ON u.id = al.user_id
       LEFT JOIN products p ON p.id = al.entity_id AND al.entity_type = 'product'
       LEFT JOIN orders   o ON o.id = al.entity_id AND al.entity_type = 'order'
       LEFT JOIN users   eu ON eu.id = al.entity_id AND al.entity_type = 'user'
       LEFT JOIN promotions pr ON pr.id = al.entity_id AND al.entity_type = 'promotion'
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: rows,
      meta: { total: Number(total), limit, offset },
    });
  } catch (error) {
    console.error("[Admin] Error listando audit logs:", error);
    res.status(500).json({ error: "Error al obtener los registros de auditoría" });
  }
});

// T9: bandeja de mensajes de clientes (/admin/chat/...)
adminRouter.use("/chat", adminChatRouter);
