import { Router } from "express";
import { z } from "zod";
import db from "../db/database";
import { presentPromotion, PromotionError, savePromotion, type PromotionRow } from "../services/promotions";

// Mounted after requireAuth + requirePanelAccess in adminRouter (readonly: GET only).
export const promotionsRouter = Router();
promotionsRouter.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query<PromotionRow[]>("SELECT * FROM promotions ORDER BY code ASC, id ASC");
    res.json({data:rows.map(presentPromotion)});
  } catch (error) {
    console.error("[Promotions] Error al listar:", error);
    res.status(500).json({error:"No se pudieron cargar las promociones"});
  }
});
for (const [method, path, toggle] of [["post", "/", false], ["put", "/:id", false], ["patch", "/:id/active", true]] as const) {
  promotionsRouter[method](path, async (req, res) => {
    try {
      const user = (req as unknown as {user:{userId:string}}).user;
      const data = await savePromotion(method === "post" ? null : (req.params as {id:string}).id, req.body, user.userId, req.ip ?? null, toggle);
      res.status(method === "post" ? 201 : 200).json({data});
    } catch (error) {
      if (error instanceof z.ZodError) { res.status(400).json({error:error.issues[0]?.message ?? "Datos inválidos"}); return; }
      if (error instanceof PromotionError) { res.status(error.status).json({error:error.message}); return; }
      console.error("[Promotions] Error al guardar:", error);
      res.status(500).json({error:"No se pudo guardar la promoción"});
    }
  });
}
