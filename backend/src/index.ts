// =============================================
// SERVIDOR BACKEND - TELE IMPORT S.A.
// Gestiona la base de datos SQLite y expone la API REST:
// - Catálogo de productos y categorías
// - Autenticación JWT
// - Webhooks de Mercado Pago
// - Reportes y recomendaciones
// =============================================

import "dotenv/config";
import express from "express";
import cors from "cors";
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

// Healthcheck
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// -----------------------------------------------
// Arranque del servidor
// -----------------------------------------------
app.listen(PORT, () => {
  console.log(`[Backend] Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
