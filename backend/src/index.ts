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

const app = express();
const PORT = process.env.PORT ?? 4000;

// -----------------------------------------------
// Middleware global
// -----------------------------------------------
app.use(
  cors({
    // Acepta cualquier puerto de localhost en desarrollo,
    // o el FRONTEND_URL configurado en producción
    origin: (origin, callback) => {
      const configured = process.env.FRONTEND_URL ?? "http://localhost:3000";
      if (!origin || origin === configured || /^http:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origen no permitido — ${origin}`));
      }
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
