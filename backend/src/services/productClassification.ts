import { randomUUID } from "crypto";
import type { Pool, PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";

export const tagSlug = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const tag = z.string({invalid_type_error:"La etiqueta debe ser texto",required_error:"La etiqueta es requerida"}).trim()
  .min(1,"La etiqueta no puede estar vacía").max(100,"La etiqueta no puede superar los 100 caracteres")
  .refine(v => !v.includes(","), "Una etiqueta no puede contener comas")
  .refine(v => tagSlug(v).length > 0 && tagSlug(v).length <= 100, "Etiqueta inválida");
const scalar = z.union([z.string().trim().max(500,"El valor no puede superar los 500 caracteres"), z.number().finite("El número debe ser finito"), z.boolean()], {errorMap:()=>({message:"El valor debe ser texto, un número o sí/no"})});
const metadataField = z.record(
  z.string().min(1,"El nombre de la especificación es requerido").max(80,"El nombre no puede superar los 80 caracteres")
    .refine(k => k.trim().length > 0 && !["__proto__", "constructor", "prototype"].includes(k.trim()),"Nombre de atributo inválido"),
  scalar, {invalid_type_error:"Las especificaciones deben ser pares de nombre y valor"}
).superRefine((v,ctx)=>{
  const seen = new Set<string>();
  for (const key of Object.keys(v)) {
    const normalized = key.trim();
    if (seen.has(normalized)) ctx.addIssue({code:"custom",path:[key],message:"El nombre de la especificación está repetido"});
    seen.add(normalized);
  }
}).transform(v=>Object.fromEntries(Object.entries(v).map(([k,value])=>[k.trim(),value])));
export const classificationInput = z.object({
  tags: z.array(tag,{invalid_type_error:"Las etiquetas deben ser una lista"}).max(20, "Hasta 20 etiquetas por producto").optional(),
  metadata: metadataField.nullable().optional(),
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
    // Locking read sees the committed row even if an earlier snapshot predates it (REPEATABLE READ).
    const [rows] = await conn.query<RowDataPacket[]>("SELECT id FROM product_tags WHERE slug = ? FOR UPDATE", [slug]);
    await conn.query("INSERT INTO product_tag_map (product_id,tag_id) VALUES (?,?)", [id,rows[0].id]);
  }
}

