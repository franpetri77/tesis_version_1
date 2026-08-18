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
// GET    /auth/notifications           - listar notificaciones del usuario
// PATCH  /auth/notifications/read-all  - marcar todas como leídas
// PATCH  /auth/notifications/:id/read  - marcar una notificación como leída
// =============================================

import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID, randomBytes, createHash } from "crypto";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/mailer";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "tele-import-dev-secret-2024";
const JWT_EXPIRES_IN = "7d"; // Token válido por 7 días
const FRONTEND_URL = (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");

// -----------------------------------------------
// Helpers de tokens de un solo uso (verificación / reseteo)
// Se guarda solo el hash sha256; el token en claro viaja en el email.
// -----------------------------------------------
function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Crea un token en la DB y devuelve el valor en claro para el email. */
async function createAuthToken(
  userId: string,
  type: "verify_email" | "reset_password",
  ttlMinutes: number
): Promise<string> {
  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  // Invalidar tokens previos del mismo tipo para este usuario
  await db.query("DELETE FROM auth_tokens WHERE user_id = ? AND type = ?", [userId, type]);
  await db.query(
    `INSERT INTO auth_tokens (id, user_id, token_hash, type, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [randomUUID(), userId, hash, type, expiresAt]
  );
  return raw;
}

// -----------------------------------------------
// Validaciones de credenciales (compartidas)
// -----------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Devuelve un mensaje de error si el email es inválido, o null si es válido. */
function validateEmail(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return "El email es requerido";
  const email = raw.trim().toLowerCase();
  if (email.length > 255) return "El email es demasiado largo";
  if (!EMAIL_REGEX.test(email)) return "El email no tiene un formato válido";
  return null;
}

/**
 * Devuelve un mensaje de error si la contraseña no cumple la política, o null.
 * Política: 8–72 caracteres, al menos una letra y un número.
 * (72 es el límite efectivo de bcrypt; más allá se truncaría silenciosamente.)
 */
function validatePassword(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return "La contraseña es requerida";
  if (raw.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (raw.length > 72) return "La contraseña no puede superar los 72 caracteres";
  if (!/[a-zA-Z]/.test(raw)) return "La contraseña debe incluir al menos una letra";
  if (!/[0-9]/.test(raw)) return "La contraseña debe incluir al menos un número";
  return null;
}

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
  email_verified: number;
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

  // Nombre y apellido requeridos
  if (typeof first_name !== "string" || !first_name.trim() ||
      typeof last_name !== "string" || !last_name.trim()) {
    res.status(400).json({ error: "Nombre y apellido son requeridos" });
    return;
  }

  // Validación de email
  const emailError = validateEmail(email);
  if (emailError) {
    res.status(400).json({ error: emailError });
    return;
  }

  // Validación de contraseña
  const passwordError = validatePassword(password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const normalizedEmail = (email as string).trim().toLowerCase();

  try {
    // Verificar si el email ya existe
    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existing.length > 0) {
      res.status(409).json({ error: "Ya existe una cuenta con ese email" });
      return;
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    // Generar UUID en la app para evitar dependencia del DEFAULT de la DB
    const newUserId = randomUUID();

    try {
      await db.query(
        `INSERT INTO users (id, email, password, first_name, last_name, phone, role)
         VALUES (?, ?, ?, ?, ?, ?, 'customer')`,
        [newUserId, normalizedEmail, hashedPassword, first_name.trim(), last_name.trim(), phone ?? null]
      );
    } catch (insertErr) {
      // Race condition: dos registros simultáneos con el mismo email.
      // El UNIQUE KEY de la DB lo bloquea → devolvemos 409 amigable.
      if ((insertErr as { code?: string }).code === "ER_DUP_ENTRY") {
        res.status(409).json({ error: "Ya existe una cuenta con ese email" });
        return;
      }
      throw insertErr;
    }

    // Recuperar el usuario creado usando el UUID conocido
    const [newRows] = await db.query<DbUser[]>(
      "SELECT id, email, first_name, last_name, phone, role, email_verified, created_at FROM users WHERE id = ?",
      [newUserId]
    );
    const newUser = newRows[0];

    const token = jwt.sign({ userId: newUser.id, role: "customer" }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // Enviar email de verificación (no bloquea el registro si falla el envío).
    try {
      const verifyToken = await createAuthToken(newUserId, "verify_email", 24 * 60);
      await sendVerificationEmail(normalizedEmail, verifyToken, first_name.trim());
    } catch (mailErr) {
      console.error("[Auth] No se pudo enviar el email de verificación:", mailErr);
    }

    res.status(201).json({ data: { user: newUser, access_token: token } });
  } catch (error) {
    console.error("[Auth] Error en register:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// GET /auth/verify-email?token=...
// Marca el email como verificado y redirige al frontend.
// (Es GET para que funcione al hacer clic directo desde el correo.)
// -----------------------------------------------
authRouter.get("/verify-email", async (req, res) => {
  const raw = typeof req.query.token === "string" ? req.query.token : "";
  const redirect = (status: string) =>
    res.redirect(`${FRONTEND_URL}/verificar-email?status=${status}`);

  if (!raw) return redirect("invalid");

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id, user_id, expires_at, used_at FROM auth_tokens
       WHERE token_hash = ? AND type = 'verify_email' LIMIT 1`,
      [hashToken(raw)]
    );
    const tk = rows[0];

    if (!tk || tk.used_at || new Date(tk.expires_at) < new Date()) {
      return redirect("invalid");
    }

    await db.query("UPDATE users SET email_verified = 1 WHERE id = ?", [tk.user_id]);
    await db.query("UPDATE auth_tokens SET used_at = NOW() WHERE id = ?", [tk.id]);
    return redirect("ok");
  } catch (error) {
    console.error("[Auth] Error en verify-email:", error);
    return redirect("error");
  }
});

