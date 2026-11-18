import { randomUUID } from "crypto";
import type { Pool, PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";

export const tagSlug = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const tag = z.string().trim().min(1).max(100).refine(v => !v.includes(","), "Una etiqueta no puede contener comas").refine(v => tagSlug(v).length > 0 && tagSlug(v).length <= 100, "Etiqueta inválida");
const scalar = z.union([z.string().trim().max(500), z.number().finite(), z.boolean()]);
export const classificationInput = z.object({
  tags: z.array(tag).max(20, "Hasta 20 etiquetas por producto").optional(),
  metadata: z.record(z.string().trim().min(1).max(80).refine(k => !["__proto__", "constructor", "prototype"].includes(k), "Nombre de atributo inválido"), scalar).nullable().optional(),
}).superRefine((v, ctx) => {
  if (v.metadata && Object.keys(v.metadata).length > 30) ctx.addIssue({code:"custom",path:["metadata"],message:"Hasta 30 especificaciones"});
  if (Buffer.byteLength(JSON.stringify(v.metadata ?? {}), "utf8") > 12000) ctx.addIssue({code:"custom",path:["metadata"],message:"Las especificaciones son demasiado largas"});
});
export type ClassificationInput = z.infer<typeof classificationInput>;
export function parseMetadata(raw: unknown): Record<string, string | number | boolean> {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    const result = classificationInput.safeParse({metadata:value ?? {}});
    return result.success ? result.data.metadata ?? {} : {};
  } catch { return {}; }
}
type Executor = Pool | PoolConnection;
export async function productTags(db: Executor, id: string) {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT t.id, t.name, t.slug FROM product_tags t
    JOIN product_tag_map m ON m.tag_id = t.id WHERE m.product_id = ? ORDER BY t.slug`, [id]);
  return rows as Array<RowDataPacket & {id:string;name:string;slug:string}>;
}
export async function attachClassification<T extends {id:string;metadata?:unknown}>(db: Executor, p: T) {
  return {...p, metadata:parseMetadata(p.metadata), tags:await productTags(db,p.id)};
}
/** Same product transaction; caller locks the product first. Omission preserves, []/{} clears. */
export async function saveClassification(conn: PoolConnection, id: string, input: ClassificationInput) {
  if (input.metadata !== undefined) await conn.query("UPDATE products SET metadata = ? WHERE id = ?", [JSON.stringify(input.metadata ?? {}),id]);
  if (input.tags === undefined) return;
  const tags = new Map(input.tags.map(name => [tagSlug(name),name]));
  await conn.query("DELETE FROM product_tag_map WHERE product_id = ?", [id]);
  for (const [slug,name] of [...tags].sort(([a],[b]) => a.localeCompare(b))) {
    await conn.query("INSERT INTO product_tags (id,name,slug) VALUES (?,?,?) ON DUPLICATE KEY UPDATE id = id", [randomUUID(),name,slug]);
    const [rows] = await conn.query<RowDataPacket[]>("SELECT id FROM product_tags WHERE slug = ?", [slug]);
    await conn.query("INSERT INTO product_tag_map (product_id,tag_id) VALUES (?,?)", [id,rows[0].id]);
  }
}

