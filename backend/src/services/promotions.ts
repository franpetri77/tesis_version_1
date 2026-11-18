import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { z } from "zod";
import db from "../db/database";

const money = z.number().finite().min(0).max(9999999999999.99)
  .refine(v => Number(v.toFixed(2)) === v, "Usá como máximo dos decimales");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usá una fecha válida")
  .refine(v => {
    const d = new Date(v + "T00:00:00Z");
    return Number(v.slice(0, 4)) >= 1000 && Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Fecha inexistente");
export const promotionInput = z.object({
  code: z.string().trim().toUpperCase().min(1).max(50).regex(/^[A-Z0-9_-]+$/, "El código admite letras, números, guion y guion bajo"),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable(),
  type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
  value: money,
  min_order_amount: money.nullable(),
  max_uses: z.number().int().min(1).max(2147483647).nullable(),
  is_active: z.boolean(),
  valid_from: date,
  valid_until: date.nullable(),
}).strict().superRefine((p, ctx) => {
  if (p.type === "percentage" && (p.value <= 0 || p.value > 100)) ctx.addIssue({code:"custom",path:["value"],message:"El porcentaje debe ser mayor que 0 y hasta 100"});
  if (p.type === "fixed_amount" && p.value <= 0) ctx.addIssue({code:"custom",path:["value"],message:"El descuento debe ser mayor que 0"});
  if (p.type === "free_shipping" && p.value !== 0) ctx.addIssue({code:"custom",path:["value"],message:"Envío gratis debe tener valor 0"});
  if (p.valid_until && p.valid_until < p.valid_from) ctx.addIssue({code:"custom",path:["valid_until"],message:"El vencimiento no puede ser anterior al inicio"});
});

export interface PromotionRow extends RowDataPacket {
  id: string; code: string; name: string; description: string | null;
  type: "percentage" | "fixed_amount" | "free_shipping"; value: number;
  min_order_amount: number | null; max_uses: number | null; current_uses: number;
  is_active: number; valid_from: string; valid_until: string | null;
}
export class PromotionError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export const presentPromotion = (p: PromotionRow) => ({ ...p, is_active: Boolean(p.is_active) });

async function audit(conn: PoolConnection, actorId: string, ip: string | null, id: string,
  previous: PromotionRow | null, next: PromotionRow): Promise<void> {
  await conn.query(`INSERT INTO audit_logs (id,action,entity_type,entity_id,user_id,previous_value,new_value,ip_address)
    VALUES (?,?,'promotion',?,?,?,?,?)`, [randomUUID(), previous ? "promotion_update" : "promotion_create",
    id, actorId, previous ? JSON.stringify(previous) : null, JSON.stringify(next), ip]);
}

// A full edit and a toggle both lock the same row as checkout's usage increment.
// current_uses is never accepted from the administrator or overwritten by an edit.
export async function savePromotion(id: string | null, raw: unknown, actorId: string, ip: string | null, toggle = false) {
  const input = toggle ? z.object({is_active:z.boolean()}).strict().parse(raw) : promotionInput.parse(raw);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let previous: PromotionRow | null = null;
    if (id) {
      const [rows] = await conn.query<PromotionRow[]>("SELECT * FROM promotions WHERE id = ? FOR UPDATE", [id]);
      previous = rows[0] ?? null;
      if (!previous) throw new PromotionError(404, "Promoción no encontrada");
    }
    const promotionId = id ?? randomUUID();
    if (toggle) {
      if (!previous) throw new PromotionError(404, "Promoción no encontrada");
      await conn.query("UPDATE promotions SET is_active = ? WHERE id = ?", [input.is_active, promotionId]);
    } else {
      const p = input as z.infer<typeof promotionInput>;
      if (previous && p.max_uses !== null && p.max_uses < previous.current_uses) {
        throw new PromotionError(409, `El límite no puede ser menor que los ${previous.current_uses} usos registrados`);
      }
      const fields = [p.code, p.name, p.description || null, p.type, p.value, p.min_order_amount,
        p.max_uses, p.is_active, p.valid_from, p.valid_until];
      if (previous) {
        await conn.query(`UPDATE promotions SET code=?,name=?,description=?,type=?,value=?,min_order_amount=?,
          max_uses=?,is_active=?,valid_from=?,valid_until=? WHERE id=?`, [...fields, promotionId]);
      } else {
        await conn.query(`INSERT INTO promotions (code,name,description,type,value,min_order_amount,max_uses,
          is_active,valid_from,valid_until,id,current_uses) VALUES (?,?,?,?,?,?,?,?,?,?,?,0)`, [...fields, promotionId]);
      }
    }
    const [rows] = await conn.query<PromotionRow[]>("SELECT * FROM promotions WHERE id = ?", [promotionId]);
    const next = rows[0]!;
    await audit(conn, actorId, ip, promotionId, previous, next);
    await conn.commit();
    return presentPromotion(next);
  } catch (error) {
    await conn.rollback();
    if ((error as {code?:string}).code === "ER_DUP_ENTRY") throw new PromotionError(409, "Ya existe una promoción con ese código");
    throw error;
  } finally { conn.release(); }
}
