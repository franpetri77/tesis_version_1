// =============================================
// MIDDLEWARE: ROLES DEL PANEL (T7)
// Un solo criterio para /admin, /reports y las rutas administrativas de
// /quotes (antes cada router tenía su propia copia de requireAdmin):
//   - admin:    acceso completo.
//   - readonly: ve todo el panel, pero sólo con métodos de lectura.
//   - customer: sin acceso.
// Se aplica después de requireAuth, que verifica el JWT (identidad y
// vencimiento) y adjunta { userId, role }.
//
// El rol que decide es el VIGENTE en la base, no el que quedó firmado en el
// token: un admin degradado no puede seguir usando su token anterior (ni
// devolverse el rol a sí mismo), y una cuenta eliminada pierde el acceso.
// Es una lectura por clave primaria y sólo en las rutas del panel; el
// catálogo público no la paga.
// =============================================

import type { Request, Response, NextFunction } from "express";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type WithUser = Request & { user?: { userId: string; role: string } };

/** Rol vigente del usuario; null si la cuenta ya no existe. */
async function currentRole(userId: string): Promise<string | null> {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT role AS panel_role FROM users WHERE id = ? LIMIT 1",
    [userId]
  );
  return rows[0]?.panel_role ?? null;
}

/** admin: todo; readonly: sólo lectura; el resto, 403. */
export async function requirePanelAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = (req as WithUser).user;
  if (!user?.userId) {
    res.status(401).json({ error: "Token de autenticación requerido" });
    return;
  }

  let role: string | null;
  try {
    role = await currentRole(user.userId);
  } catch (error) {
    // Sin poder confirmar el rol no se ejecuta la acción
    console.error("[Roles] No se pudo leer el rol vigente:", error);
    res.status(503).json({ error: "No se pudo verificar el permiso. Intentá de nuevo en unos segundos." });
    return;
  }
  if (role === null) {
    res.status(401).json({ error: "La sesión ya no es válida. Iniciá sesión de nuevo." });
    return;
  }
  user.role = role; // las rutas que lean req.user.role ven el rol vigente

  if (role === "admin") { next(); return; }
  if (role === "readonly") {
    if (READ_METHODS.has(req.method)) { next(); return; }
    res.status(403).json({ error: "Tu usuario es de solo lectura: no puede modificar datos" });
    return;
  }
  res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
}
