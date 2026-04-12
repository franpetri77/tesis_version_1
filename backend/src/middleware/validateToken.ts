// =============================================
// MIDDLEWARE: VALIDACIÓN DE TOKEN DE SERVICIO
// Protege las rutas internas del backend Node.js
// para que solo puedan ser llamadas por Next.js
// usando el token de servicio compartido.
// =============================================

import type { Request, Response, NextFunction } from "express";

const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? "";

/**
 * Middleware que valida el header Authorization: Bearer <token>
 * Solo para rutas internas llamadas desde el frontend server-side.
 */
export function validateServiceToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!SERVICE_TOKEN) {
    // Si no está configurado el token, no bloquear (útil en dev local)
    next();
    return;
  }

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (token !== SERVICE_TOKEN) {
    res.status(401).json({ error: "Token de servicio inválido" });
    return;
  }

  next();
}
