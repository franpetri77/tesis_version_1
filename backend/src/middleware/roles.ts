// =============================================
// MIDDLEWARE: ROLES DEL PANEL (T7)
// Un solo criterio para /admin, /reports y las rutas administrativas de
// /quotes (antes cada router tenía su propia copia de requireAdmin):
//   - admin:    acceso completo.
//   - readonly: ve todo el panel, pero sólo con métodos de lectura.
//   - customer: sin acceso.
// Se aplica después de requireAuth, que adjunta { userId, role } del JWT.
// =============================================

import type { Request, Response, NextFunction } from "express";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type WithUser = Request & { user?: { userId: string; role: string } };

/** admin: todo; readonly: sólo lectura; el resto, 403. */
export function requirePanelAccess(req: Request, res: Response, next: NextFunction): void {
  const role = (req as WithUser).user?.role;
  if (role === "admin") { next(); return; }
  if (role === "readonly") {
    if (READ_METHODS.has(req.method)) { next(); return; }
    res.status(403).json({ error: "Tu usuario es de solo lectura: no puede modificar datos" });
    return;
  }
  res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
}
