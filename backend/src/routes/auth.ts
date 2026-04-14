// =============================================
// RUTAS DE AUTENTICACIÓN Y CUENTA DE USUARIO
// POST   /auth/login                   - inicio de sesión
// POST   /auth/register                - registro de nuevo cliente
// GET    /auth/me                      - datos del usuario autenticado
// PATCH  /auth/me                      - actualizar datos del perfil
// GET    /auth/orders                  - listar pedidos del usuario
// GET    /auth/orders/:id              - detalle de un pedido
// GET    /auth/addresses               - listar direcciones del usuario
// POST   /auth/addresses               - crear nueva dirección
// PUT    /auth/addresses/:id           - actualizar una dirección
// DELETE /auth/addresses/:id           - eliminar una dirección
// PATCH  /auth/addresses/:id/default   - marcar como dirección predeterminada
// =============================================

import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "tele-import-dev-secret-2024";
const JWT_EXPIRES_IN = "7d"; // Token válido por 7 días

// -----------------------------------------------
// Tipos internos
// -----------------------------------------------
interface DbUser extends RowDataPacket {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

interface DbOrder extends RowDataPacket {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  delivery_method: string;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface DbAddress extends RowDataPacket {
  id: string;
  user_id: string;
  street: string;
  number: string;
  floor: string | null;
  apartment: string | null;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  is_default: number;
  created_at: string;
}

// -----------------------------------------------
// Middleware: verifica JWT y adjunta el usuario al request
// -----------------------------------------------
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de autenticación requerido" });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    (req as Request & { user: typeof payload }).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// -----------------------------------------------
// POST /auth/login
// Body: { email, password }
// -----------------------------------------------
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email y contraseña son requeridos" });
    return;
  }

