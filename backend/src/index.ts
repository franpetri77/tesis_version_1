// =============================================
// SERVIDOR BACKEND - TELE IMPORT S.A.
// Gestiona la base de datos MySQL y expone la API REST:
// - Catálogo de productos y categorías
// - Autenticación JWT
// - Webhooks de Mercado Pago
// - Reportes y recomendaciones
// =============================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./db/database";
import { initSchema } from "./db/schema";
import { paymentsRouter } from "./routes/payments";
import { webhooksRouter } from "./routes/webhooks";
import { reportsRouter } from "./routes/reports";
import { catalogRouter } from "./routes/catalog";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { quotesRouter } from "./routes/quotes";

const app = express();
const PORT = process.env.PORT ?? 4000;

// -----------------------------------------------
// Middleware global
// -----------------------------------------------
// CORS_ORIGINS acepta una lista separada por comas para soportar múltiples dominios.
// Cada entrada puede incluir "*" como comodín, lo que resuelve las URLs
// cambiantes que Vercel genera en cada despliegue de vista previa.
//
// Ejemplo en Render:
//   CORS_ORIGINS=https://sctechnology.vercel.app,https://*-franpetri7s-projects.vercel.app
//
// Conviene acotar el comodín al sufijo propio de la cuenta: un patrón
// amplio como https://*.vercel.app habilitaría a cualquier sitio alojado
// en esa plataforma a consumir la API con las credenciales del usuario.
const ALLOWED_ORIGINS: string[] = (
  process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? "http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Convierte cada entrada en una expresión regular anclada, escapando todo
// salvo el comodín para evitar que un punto actúe como "cualquier carácter".
const ORIGIN_MATCHERS: RegExp[] = ALLOWED_ORIGINS.map((patron) => {
  const escapado = patron
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // escapa metacaracteres, incluido *
    .replace(/\\\*/g, "[^.]*");             // reactiva * como comodín de un segmento
  return new RegExp(`^${escapado}$`);
});

function origenPermitido(origin: string): boolean {
  return ORIGIN_MATCHERS.some((re) => re.test(origin));
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origen (Postman, curl, server-to-server)
      // y cualquier localhost en desarrollo
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      if (origenPermitido(origin)) {
        return callback(null, true);
      }
      // Se registra el rechazo: sin esta traza, el navegador sólo informa
      // la ausencia del encabezado y la causa real queda oculta.
      console.warn(`[CORS] Origen rechazado: ${origin}`);
      callback(new Error(`CORS: origen no permitido — ${origin}`));
    },
    credentials: true,
  })
);

// Parsear JSON para todas las rutas excepto webhooks
// (los webhooks de MP necesitan el body raw para verificar la firma)
app.use((req, res, next) => {
  if (req.path.startsWith("/webhooks")) {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

// -----------------------------------------------
// Rutas
// -----------------------------------------------
// API pública del catálogo (sin autenticación)
app.use("/catalog", catalogRouter);

// Autenticación de usuarios
app.use("/auth", authRouter);

// Operaciones de pago y webhooks de Mercado Pago
app.use("/payments", paymentsRouter);
app.use("/webhooks", webhooksRouter);

// Reportes administrativos
app.use("/reports", reportsRouter);

// Solicitudes de presupuesto (alta pública; listado y gestión sólo admin)
app.use("/quotes", quotesRouter);

// Rutas de administración (requieren rol admin)
app.use("/admin", adminRouter);

// Healthcheck — verifica también la conexión a la base de datos
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "mysql", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", db: "mysql_unreachable" });
  }
});

// -----------------------------------------------
// Arranque del servidor
// Inicializar el esquema MySQL antes de aceptar requests
// (en SQLite esto era sincrónico; en MySQL debe ser async)
// -----------------------------------------------
async function main(): Promise<void> {
  try {
    await initSchema(pool);
    app.listen(PORT, () => {
      console.log(`[Backend] Servidor corriendo en http://localhost:${PORT}`);
      console.log(`[Backend] Base de datos: MySQL (${process.env.DB_HOST ?? "localhost"}:${process.env.DB_PORT ?? "3306"}/${process.env.DB_NAME ?? "tele_import"})`);
    });
  } catch (err) {
    console.error("[Backend] Error fatal al inicializar la base de datos:", err);
    process.exit(1);
  }
}

main();

export default app;
