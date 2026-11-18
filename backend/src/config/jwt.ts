// =============================================
// SECRETO JWT (T7)
// Una sola fuente para firmar y verificar tokens. Antes auth, catalog y
// quotes tenían cada uno su copia con un valor por defecto fijo: si en
// producción faltaba la variable, los tokens se firmaban con un secreto
// publicado en el repositorio.
// =============================================

const DEV_SECRET = "tele-import-dev-secret-2024";

function resolveSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret === DEV_SECRET)) {
    // Mejor no arrancar que aceptar tokens falsificables
    throw new Error("JWT_SECRET no está configurado (o usa el valor de desarrollo) en producción");
  }
  return secret || DEV_SECRET;
}

export const JWT_SECRET = resolveSecret();
