// =============================================
// RUTAS: IMPORTAR Y EXPORTAR PRODUCTOS EN CSV (T6b)
// Montado en /admin/products, detrás de requireAuth + requirePanelAccess:
// readonly puede exportar (lectura); importar es escritura y queda en 403.
//
//   GET  /admin/products/export[?plantilla=1]   descarga el CSV
//   POST /admin/products/import/preview { csv } vista previa, sin escrituras
//   POST /admin/products/import { csv, hash, signature, file_name? }
// =============================================

import { Router, type Request } from "express";
import { z } from "zod";
import db from "../db/database";
import { withTransaction } from "../services/audit";
import { dispatch, notifyLowStock, notifyNewProduct, notifyPriceDrop } from "../services/notifications";
import { todayInCordoba } from "../utils/businessDate";
import { applyImport, exportProductsCsv, planImport, publicPlan, type ImportPlan } from "../services/productImport";

export const productCsvRouter = Router();

const actorOf = (req: Request) => ({
  userId: (req as unknown as { user?: { userId?: string } }).user?.userId ?? null,
  ip: req.ip ?? null,
});

const previewBody = z.object({ csv: z.string({ required_error: "Falta el contenido del archivo", invalid_type_error: "El archivo debe enviarse como texto" }) });
const commitBody = previewBody.extend({
  hash: z.string().regex(/^[a-f0-9]{64}$/, "Falta la huella de la vista previa"),
  signature: z.string().regex(/^[a-f0-9]{64}$/, "Falta la huella de la vista previa"),
  file_name: z.string().max(255).optional(),
});

/** Rechazo controlado dentro de la transacción: revierte y responde con el plan. */
class ImportRejected extends Error {
  constructor(public status: number, message: string, public plan?: ImportPlan) { super(message); }
}

productCsvRouter.get("/export", async (req, res) => {
  try {
    const template = req.query.plantilla === "1";
    const csv = await exportProductsCsv(db, { template });
    const day = todayInCordoba();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${template ? "plantilla-productos" : `productos-${day}`}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(csv);
  } catch (error) {
    console.error("[Admin] Error en GET /products/export:", error);
    res.status(500).json({ error: "No se pudo exportar el catálogo" });
  }
});

productCsvRouter.post("/import/preview", async (req, res) => {
  const body = previewBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.issues[0].message }); return; }
  try {
    res.json({ data: publicPlan(await planImport(db, body.data.csv)) });
  } catch (error) {
    console.error("[Admin] Error en POST /products/import/preview:", error);
    res.status(500).json({ error: "No se pudo analizar el archivo" });
  }
});

productCsvRouter.post("/import", async (req, res) => {
  const body = commitBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.issues[0].message }); return; }
  const { csv, hash, signature, file_name } = body.data;
  try {
    const result = await withTransaction(async (conn) => {
      const plan = await planImport(conn, csv, { lock: true });
      if (plan.hash !== hash) throw new ImportRejected(409, "El archivo no es el mismo de la vista previa. Volvé a cargarlo.");
      if (plan.fileErrors.length || plan.summary.error > 0) throw new ImportRejected(422, "El archivo tiene errores: corregilos y volvé a intentar.", publicPlan(plan));
      if (plan.signature !== signature) throw new ImportRejected(409, "Los productos cambiaron desde la vista previa. Revisá la nueva vista previa antes de confirmar.", publicPlan(plan));
      const effects = await applyImport(conn, plan, actorOf(req), file_name ?? null);
      return { plan, effects };
    });

    // Avisos sólo después del commit, igual que en el ABM del panel
    const { plan, effects } = result;
    for (const id of effects.created) dispatch(`producto nuevo ${id}`, () => notifyNewProduct(id));
    for (const p of effects.priceDrops) dispatch(`baja de precio ${p.id}`, () => notifyPriceDrop(p.id, p.previous, p.next));
    if (effects.stockChanged.length) dispatch("stock bajo (importación)", () => notifyLowStock(effects.stockChanged));

    res.json({ data: { import_id: effects.importId, summary: plan.summary } });
  } catch (error) {
    if (error instanceof ImportRejected) {
      res.status(error.status).json({ error: error.message, ...(error.plan ? { data: error.plan } : {}) });
      return;
    }
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "Otro usuario creó un producto con el mismo SKU o slug mientras se importaba. No se guardó nada: volvé a generar la vista previa." });
      return;
    }
    console.error("[Admin] Error en POST /products/import:", error);
    res.status(500).json({ error: "No se pudo importar el archivo. No se guardó ningún cambio." });
  }
});
