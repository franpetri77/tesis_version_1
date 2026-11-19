// =============================================
// SERVICIO: IMPORTACIÓN Y EXPORTACIÓN DE PRODUCTOS EN CSV (T6b)
//
// Formato (el mismo que produce la exportación):
//   - Separador ";", decimales con coma, "sí"/"no", UTF-8 con BOM: se abre
//     directo en planillas configuradas en castellano. La importación también
//     acepta "," o tabulación y decimales con punto.
//   - Columnas: sku (obligatoria), nombre, slug, categoria, marca, modelo,
//     precio, precio_anterior, stock, activo, destacado, descripcion_corta,
//     descripcion, etiquetas, especificaciones, imagenes.
//   - El SKU decide: si existe se actualiza, si no se crea.
//   - Columna ausente: se conserva el valor actual. Celda vacía en una columna
//     presente: se vacía (texto opcional, etiquetas, especificaciones,
//     imágenes). En columnas obligatorias una celda vacía es un error.
//   - etiquetas: nombres separados por comas. especificaciones: objeto JSON.
//     imagenes: URL separadas por "|".
//
// Flujo: vista previa (sin escrituras) → confirmación con el mismo archivo.
// La confirmación vuelve a calcular el plan dentro de una transacción con los
// productos bloqueados; si el archivo o el plan cambiaron, no escribe nada.
// Todo el archivo se aplica o nada (una sola transacción, con auditoría).
// =============================================