// -----------------------------------------------
// POST /auth/resend-verification
// Body: { email }. Reenvía el email de verificación si corresponde.
// Responde 200 siempre (no revela si el email existe).
// -----------------------------------------------
authRouter.post("/resend-verification", async (req, res) => {
  const emailError = validateEmail(req.body?.email);
  if (emailError) {
    res.status(400).json({ error: emailError });
    return;
  }
  const normalizedEmail = (req.body.email as string).trim().toLowerCase();

  try {
    const [rows] = await db.query<DbUser[]>(
      "SELECT id, first_name, email_verified FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );
    const user = rows[0];
    if (user && !user.email_verified) {
      const verifyToken = await createAuthToken(user.id, "verify_email", 24 * 60);
      await sendVerificationEmail(normalizedEmail, verifyToken, user.first_name);
    }
    res.json({ data: { sent: true } });
  } catch (error) {
    console.error("[Auth] Error en resend-verification:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// POST /auth/forgot-password
// Body: { email }. Envía el email de reseteo si la cuenta existe.
// Responde 200 siempre para no revelar qué emails están registrados.
// -----------------------------------------------
authRouter.post("/forgot-password", async (req, res) => {
  const emailError = validateEmail(req.body?.email);
  if (emailError) {
    res.status(400).json({ error: emailError });
    return;
  }
  const normalizedEmail = (req.body.email as string).trim().toLowerCase();

  try {
    const [rows] = await db.query<DbUser[]>(
      "SELECT id, first_name FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );
    const user = rows[0];
    if (user) {
      const resetToken = await createAuthToken(user.id, "reset_password", 60);
      await sendPasswordResetEmail(normalizedEmail, resetToken, user.first_name);
    }
    // Respuesta uniforme exista o no la cuenta
    res.json({ data: { sent: true } });
  } catch (error) {
    console.error("[Auth] Error en forgot-password:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// -----------------------------------------------
// POST /auth/reset-password
// Body: { token, password }. Valida el token y actualiza la contraseña.
// -----------------------------------------------
authRouter.post("/reset-password", async (req, res) => {
  const { token, password } = req.body ?? {};

  if (typeof token !== "string" || !token) {
    res.status(400).json({ error: "Token inválido" });
    return;
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id, user_id, expires_at, used_at FROM auth_tokens
       WHERE token_hash = ? AND type = 'reset_password' LIMIT 1`,
      [hashToken(token)]
    );
    const tk = rows[0];

    if (!tk || tk.used_at || new Date(tk.expires_at) < new Date()) {
      res.status(400).json({ error: "El enlace es inválido o expiró. Solicitá uno nuevo." });
      return;
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, tk.user_id]);
    await db.query("UPDATE auth_tokens SET used_at = NOW() WHERE id = ?", [tk.id]);
    // Invalidar cualquier otro token de reseteo pendiente del usuario
    await db.query(
      "DELETE FROM auth_tokens WHERE user_id = ? AND type = 'reset_password' AND used_at IS NULL",
      [tk.user_id]
    );

    res.json({ data: { reset: true } });
  } catch (error) {
    console.error("[Auth] Error en reset-password:", error);
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
      "SELECT id, email, first_name, last_name, phone, role, email_verified, created_at, updated_at FROM users WHERE id = ?",
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
      "SELECT id, email, first_name, last_name, phone, role, email_verified, created_at, updated_at FROM users WHERE id = ?",
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

// ===============================================
// NOTIFICACIONES INTERNAS
// ===============================================

interface DbNotification extends RowDataPacket {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: number;
  link: string | null;
  created_at: string;
}

// -----------------------------------------------
// GET /auth/notifications
// Devuelve las últimas 50 notificaciones del usuario
// con el conteo de no leídas en meta.
// -----------------------------------------------
authRouter.get("/notifications", requireAuth, async (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  try {
    const [rows] = await db.query<DbNotification[]>(
      `SELECT id, type, title, message, is_read, link, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    const unread_count = rows.filter((n) => n.is_read === 0).length;
    res.json({ data: rows, meta: { unread_count } });
  } catch (error) {
    console.error("[Auth] Error en GET /notifications:", error);
    res.status(500).json({ error: "Error al obtener las notificaciones" });
  }
});

// -----------------------------------------------
// PATCH /auth/notifications/read-all
// Marca todas las notificaciones del usuario como leídas.
// DEBE estar ANTES de /:id/read para que Express no
// interprete "read-all" como un :id.
// -----------------------------------------------
authRouter.patch("/notifications/read-all", requireAuth, async (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  try {
    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
      [userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("[Auth] Error en PATCH /notifications/read-all:", error);
    res.status(500).json({ error: "Error al actualizar las notificaciones" });
  }
});

// -----------------------------------------------
// PATCH /auth/notifications/:id/read
// Marca una notificación específica como leída.
// Valida que pertenezca al usuario autenticado.
// -----------------------------------------------
authRouter.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  const { id } = req.params;
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM notifications WHERE id = ? AND user_id = ? LIMIT 1",
      [id, userId]
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Notificación no encontrada" });
      return;
    }
    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ?",
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("[Auth] Error en PATCH /notifications/:id/read:", error);
    res.status(500).json({ error: "Error al marcar la notificación" });
  }
});
