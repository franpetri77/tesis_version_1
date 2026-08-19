// =============================================
// RUTAS: SOLICITUDES DE PRESUPUESTO
// POST   /quotes             - alta pública (no requiere cuenta)
// GET    /quotes             - listado (solo admin)
// PATCH  /quotes/:id/status  - cambio de estado (solo admin)
//
// El formulario está pensado para empresas y revendedores que
// consultan por compras al por mayor, de modo que el alta es
// pública: exigir registro previo desalentaría la consulta.
// =============================================

import { Router, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import jwt from "jsonwebtoken";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";
import { requireAuth } from "./auth";

export const quotesRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "tele-import-dev-secret-2024";

interface AuthRequest extends Request {
  user: { userId: string; role: string };
}
const castAuth = requireAuth as unknown as (
  req: Request, res: Response, next: NextFunction
) => void;

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if ((req as AuthRequest).user?.role !== "admin") {
    res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
    return;
  }
  next();
}

// -----------------------------------------------
// Validación del formulario público
// -----------------------------------------------
const quoteSchema = z.object({
  company:       z.string().trim().max(255).optional().or(z.literal("")),
  contact_name:  z.string().trim().min(2, "Ingresá tu nombre").max(150),
  email:         z.string().trim().email("Correo electrónico inválido").max(255),
  phone:         z.string().trim().max(50).optional().or(z.literal("")),
  tax_id:        z.string().trim().max(50).optional().or(z.literal("")),
  products:      z.string().trim().min(5, "Contanos qué productos necesitás").max(4000),
  estimated_qty: z.coerce.number().int().positive().max(1_000_000).optional(),
  message:       z.string().trim().max(4000).optional().or(z.literal("")),
});

interface QuoteRow extends RowDataPacket {
  id: string;
  company: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  tax_id: string | null;
  products: string;
  estimated_qty: number | null;
  message: string | null;
  status: string;
  user_id: string | null;
  created_at: string;
}

/**
 * Extrae el id de usuario del token si viene, sin exigirlo.
 * Permite asociar la solicitud a la cuenta cuando el visitante
 * está autenticado, sin bloquear a quien no lo está.
 */
function usuarioOpcional(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId?: string };
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

// -----------------------------------------------
// POST /quotes — crear solicitud (público)
// -----------------------------------------------
quotesRouter.post("/", async (req: Request, res: Response) => {
  const parsed = quoteSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Datos inválidos",
      detalles: parsed.error.issues.map((i) => ({
        campo: i.path.join("."),
        mensaje: i.message,
      })),
    });
    return;
  }

  const d = parsed.data;
  const id = randomUUID();

  try {
    await db.query(
      `INSERT INTO quote_requests
         (id, company, contact_name, email, phone, tax_id, products, estimated_qty, message, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        d.company || null,
        d.contact_name,
        d.email,
        d.phone || null,
        d.tax_id || null,
        d.products,
        d.estimated_qty ?? null,
        d.message || null,
        usuarioOpcional(req),
      ]
    );

    res.status(201).json({
      data: {
        id,
        mensaje: "Solicitud recibida. Te vamos a contactar a la brevedad.",
      },
    });
  } catch (error) {
    console.error("[Quotes] Error al crear solicitud:", error);
    res.status(500).json({ error: "No se pudo registrar la solicitud" });
  }
});

// -----------------------------------------------
// GET /quotes — listado para administración
// -----------------------------------------------
quotesRouter.get("/", castAuth, requireAdmin, async (req: Request, res: Response) => {
  const estado = typeof req.query.status === "string" ? req.query.status : null;
  const limite = Math.min(Number(req.query.limit) || 50, 200);

  try {
    const condicion = estado ? "WHERE status = ?" : "";
    const params = estado ? [estado, limite] : [limite];

    const [filas] = await db.query<QuoteRow[]>(
      `SELECT * FROM quote_requests ${condicion} ORDER BY created_at DESC LIMIT ?`,
      params
    );

    const [conteos] = await db.query<RowDataPacket[]>(
      "SELECT status, COUNT(*) AS total FROM quote_requests GROUP BY status"
    );

    res.json({ data: filas, resumen: conteos });
  } catch (error) {
    console.error("[Quotes] Error al listar solicitudes:", error);
    res.status(500).json({ error: "No se pudieron obtener las solicitudes" });
  }
});

// -----------------------------------------------
// PATCH /quotes/:id/status — cambiar estado
// -----------------------------------------------
const ESTADOS = ["pending", "in_review", "quoted", "closed"] as const;

quotesRouter.patch("/:id/status", castAuth, requireAdmin, async (req: Request, res: Response) => {
  const { status } = req.body as { status?: string };

  if (!status || !ESTADOS.includes(status as (typeof ESTADOS)[number])) {
    res.status(400).json({ error: `Estado inválido. Valores admitidos: ${ESTADOS.join(", ")}` });
    return;
  }

  try {
    const [r] = await db.query(
      "UPDATE quote_requests SET status = ? WHERE id = ?",
      [status, req.params.id]
    );

    if ((r as { affectedRows: number }).affectedRows === 0) {
      res.status(404).json({ error: "Solicitud no encontrada" });
      return;
    }

    res.json({ data: { id: req.params.id, status } });
  } catch (error) {
    console.error("[Quotes] Error al actualizar estado:", error);
    res.status(500).json({ error: "No se pudo actualizar la solicitud" });
  }
});