import { createHash, randomUUID } from "crypto";
import type { Pool, PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { CsvError, parseCsv, toCsv, unprotectCell } from "./csv";
import { classificationInput, parseMetadata, saveClassification, tagSlug } from "./productClassification";
import { buildSnapshot, productSnapshot, type ProductSnapshot } from "./productSnapshot";
import { diffFields, logAudit } from "./audit";

type Executor = Pool | PoolConnection;

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_IMAGES = 10;
const TEXT_MAX_BYTES = 65535;
const PRICE_MAX = 9_999_999_999_999.99;

export const CSV_COLUMNS = [
  "sku", "nombre", "slug", "categoria", "marca", "modelo", "precio", "precio_anterior", "stock",
  "activo", "destacado", "descripcion_corta", "descripcion", "etiquetas", "especificaciones", "imagenes",
] as const;
export type CsvColumn = typeof CSV_COLUMNS[number];

const ALIASES: Record<string, CsvColumn> = {
  name: "nombre", category: "categoria", brand: "marca", model: "modelo", price: "precio",
  compare_price: "precio_anterior", stock_quantity: "stock", is_active: "activo", is_featured: "destacado",
  short_description: "descripcion_corta", description: "descripcion", tags: "etiquetas",
  metadata: "especificaciones", especificaciones_tecnicas: "especificaciones", images: "imagenes",
};

// -----------------------------------------------
// Tipos públicos
// -----------------------------------------------
export interface ImportIssue { column: CsvColumn | null; message: string }
export type RowAction = "create" | "update" | "unchanged" | "error";
export interface PlannedRow {
  line: number;
  sku: string;
  name: string;
  action: RowAction;
  /** Columnas que cambian (solo en actualizaciones). */
  changes: CsvColumn[];
  errors: ImportIssue[];
}
export interface ImportPlan {
  fileErrors: string[];
  columns: CsvColumn[];
  ignoredColumns: string[];
  rows: PlannedRow[];
  summary: { total: number; create: number; update: number; unchanged: number; error: number };
  /** Huella del archivo: la confirmación debe enviar exactamente el mismo. */
  hash: string;
  /** Huella del plan: si los productos cambiaron desde la vista previa, no coincide. */
  signature: string;
}

interface Desired {
  name: string; slug: string; sku: string; price: number; compare_price: number | null; category_id: string;
  stock_quantity: number; brand: string | null; model: string | null; description: string | null;
  short_description: string | null; is_featured: boolean; is_active: boolean;
  tags?: string[]; metadata?: Record<string, string | number | boolean>;
  /** undefined: no se tocan las imágenes. */
  images?: Array<{ url: string; alt: string | null }>;
}
interface InternalRow extends PlannedRow { desired?: Desired; existingId?: string; before?: ProductSnapshot }
interface InternalPlan extends ImportPlan { rows: InternalRow[] }

// -----------------------------------------------
// Utilidades de formato
// -----------------------------------------------
export function normalizeHeader(raw: string): string {
  return raw.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const bytes = (s: string) => Buffer.byteLength(s, "utf8");

/** "45999", "45999,5", "45999.50" → número. Sin separador de miles: "45.999" es ambiguo. */
export function parseDecimal(raw: string): number | null {
  const v = raw.replace(/\s/g, "");
  if (!/^\d+([.,]\d{1,2})?$/.test(v)) return null;
  return Number(v.replace(",", "."));
}

function formatDecimal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  return Number(v).toFixed(2).replace(".", ",");
}

export function parseBoolean(raw: string): boolean | null {
  const v = normalizeHeader(raw);
  if (["si", "s", "true", "1", "verdadero", "x"].includes(v)) return true;
  if (["no", "n", "false", "0", "falso"].includes(v)) return false;
  return null;
}

const canonicalJson = (o: Record<string, unknown>) =>
  JSON.stringify(Object.keys(o).sort().reduce<Record<string, unknown>>((acc, k) => { acc[k] = o[k]; return acc; }, {}));

// -----------------------------------------------
// EXPORTACIÓN
// -----------------------------------------------
export async function exportProductsCsv(db: Executor, opts: { template?: boolean } = {}): Promise<string> {
  const header = [...CSV_COLUMNS];
  if (opts.template) return toCsv([header]);
  const [products] = await db.query<RowDataPacket[]>(
    `SELECT p.*, c.slug AS category_slug FROM products p
     LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.sku`
  );
  const [images] = await db.query<RowDataPacket[]>(
    "SELECT product_id, image_url FROM product_images ORDER BY product_id, sort_order"
  );
  const [tags] = await db.query<RowDataPacket[]>(
    `SELECT m.product_id, t.name FROM product_tag_map m JOIN product_tags t ON t.id = m.tag_id
     ORDER BY m.product_id, t.slug`
  );
  const imagesBy = groupBy(images, (r) => String(r.product_id), (r) => String(r.image_url));
  const tagsBy = groupBy(tags, (r) => String(r.product_id), (r) => String(r.name));
  const rows = products.map((p) => {
    const metadata = parseMetadata(p.metadata);
    const cells: Record<CsvColumn, string> = {
      sku: p.sku, nombre: p.name, slug: p.slug, categoria: p.category_slug ?? "",
      marca: p.brand ?? "", modelo: p.model ?? "",
      precio: formatDecimal(p.price), precio_anterior: formatDecimal(p.compare_price),
      stock: String(p.stock_quantity ?? 0),
      activo: p.is_active ? "sí" : "no", destacado: p.is_featured ? "sí" : "no",
      descripcion_corta: p.short_description ?? "", descripcion: p.description ?? "",
      etiquetas: (tagsBy.get(p.id) ?? []).join(", "),
      especificaciones: Object.keys(metadata).length ? JSON.stringify(metadata) : "",
      imagenes: (imagesBy.get(p.id) ?? []).join(" | "),
    };
    return header.map((c) => String(cells[c]));
  });
  return toCsv([header, ...rows]);
}

function groupBy<T, V>(rows: T[], key: (r: T) => string, value: (r: T) => V): Map<string, V[]> {
  const map = new Map<string, V[]>();
  for (const r of rows) {
    const k = key(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(value(r));
  }
  return map;
}

// -----------------------------------------------
// PLAN DE IMPORTACIÓN (no escribe)
// -----------------------------------------------
function emptyPlan(hash: string, fileErrors: string[]): InternalPlan {
  return { fileErrors, columns: [], ignoredColumns: [], rows: [], summary: { total: 0, create: 0, update: 0, unchanged: 0, error: 0 }, hash, signature: "" };
}

export async function planImport(db: Executor, csv: string, opts: { lock?: boolean } = {}): Promise<InternalPlan> {
  const hash = sha256(csv);
  if (bytes(csv) > MAX_IMPORT_BYTES) return emptyPlan(hash, [`El archivo supera el máximo de ${MAX_IMPORT_BYTES / 1024 / 1024} MB`]);

  let parsed: Array<{ line: number; cells: string[] }>;
  try { parsed = parseCsv(csv); }
  catch (e) { return emptyPlan(hash, [e instanceof CsvError ? e.message : "No se pudo leer el archivo CSV"]); }
  if (parsed.length === 0) return emptyPlan(hash, ["El archivo está vacío"]);

  // Encabezados
  const fileErrors: string[] = [];
  const headerIndex = new Map<CsvColumn, number>();
  const ignoredColumns: string[] = [];
  parsed[0].cells.forEach((raw, i) => {
    const norm = normalizeHeader(raw);
    const col = (CSV_COLUMNS as readonly string[]).includes(norm) ? norm as CsvColumn : ALIASES[norm];
    if (!col) { if (raw.trim()) ignoredColumns.push(raw.trim()); return; }
    if (headerIndex.has(col)) fileErrors.push(`La columna "${col}" está repetida`);
    else headerIndex.set(col, i);
  });
  if (!headerIndex.has("sku")) fileErrors.push('Falta la columna "sku", que identifica cada producto');
  const dataRows = parsed.slice(1);
  if (dataRows.length === 0) fileErrors.push("El archivo no tiene productos debajo de los encabezados");
  if (dataRows.length > MAX_IMPORT_ROWS) fileErrors.push(`El archivo tiene ${dataRows.length} productos; el máximo por importación es ${MAX_IMPORT_ROWS}`);
  const columns = CSV_COLUMNS.filter((c) => headerIndex.has(c));
  if (fileErrors.length) return { ...emptyPlan(hash, fileErrors), columns, ignoredColumns };

  const has = (c: CsvColumn) => headerIndex.has(c);
  const cellOf = (cells: string[], c: CsvColumn) => {
    const i = headerIndex.get(c);
    return i === undefined ? undefined : unprotectCell(cells[i] ?? "").trim();
  };

  // Datos de la base: categorías, productos de los SKU del archivo, sus imágenes y etiquetas
  const skus = [...new Set(dataRows.map((r) => (cellOf(r.cells, "sku") ?? "").toLowerCase()).filter(Boolean))];
  // Con lock, la lectura bloqueante va primero: así la foto de REPEATABLE READ
  // se fija después de tener los productos bloqueados, y las lecturas de
  // imágenes y etiquetas ven lo último confirmado (el ABM bloquea el producto
  // antes de cambiarlas).
  const existing = new Map<string, RowDataPacket>();
  const snapshots = new Map<string, ProductSnapshot>();
  if (skus.length) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM products WHERE sku IN (?) ORDER BY sku${opts.lock ? " FOR UPDATE" : ""}`, [skus]
    );
    for (const r of rows) existing.set(String(r.sku).toLowerCase(), r);
    const ids = rows.map((r) => String(r.id));
    if (ids.length) {
      const [imgs] = await db.query<RowDataPacket[]>(
        "SELECT product_id, image_url, alt_text FROM product_images WHERE product_id IN (?) ORDER BY product_id, sort_order ASC", [ids]
      );
      const [tagRows] = await db.query<RowDataPacket[]>(
        `SELECT m.product_id, t.slug FROM product_tag_map m JOIN product_tags t ON t.id = m.tag_id
         WHERE m.product_id IN (?) ORDER BY m.product_id, t.slug`, [ids]
      );
      const imgsBy = groupBy(imgs, (r) => String(r.product_id), (r) => ({ image_url: String(r.image_url), alt_text: r.alt_text ?? null }));
      const tagsBy = groupBy(tagRows, (r) => String(r.product_id), (r) => String(r.slug));
      for (const r of rows) snapshots.set(String(r.id), buildSnapshot(r, imgsBy.get(String(r.id)) ?? [], tagsBy.get(String(r.id)) ?? []));
    }
  }

  const [categories] = await db.query<RowDataPacket[]>("SELECT id, slug, name FROM categories");
  const catBySlug = new Map(categories.map((c) => [String(c.slug).toLowerCase(), String(c.id)]));
  const catByName = new Map(categories.map((c) => [normalizeHeader(String(c.name)), String(c.id)]));

  // Validación fila por fila
  const firstLineOfSku = new Map<string, number>();
  const rows: InternalRow[] = dataRows.map(({ line, cells }) => {
    const errors: ImportIssue[] = [];
    const err = (column: CsvColumn | null, message: string) => errors.push({ column, message });
    if (cells.length > parsed[0].cells.length && cells.slice(parsed[0].cells.length).some((c) => c.trim()))
      err(null, "La fila tiene más celdas que encabezados; revisá el separador o las comillas");

    const sku = cellOf(cells, "sku") ?? "";
    if (!sku) err("sku", "El SKU es obligatorio");
    else if (sku.length > 100) err("sku", "El SKU no puede superar los 100 caracteres");
    else if (firstLineOfSku.has(sku.toLowerCase())) err("sku", `SKU repetido: ya aparece en la línea ${firstLineOfSku.get(sku.toLowerCase())}`);
    else firstLineOfSku.set(sku.toLowerCase(), line);

    // MySQL compara los SKU sin distinguir mayúsculas: "abc" actualiza a "ABC"
    const current = existing.get(sku.toLowerCase());
    const isCreate = !current;
    const before = current ? snapshots.get(String(current.id)) : undefined;

    // Texto obligatorio u opcional
    const requiredText = (c: CsvColumn, max: number, label: string, fallback: string | undefined): string => {
      const v = cellOf(cells, c);
      if (v === undefined) { if (isCreate) err(c, `${label} es obligatorio para un producto nuevo`); return fallback ?? ""; }
      if (!v) { err(c, `${label} no puede quedar vacío`); return fallback ?? ""; }
      if (v.length > max) err(c, `${label} no puede superar los ${max} caracteres`);
      return v;
    };
    const optionalText = (c: CsvColumn, max: number, label: string, fallback: string | null): string | null => {
      const v = cellOf(cells, c);
      if (v === undefined) return isCreate ? null : fallback;
      if (!v) return null;
      if (c === "descripcion" || c === "descripcion_corta") { if (bytes(v) > TEXT_MAX_BYTES) err(c, `${label} es demasiado larga`); }
      else if (v.length > max) err(c, `${label} no puede superar los ${max} caracteres`);
      return v;
    };

    const name = requiredText("nombre", 255, "El nombre", current?.name);

    let slug: string = current?.slug ?? "";
    const slugCell = cellOf(cells, "slug");
    if (slugCell) {
      if (slugCell.length > 255 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugCell)) err("slug", "El slug solo admite minúsculas, números y guiones (ej. mouse-inalambrico)");
      slug = slugCell;
    } else if (isCreate) {
      slug = slugify(name);
      if (name && !slug) err("slug", "No se pudo generar el slug a partir del nombre; completá la columna slug");
    }

    let category_id: string = current?.category_id ?? "";
    const catCell = cellOf(cells, "categoria");
    if (catCell === undefined) { if (isCreate) err("categoria", "La categoría es obligatoria para un producto nuevo"); }
    else if (!catCell) err("categoria", "La categoría no puede quedar vacía");
    else {
      const id = catBySlug.get(catCell.toLowerCase()) ?? catByName.get(normalizeHeader(catCell));
      if (!id) err("categoria", `No existe la categoría "${catCell}" (usá el slug o el nombre exacto)`);
      else category_id = id;
    }

    let price = current ? Number(current.price) : 0;
    const priceCell = cellOf(cells, "precio");
    if (priceCell === undefined) { if (isCreate) err("precio", "El precio es obligatorio para un producto nuevo"); }
    else {
      const v = parseDecimal(priceCell);
      if (v === null) err("precio", "Precio inválido: usá solo números y, para los centavos, coma o punto (ej. 45999,50)");
      else if (v <= 0 || v > PRICE_MAX) err("precio", "El precio debe ser mayor que cero");
      else price = v;
    }

    let compare_price: number | null = current?.compare_price === null || current?.compare_price === undefined ? null : Number(current.compare_price);
    const compareCell = cellOf(cells, "precio_anterior");
    if (compareCell !== undefined) {
      if (!compareCell) compare_price = null;
      else {
        const v = parseDecimal(compareCell);
        if (v === null) err("precio_anterior", "Precio anterior inválido: usá solo números y, para los centavos, coma o punto");
        else if (v <= 0 || v > PRICE_MAX) err("precio_anterior", "El precio anterior debe ser mayor que cero");
        else compare_price = v;
      }
    } else if (isCreate) compare_price = null;

    let stock_quantity = current ? Number(current.stock_quantity) : 0;
    const stockCell = cellOf(cells, "stock");
    if (stockCell !== undefined) {
      if (!stockCell && !isCreate) err("stock", "El stock no puede quedar vacío");
      else if (stockCell) {
        if (!/^\d+$/.test(stockCell) || Number(stockCell) > 2_147_483_647) err("stock", "El stock debe ser un número entero mayor o igual a cero");
        else stock_quantity = Number(stockCell);
      }
    }

    const bool = (c: CsvColumn, label: string, fallback: boolean): boolean => {
      const v = cellOf(cells, c);
      if (v === undefined || (!v && isCreate)) return fallback;
      if (!v) { err(c, `${label} no puede quedar vacío (sí o no)`); return fallback; }
      const b = parseBoolean(v);
      if (b === null) { err(c, `${label}: escribí "sí" o "no"`); return fallback; }
      return b;
    };
    const is_active = bool("activo", "Activo", current ? Boolean(current.is_active) : true);
    const is_featured = bool("destacado", "Destacado", current ? Boolean(current.is_featured) : false);

    const brand = optionalText("marca", 100, "La marca", current?.brand ?? null);
    const model = optionalText("modelo", 100, "El modelo", current?.model ?? null);
    const short_description = optionalText("descripcion_corta", 0, "La descripción corta", current?.short_description ?? null);
    const description = optionalText("descripcion", 0, "La descripción", current?.description ?? null);

    // Etiquetas y especificaciones con el contrato de T6a
    let tags: string[] | undefined;
    const tagsCell = cellOf(cells, "etiquetas");
    if (tagsCell !== undefined) {
      const list = tagsCell.split(",").map((t) => t.trim()).filter(Boolean);
      const r = classificationInput.safeParse({ tags: list });
      if (!r.success) err("etiquetas", r.error.issues[0].message);
      else tags = r.data.tags ?? [];
    } else if (isCreate) tags = [];

    let metadata: Record<string, string | number | boolean> | undefined;
    const specsCell = cellOf(cells, "especificaciones");
    if (specsCell !== undefined) {
      let value: unknown = {};
      let ok = true;
      if (specsCell) {
        try { value = JSON.parse(specsCell); } catch { ok = false; }
        if (!ok || typeof value !== "object" || value === null || Array.isArray(value)) {
          ok = false;
          err("especificaciones", 'Las especificaciones deben ser un objeto JSON, por ejemplo {"Color":"Negro","Potencia":"100 W"}');
        }
      }
      if (ok) {
        const r = classificationInput.safeParse({ metadata: value });
        if (!r.success) err("especificaciones", r.error.issues[0].message);
        else metadata = r.data.metadata ?? {};
      }
    } else if (isCreate) metadata = {};

    let images: Desired["images"];
    const imagesCell = cellOf(cells, "imagenes");
    if (imagesCell !== undefined) {
      const urls = imagesCell.split("|").map((u) => u.trim()).filter(Boolean);
      if (urls.length > MAX_IMAGES) err("imagenes", `Hasta ${MAX_IMAGES} imágenes por producto`);
      const bad = urls.find((u) => { try { const p = new URL(u); return !["http:", "https:"].includes(p.protocol) || u.length > 2048; } catch { return true; } });
      if (bad) err("imagenes", `Dirección de imagen inválida: ${bad.slice(0, 80)} (debe empezar con http:// o https://)`);
      const altOf = new Map(((before?.images ?? []) as Array<{ url: string; alt: string | null }>).map((i) => [i.url, i.alt]));
      images = urls.map((url) => ({ url, alt: altOf.get(url) ?? null }));
    }

    const desired: Desired = {
      name, slug, sku, price, compare_price, category_id, stock_quantity, brand, model,
      description, short_description, is_featured, is_active, tags, metadata, images,
    };
    const action: RowAction = errors.length ? "error" : isCreate ? "create" : "update";
    return { line, sku, name, action, changes: [], errors, desired, existingId: current ? String(current.id) : undefined, before };
  });

  // Slugs repetidos dentro del archivo o tomados por otro producto
  const slugOwner = new Map<string, number>();
  for (const r of rows) {
    if (!r.desired?.slug || r.errors.some((e) => e.column === "slug")) continue;
    const prev = slugOwner.get(r.desired.slug);
    if (prev !== undefined) r.errors.push({ column: "slug", message: `Slug repetido: ya lo usa la línea ${prev}` });
    else slugOwner.set(r.desired.slug, r.line);
  }
  const slugs = [...slugOwner.keys()];
  if (slugs.length) {
    const [taken] = await db.query<RowDataPacket[]>("SELECT id, sku, slug FROM products WHERE slug IN (?)", [slugs]);
    for (const t of taken) {
      const r = rows.find((x) => x.desired?.slug === t.slug && x.line === slugOwner.get(String(t.slug)));
      // Aunque el dueño actual cambie su slug en el mismo archivo, el índice único
      // fallaría según el orden de las filas: el intercambio se hace en dos pasos.
      if (r && r.existingId !== String(t.id)) r.errors.push({ column: "slug", message: `El slug "${t.slug}" ya lo usa el producto ${t.sku}` });
    }
  }

  // Acción final y columnas que cambian
  for (const r of rows) {
    if (r.errors.length) { r.action = "error"; continue; }
    if (r.action !== "update" || !r.before || !r.desired) continue;
    r.changes = changedColumns(r.before, r.desired, has);
    if (r.changes.length === 0) r.action = "unchanged";
  }

  const summary = { total: rows.length, create: 0, update: 0, unchanged: 0, error: 0 };
  for (const r of rows) summary[r.action]++;
  const signature = sha256(JSON.stringify(rows.map((r) => [r.line, r.sku, r.action, r.changes])));
  return { fileErrors: [], columns, ignoredColumns, rows, summary, hash, signature };
}