  try {
    const [rows] = await db.query<DbUser[]>(
      "SELECT * FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // Devolver datos del usuario sin la contraseña
    const { password: _pw, ...userWithoutPassword } = user;
    res.json({ data: { user: userWithoutPassword, access_token: token } });
  } catch (error) {
    console.error("[Auth] Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// POST /auth/register
// Body: { email, password, first_name, last_name, phone? }
// -----------------------------------------------
authRouter.post("/register", async (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body;

  if (!email || !password || !first_name || !last_name) {
    res.status(400).json({ error: "Nombre, apellido, email y contraseña son requeridos" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    return;
  }

  try {
    // Verificar si el email ya existe
    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );

    if (existing.length > 0) {
      res.status(409).json({ error: "Ya existe una cuenta con ese email" });
      return;
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    // Generar UUID en la app para evitar dependencia del DEFAULT de la DB
    const newUserId = randomUUID();

    await db.query(
      `INSERT INTO users (id, email, password, first_name, last_name, phone, role)
       VALUES (?, ?, ?, ?, ?, ?, 'customer')`,
      [newUserId, email.toLowerCase().trim(), hashedPassword, first_name, last_name, phone ?? null]
    );

    // Recuperar el usuario creado usando el UUID conocido
    const [newRows] = await db.query<DbUser[]>(
      "SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE id = ?",
      [newUserId]
    );
    const newUser = newRows[0];

    const token = jwt.sign({ userId: newUser.id, role: "customer" }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.status(201).json({ data: { user: newUser, access_token: token } });
  } catch (error) {
    console.error("[Auth] Error en register:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// GET /auth/me
// Header: Authorization: Bearer <token>
// -----------------------------------------------
authRouter.get("/me", requireAuth, async (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;

  try {
    const [rows] = await db.query<DbUser[]>(
      "SELECT id, email, first_name, last_name, phone, role, created_at, updated_at FROM users WHERE id = ?",
      [userId]
    );
    const user = rows[0];

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.json({ data: user });
  } catch (error) {
    console.error("[Auth] Error en /me:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// PATCH /auth/me - actualizar nombre, apellido y teléfono
// Body: { first_name, last_name, phone? }
// -----------------------------------------------
authRouter.patch("/me", requireAuth, async (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  const { first_name, last_name, phone } = req.body as {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };

  if (!first_name?.trim() || !last_name?.trim()) {
    res.status(400).json({ error: "Nombre y apellido son requeridos" });
    return;
  }

  try {
    // NOW() reemplaza datetime('now') de SQLite
    await db.query(
      `UPDATE users SET first_name = ?, last_name = ?, phone = ?, updated_at = NOW() WHERE id = ?`,
      [first_name.trim(), last_name.trim(), phone?.trim() ?? null, userId]
    );

    const [rows] = await db.query<DbUser[]>(
      "SELECT id, email, first_name, last_name, phone, role, created_at, updated_at FROM users WHERE id = ?",
      [userId]
    );

    res.json({ data: rows[0] });
  } catch (error) {
    console.error("[Auth] Error en PATCH /me:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// GET /auth/orders - pedidos del usuario autenticado
// -----------------------------------------------
authRouter.get("/orders", requireAuth, async (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;

  try {
    const [orders] = await db.query<DbOrder[]>(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    // Para cada pedido se obtienen los ítems con nombre del producto
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await db.query<RowDataPacket[]>(
          `SELECT oi.*, p.name AS product_name, p.slug AS product_slug
           FROM order_items oi
           JOIN products p ON p.id = oi.product_id
           WHERE oi.order_id = ?`,
          [order.id]
        );
        return { ...order, items };
      })
    );

    res.json({ data: ordersWithItems });
  } catch (error) {
    console.error("[Auth] Error en GET /orders:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// GET /auth/orders/:id - detalle completo de un pedido
// -----------------------------------------------
authRouter.get("/orders/:id", requireAuth, async (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  const { id } = req.params;

  try {
    const [orderRows] = await db.query<DbOrder[]>(
      "SELECT * FROM orders WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    const order = orderRows[0];

    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    // Ítems enriquecidos con imagen y datos del producto
    const [items] = await db.query<RowDataPacket[]>(
      `SELECT oi.*,
              p.name  AS product_name,
              p.slug  AS product_slug,
              p.sku   AS product_sku,
              (SELECT image_url FROM product_images
               WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS product_image
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [id]
    );

    res.json({ data: { ...order, items } });
  } catch (error) {
    console.error("[Auth] Error en GET /orders/:id:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// GET /auth/addresses - listar direcciones del usuario
// -----------------------------------------------
authRouter.get("/addresses", requireAuth, async (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;

  try {
    // Nota: MySQL no tiene rowid; se ordena por is_default DESC y created_at como proxy de orden de inserción
    const [addresses] = await db.query<DbAddress[]>(
      "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at ASC",
      [userId]
    );
    res.json({ data: addresses });
  } catch (error) {
    console.error("[Auth] Error en GET /addresses:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// POST /auth/addresses - crear nueva dirección
// Body: { street, number, floor?, apartment?, city, province, postal_code, country?, is_default? }
// -----------------------------------------------
authRouter.post("/addresses", requireAuth, async (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  const { street, number, floor, apartment, city, province, postal_code, country, is_default } =
    req.body as Partial<DbAddress>;

  if (!street || !number || !city || !province || !postal_code) {
    res.status(400).json({
      error: "Calle, número, ciudad, provincia y código postal son requeridos",
    });
    return;
  }

  try {
    // Si se marca como predeterminada, quitar el flag de las demás
    if (is_default) {
      await db.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId]);
    }

    const newAddressId = randomUUID();

    await db.query(
      `INSERT INTO addresses (id, user_id, street, number, floor, apartment, city, province, postal_code, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newAddressId,
        userId,
        (street as string).trim(),
        (number as string).trim(),
        typeof floor === "string" ? floor.trim() : null,
        typeof apartment === "string" ? apartment.trim() : null,
        (city as string).trim(),
        (province as string).trim(),
        (postal_code as string).trim(),
        typeof country === "string" ? country.trim() : "Argentina",
        is_default ? 1 : 0,
      ]
    );

    // Recuperar la dirección creada usando el UUID conocido
    const [rows] = await db.query<DbAddress[]>(
      "SELECT * FROM addresses WHERE id = ?",
      [newAddressId]
    );
    res.status(201).json({ data: rows[0] });
  } catch (error) {
    console.error("[Auth] Error en POST /addresses:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// PUT /auth/addresses/:id - actualizar una dirección existente
// -----------------------------------------------
authRouter.put("/addresses/:id", requireAuth, async (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  const { id } = req.params;
  const { street, number, floor, apartment, city, province, postal_code, country, is_default } =
    req.body as Partial<DbAddress>;

  if (!street || !number || !city || !province || !postal_code) {
    res.status(400).json({
      error: "Calle, número, ciudad, provincia y código postal son requeridos",
    });
    return;
  }

  try {
    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id FROM addresses WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (existing.length === 0) {
      res.status(404).json({ error: "Dirección no encontrada" });
      return;
    }

    if (is_default) {
      await db.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId]);
    }

    await db.query(
      `UPDATE addresses
       SET street = ?, number = ?, floor = ?, apartment = ?, city = ?, province = ?, postal_code = ?, country = ?, is_default = ?
       WHERE id = ? AND user_id = ?`,
      [
        (street as string).trim(),
        (number as string).trim(),
        typeof floor === "string" ? floor.trim() : null,
        typeof apartment === "string" ? apartment.trim() : null,
        (city as string).trim(),
        (province as string).trim(),
        (postal_code as string).trim(),
        typeof country === "string" ? country.trim() : "Argentina",
        is_default ? 1 : 0,
        id,
        userId,
      ]
    );

    const [rows] = await db.query<DbAddress[]>(
      "SELECT * FROM addresses WHERE id = ?",
      [id]
    );
    res.json({ data: rows[0] });
  } catch (error) {
    console.error("[Auth] Error en PUT /addresses/:id:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// DELETE /auth/addresses/:id - eliminar una dirección
// -----------------------------------------------
authRouter.delete("/addresses/:id", requireAuth, async (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  const { id } = req.params;

  try {
    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id FROM addresses WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (existing.length === 0) {
      res.status(404).json({ error: "Dirección no encontrada" });
      return;
    }

    await db.query("DELETE FROM addresses WHERE id = ? AND user_id = ?", [id, userId]);
    res.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[Auth] Error en DELETE /addresses/:id:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// PATCH /auth/addresses/:id/default - marcar como predeterminada
// -----------------------------------------------
authRouter.patch("/addresses/:id/default", requireAuth, async (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  const { id } = req.params;

  try {
    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id FROM addresses WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (existing.length === 0) {
      res.status(404).json({ error: "Dirección no encontrada" });
      return;
    }

    // Quitar flag de todas y poner en la seleccionada
    await db.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId]);
    await db.query("UPDATE addresses SET is_default = 1 WHERE id = ?", [id]);

    const [addresses] = await db.query<DbAddress[]>(
      "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at ASC",
      [userId]
    );

    res.json({ data: addresses });
  } catch (error) {
    console.error("[Auth] Error en PATCH /addresses/:id/default:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
