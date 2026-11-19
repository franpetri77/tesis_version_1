// =============================================
// API: IMPORTAR Y EXPORTAR PRODUCTOS EN CSV (T6b)
// =============================================

import { getAdminToken } from "./admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const MAX_CSV_BYTES = 2 * 1024 * 1024;

export type CsvColumn =
  | "sku" | "nombre" | "slug" | "categoria" | "marca" | "modelo" | "precio" | "precio_anterior" | "stock"
  | "activo" | "destacado" | "descripcion_corta" | "descripcion" | "etiquetas" | "especificaciones" | "imagenes";

export const COLUMN_LABELS: Record<CsvColumn, string> = {
  sku: "SKU", nombre: "Nombre", slug: "Slug", categoria: "Categoría", marca: "Marca", modelo: "Modelo",
  precio: "Precio", precio_anterior: "Precio anterior", stock: "Stock", activo: "Activo", destacado: "Destacado",
  descripcion_corta: "Descripción corta", descripcion: "Descripción", etiquetas: "Etiquetas",
  especificaciones: "Especificaciones", imagenes: "Imágenes",
};

export interface ImportIssue { column: CsvColumn | null; message: string }
export interface ImportRow {
  line: number;
  sku: string;
  name: string;
  action: "create" | "update" | "unchanged" | "error";
  changes: CsvColumn[];
  errors: ImportIssue[];
}
export interface ImportPlan {
  fileErrors: string[];
  columns: CsvColumn[];
  ignoredColumns: string[];
  rows: ImportRow[];
  summary: { total: number; create: number; update: number; unchanged: number; error: number };
  hash: string;
  signature: string;
}

async function send(path: string, body: unknown): Promise<{ ok: boolean; status: number; error?: string; data?: unknown }> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; data?: unknown };
  return { ok: res.ok, status: res.status, error: json.error, data: json.data };
}

export async function previewProductImport(csv: string): Promise<ImportPlan> {
  const r = await send("/admin/products/import/preview", { csv });
  if (!r.ok) throw new Error(r.error ?? `Error ${r.status}`);
  return r.data as ImportPlan;
}

export type ConfirmResult =
  | { ok: true; summary: ImportPlan["summary"] }
  | { ok: false; error: string; plan?: ImportPlan };

/** Confirma con el mismo archivo y las huellas de la vista previa. */
export async function confirmProductImport(csv: string, plan: ImportPlan, fileName: string): Promise<ConfirmResult> {
  const r = await send("/admin/products/import", { csv, hash: plan.hash, signature: plan.signature, file_name: fileName.slice(0, 255) });
  if (r.ok) return { ok: true, summary: (r.data as { summary: ImportPlan["summary"] }).summary };
  return { ok: false, error: r.error ?? `Error ${r.status}`, plan: r.data as ImportPlan | undefined };
}

/** Descarga el catálogo (o la plantilla vacía) como archivo CSV. */
export async function downloadProductsCsv(template = false): Promise<void> {
  const res = await fetch(`${API_URL}/admin/products/export${template ? "?plantilla=1" : ""}`, {
    headers: { Authorization: `Bearer ${getAdminToken()}` },
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? `Error ${res.status}`);
  }
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "productos.csv";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Lee el archivo como texto. Las planillas guardan "CSV UTF-8" o, con la
 * opción "CSV" común, en Windows-1252: si no es UTF-8 válido se usa esa.
 */
export async function readCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}