function changedColumns(before: ProductSnapshot, d: Desired, has: (c: CsvColumn) => boolean): CsvColumn[] {
  const out: CsvColumn[] = [];
  const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);
  const money = (v: unknown) => (v === null || v === undefined ? null : Number(v).toFixed(2));
  if (!same(before.name, d.name)) out.push("nombre");
  if (!same(before.slug, d.slug)) out.push("slug");
  if (!same(before.category_id, d.category_id)) out.push("categoria");
  if (!same(before.brand, d.brand)) out.push("marca");
  if (!same(before.model, d.model)) out.push("modelo");
  if (money(before.price) !== money(d.price)) out.push("precio");
  if (money(before.compare_price) !== money(d.compare_price)) out.push("precio_anterior");
  if (Number(before.stock_quantity) !== d.stock_quantity) out.push("stock");
  if (Boolean(before.is_active) !== d.is_active) out.push("activo");
  if (Boolean(before.is_featured) !== d.is_featured) out.push("destacado");
  if (!same(before.short_description, d.short_description)) out.push("descripcion_corta");
  if (!same(before.description, d.description)) out.push("descripcion");
  if (has("etiquetas") && d.tags) {
    const want = [...new Set(d.tags.map(tagSlug))].sort().join("|");
    if (want !== [...(before.tags as string[])].sort().join("|")) out.push("etiquetas");
  }
  if (has("especificaciones") && d.metadata && canonicalJson(d.metadata) !== canonicalJson(before.metadata as Record<string, unknown>)) out.push("especificaciones");
  if (d.images && d.images.map((i) => i.url).join("\n") !== (before.images as Array<{ url: string }>).map((i) => i.url).join("\n")) out.push("imagenes");
  return out;
}

