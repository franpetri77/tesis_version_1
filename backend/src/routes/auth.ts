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
import db from "../db/database";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "tele-import-dev-secret-2024";
const JWT_EXPIRES_IN = "7d"; // Token válido por 7 días

// -----------------------------------------------
// Tipos internos
// -----------------------------------------------
interface DbUser {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  created_at: string;
}

interface DbOrder {
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

interface DbAddress {
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
authRouter.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email y contraseña son requeridos" });
    return;
  }

  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase().trim()) as DbUser | undefined;

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
});

// -----------------------------------------------
// POST /auth/register
// Body: { email, password, first_name, last_name, phone? }
// -----------------------------------------------
authRouter.post("/register", (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body;

  if (!email || !password || !first_name || !last_name) {
    res.status(400).json({ error: "Nombre, apellido, email y contraseña son requeridos" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    return;
  }

  // Verificar si el email ya existe
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email.toLowerCase().trim());

  if (existing) {
    res.status(409).json({ error: "Ya existe una cuenta con ese email" });
    return;
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const info = db
    .prepare(
      `INSERT INTO users (email, password, first_name, last_name, phone, role)
       VALUES (?, ?, ?, ?, ?, 'customer')`
    )
    .run(email.toLowerCase().trim(), hashedPassword, first_name, last_name, phone ?? null);

  // Obtener el usuario recién creado
  const newUser = db
    .prepare("SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE rowid = ?")
    .get(info.lastInsertRowid) as Omit<DbUser, "password">;

  const token = jwt.sign({ userId: newUser.id, role: "customer" }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.status(201).json({ data: { user: newUser, access_token: token } });
});

// -----------------------------------------------
// GET /auth/me
// Header: Authorization: Bearer <token>
// -----------------------------------------------
authRouter.get("/me", requireAuth, (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;

  const user = db
    .prepare(
      "SELECT id, email, first_name, last_name, phone, role, created_at, updated_at FROM users WHERE id = ?"
    )
    .get(userId);

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  res.json({ data: user });
});

// -----------------------------------------------
// PATCH /auth/me - actualizar nombre, apellido y teléfono
// Body: { first_name, last_name, phone? }
// -----------------------------------------------
authRouter.patch("/me", requireAuth, (req, res) => {
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

  db.prepare(
    `UPDATE users SET first_name = ?, last_name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(first_name.trim(), last_name.trim(), phone?.trim() ?? null, userId);

  const user = db
    .prepare(
      "SELECT id, email, first_name, last_name, phone, role, created_at, updated_at FROM users WHERE id = ?"
    )
    .get(userId);

  res.json({ data: user });
});

// -----------------------------------------------
// GET /auth/orders - pedidos del usuario autenticado
// -----------------------------------------------
authRouter.get("/orders", requireAuth, (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;

  const orders = db
    .prepare(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId) as DbOrder[];

  // Para cada pedido se obtienen los ítems con nombre del producto
  const ordersWithItems = orders.map((order) => {
    const items = db
      .prepare(
        `SELECT oi.*, p.name AS product_name, p.slug AS product_slug
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`
      )
      .all(order.id);
    return { ...order, items };
  });

  res.json({ data: ordersWithItems });
});

// -----------------------------------------------
// GET /auth/orders/:id - detalle completo de un pedido
// -----------------------------------------------
authRouter.get("/orders/:id", requireAuth, (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  const { id } = req.params;

  const order = db
    .prepare(`SELECT * FROM orders WHERE id = ? AND user_id = ?`)
    .get(id, userId) as DbOrder | undefined;

  if (!order) {
    res.status(404).json({ error: "Pedido no encontrado" });
    return;
  }

  // Ítems enriquecidos con imagen y datos del producto
  const items = db
    .prepare(
      `SELECT oi.*,
              p.name  AS product_name,
              p.slug  AS product_slug,
              p.sku   AS product_sku,
              (SELECT image_url FROM product_images
               WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS product_image
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`
    )
    .all(id);

  res.json({ data: { ...order, items } });
});

// -----------------------------------------------
// GET /auth/addresses - listar direcciones del usuario
// -----------------------------------------------
authRouter.get("/addresses", requireAuth, (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;

  const addresses = db
    .prepare(
      `SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, rowid ASC`
    )
    .all(userId);

  res.json({ data: addresses });
});

// -----------------------------------------------
// POST /auth/addresses - crear nueva dirección
// Body: { street, number, floor?, apartment?, city, province, postal_code, country?, is_default? }
// -----------------------------------------------
authRouter.post("/addresses", requireAuth, (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  const { street, number, floor, apartment, city, province, postal_code, country, is_default } =
    req.body as Partial<DbAddress>;

  if (!street || !number || !city || !province || !postal_code) {
    res.status(400).json({
      error: "Calle, número, ciudad, provincia y código postal son requeridos",
    });
    return;
  }

  // Si se marca como predeterminada, quitar el flag de las demás
  if (is_default) {
    db.prepare(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`).run(userId);
  }

  const info = db
    .prepare(
      `INSERT INTO addresses (user_id, street, number, floor, apartment, city, province, postal_code, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      street.trim(),
      number.trim(),
      floor?.trim() ?? null,
      apartment?.trim() ?? null,
      city.trim(),
      province.trim(),
      postal_code.trim(),
      country?.trim() ?? "Argentina",
      is_default ? 1 : 0
    );

  const address = db.prepare(`SELECT * FROM addresses WHERE rowid = ?`).get(info.lastInsertRowid);
  res.status(201).json({ data: address });
});

// -----------------------------------------------
// PUT /auth/addresses/:id - actualizar una dirección existente
// -----------------------------------------------
authRouter.put("/addresses/:id", requireAuth, (req, res) => {
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

  const existing = db
    .prepare(`SELECT id FROM addresses WHERE id = ? AND user_id = ?`)
    .get(id, userId);

  if (!existing) {
    res.status(404).json({ error: "Dirección no encontrada" });
    return;
  }

  if (is_default) {
    db.prepare(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`).run(userId);
  }

  db.prepare(
    `UPDATE addresses
     SET street = ?, number = ?, floor = ?, apartment = ?, city = ?, province = ?, postal_code = ?, country = ?, is_default = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    street.trim(),
    number.trim(),
    floor?.trim() ?? null,
    apartment?.trim() ?? null,
    city.trim(),
    province.trim(),
    postal_code.trim(),
    country?.trim() ?? "Argentina",
    is_default ? 1 : 0,
    id,
    userId
  );

  const address = db.prepare(`SELECT * FROM addresses WHERE id = ?`).get(id);
  res.json({ data: address });
});

// -----------------------------------------------
// DELETE /auth/addresses/:id - eliminar una dirección
// -----------------------------------------------
authRouter.delete("/addresses/:id", requireAuth, (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  const { id } = req.params;

  const existing = db
    .prepare(`SELECT id FROM addresses WHERE id = ? AND user_id = ?`)
    .get(id, userId);

  if (!existing) {
    res.status(404).json({ error: "Dirección no encontrada" });
    return;
  }

  db.prepare(`DELETE FROM addresses WHERE id = ? AND user_id = ?`).run(id, userId);
  res.json({ data: { deleted: true } });
});

// -----------------------------------------------
// PATCH /auth/addresses/:id/default - marcar como predeterminada
// -----------------------------------------------
authRouter.patch("/addresses/:id/default", requireAuth, (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  const { id } = req.params;

  const existing = db
    .prepare(`SELECT id FROM addresses WHERE id = ? AND user_id = ?`)
    .get(id, userId);

  if (!existing) {
    res.status(404).json({ error: "Dirección no encontrada" });
    return;
  }

  // Quitar flag de todas y poner en la seleccionada
  db.prepare(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`).run(userId);
  db.prepare(`UPDATE addresses SET is_default = 1 WHERE id = ?`).run(id);

  const addresses = db
    .prepare(
      `SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, rowid ASC`
    )
    .all(userId);

  res.json({ data: addresses });
});