/** Vista sin los datos internos, para responder al panel. */
export function publicPlan(plan: InternalPlan): ImportPlan {
  return {
    ...plan,
    rows: plan.rows.map(({ line, sku, name, action, changes, errors }) => ({ line, sku, name, action, changes, errors })),
  };
}

// -----------------------------------------------
// APLICACIÓN (dentro de la transacción del llamador)
// -----------------------------------------------
export interface ImportEffects {
  importId: string;
  created: string[];
  priceDrops: Array<{ id: string; previous: number; next: number }>;
  stockChanged: string[];
}

export async function applyImport(
  conn: PoolConnection, plan: InternalPlan, actor: { userId: string | null; ip: string | null }, fileName: string | null,
): Promise<ImportEffects> {
  const effects: ImportEffects = { importId: randomUUID(), created: [], priceDrops: [], stockChanged: [] };
  for (const r of plan.rows) {
    const d = r.desired;
    if (!d || (r.action !== "create" && r.action !== "update")) continue;
    if (r.action === "create") {
      const id = randomUUID();
      await conn.query(
        `INSERT INTO products
           (id, name, slug, sku, price, compare_price, category_id, stock_quantity,
            brand, model, description, short_description, is_featured, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, d.name, d.slug, d.sku, d.price, d.compare_price, d.category_id, d.stock_quantity,
          d.brand, d.model, d.description, d.short_description, d.is_featured ? 1 : 0, d.is_active ? 1 : 0]
      );
      await replaceImages(conn, id, d.images ?? []);
      await saveClassification(conn, id, { tags: d.tags ?? [], metadata: d.metadata ?? {} });
      await logAudit({ action: "product_create", entityType: "product", entityId: id, ...actor, next: await productSnapshot(conn, id) }, conn);
      if (d.is_active) effects.created.push(id);
      continue;
    }
    const id = r.existingId!;
    await conn.query(
      `UPDATE products SET name = ?, slug = ?, price = ?, compare_price = ?, category_id = ?, stock_quantity = ?,
         brand = ?, model = ?, description = ?, short_description = ?, is_featured = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [d.name, d.slug, d.price, d.compare_price, d.category_id, d.stock_quantity, d.brand, d.model,
        d.description, d.short_description, d.is_featured ? 1 : 0, d.is_active ? 1 : 0, id]
    );
    if (r.changes.includes("imagenes")) await replaceImages(conn, id, d.images ?? []);
    await saveClassification(conn, id, {
      tags: r.changes.includes("etiquetas") ? d.tags : undefined,
      metadata: r.changes.includes("especificaciones") ? d.metadata : undefined,
    });
    const after = (await productSnapshot(conn, id))!;
    const diff = diffFields(r.before!, after);
    if (diff) await logAudit({ action: "product_update", entityType: "product", entityId: id, ...actor, ...diff }, conn);
    const prev = Number(r.before!.price);
    if (d.price < prev) effects.priceDrops.push({ id, previous: prev, next: d.price });
    if (r.changes.includes("stock")) effects.stockChanged.push(id);
  }
  await logAudit({
    action: "product_import", entityType: "product", entityId: effects.importId, ...actor,
    next: { archivo: fileName, creados: plan.summary.create, actualizados: plan.summary.update, sin_cambios: plan.summary.unchanged },
  }, conn);
  return effects;
}

async function replaceImages(conn: PoolConnection, productId: string, images: Array<{ url: string; alt: string | null }>) {
  await conn.query("DELETE FROM product_images WHERE product_id = ?", [productId]);
  for (let i = 0; i < images.length; i++) {
    await conn.query(
      "INSERT INTO product_images (id, product_id, image_url, alt_text, sort_order) VALUES (?, ?, ?, ?, ?)",
      [randomUUID(), productId, images[i].url, images[i].alt, i]
    );
  }
}
