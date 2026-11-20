"use client";

// =============================================
// PÁGINA: IMPORTAR PRODUCTOS DESDE CSV (T6b)
// 1. Elegir archivo → 2. Vista previa con errores por fila → 3. Confirmar.
// La confirmación aplica todo el archivo o nada, y queda auditada.
// =============================================

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle2, Download, FileUp, Loader2 } from "lucide-react";
import { useCanEdit } from "@/hooks/usePanelRole";
import { cn } from "@/lib/utils/cn";
import { adminButton, adminIconButton } from "@/components/admin/adminUi";
import {
  COLUMN_LABELS, MAX_CSV_BYTES, confirmProductImport, downloadProductsCsv, previewProductImport, readCsvFile,
  type ImportPlan, type ImportRow,
} from "@/lib/api/productCsv";

const card = "bg-white rounded-xl border border-slate-200 p-5 space-y-4";
const cardTitle = "text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100";
const secondary = adminButton("secondary", "md");

const ACTION_LABEL: Record<ImportRow["action"], string> = {
  create: "Se crea",
  update: "Se actualiza",
  unchanged: "Sin cambios",
  error: "Con errores",
};

export default function ImportProductsPage() {
  const canEdit = useCanEdit();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState<string | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [status, setStatus] = useState<"idle" | "reading" | "confirming">("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ImportPlan["summary"] | null>(null);

  async function handleFile(file: File | undefined) {
    setError(null);
    setPlan(null);
    setDone(null);
    setCsv(null);
    if (!file) return;
    setFileName(file.name);
    if (file.size > MAX_CSV_BYTES) {
      setError("El archivo supera los 2 MB. Dividilo en partes más chicas.");
      return;
    }
    setStatus("reading");
    try {
      const text = await readCsvFile(file);
      setCsv(text);
      setPlan(await previewProductImport(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo analizar el archivo");
    } finally {
      setStatus("idle");
    }
  }

  async function handleConfirm() {
    if (!csv || !plan) return;
    setStatus("confirming");
    setError(null);
    try {
      const r = await confirmProductImport(csv, plan, fileName);
      if (r.ok) {
        setDone(r.summary);
        setPlan(null);
        setCsv(null);
        if (inputRef.current) inputRef.current.value = "";
      } else {
        setError(r.error);
        if (r.plan) setPlan(r.plan);
      }
    } catch {
      // Un fallo de red no prueba que no se haya guardado: la conexión puede
      // cortarse después del commit.
      setError("No pudimos confirmar el resultado. Revisá el catálogo o la auditoría antes de volver a intentar.");
    } finally {
      setStatus("idle");
    }
  }

  async function handleDownload(template: boolean) {
    setError(null);
    try { await downloadProductsCsv(template); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo descargar"); }
  }

  const pending = plan ? plan.summary.create + plan.summary.update : 0;
  const blocked = !plan || plan.fileErrors.length > 0 || plan.summary.error > 0 || pending === 0;
  const visibleRows = plan ? plan.rows.filter((r) => !onlyIssues || r.action === "error") : [];

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/productos"
          aria-label="Volver al listado de productos"
          className={adminIconButton("secondary", "h-9 w-9")}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Importar productos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Alta y actualización masiva desde un archivo CSV</p>
        </div>
      </div>

      {!canEdit ? (
        <p className="text-sm text-slate-600 border-y border-paper-300 py-4">
          Tu usuario es de solo lectura: puede exportar el catálogo, pero no importar productos.{" "}
          <Link href="/admin/productos" className="font-semibold text-slate-900 underline underline-offset-2">Volver al listado</Link>
        </p>
      ) : (
        <>
          {/* Formato */}
          <section className={card}>
            <h2 className={cardTitle}>Formato del archivo</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
              <li>El <strong className="font-semibold text-slate-800">SKU</strong> identifica cada producto: si ya existe se actualiza; si no, se crea.</li>
              <li>Para un producto nuevo son obligatorios <strong className="font-semibold text-slate-800">nombre, categoría y precio</strong>. La categoría va por su slug o su nombre.</li>
              <li>Si una columna no está en el archivo, se conserva lo actual. Una celda vacía en una columna presente borra ese dato.</li>
              <li>Precios con coma o punto solo para los centavos (45999,50). Activo y destacado: «sí» o «no».</li>
              <li>Etiquetas separadas por comas; especificaciones como objeto JSON ({"{"}&quot;Color&quot;:&quot;Negro&quot;{"}"}); imágenes con URL separadas por «|».</li>
            </ul>
            <p className="text-xs text-slate-500">Lo más simple: exportá el catálogo, editalo en la planilla y volvé a importarlo. Hasta 1000 productos y 2 MB por archivo.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleDownload(false)} className={secondary}>
                <Download className="h-4 w-4" aria-hidden="true" /> Exportar catálogo actual
              </button>
              <button type="button" onClick={() => handleDownload(true)} className={secondary}>
                <Download className="h-4 w-4" aria-hidden="true" /> Descargar plantilla vacía
              </button>
            </div>
          </section>

          {/* Archivo */}
          <section className={card}>
            <h2 className={cardTitle}>Archivo</h2>
            <label htmlFor="csv-file" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Archivo CSV</label>
            <input
              id="csv-file"
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
              disabled={status !== "idle"}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border file:border-slate-200 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-50"
            />
            {status === "reading" && (
              <p className="flex items-center gap-2 text-sm text-slate-500" role="status">
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Analizando el archivo…
              </p>
            )}
          </section>

          {error && (
            <div role="alert" className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {done && (
            <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-emerald-800">
                Importación completa: {done.create} creados, {done.update} actualizados y {done.unchanged} sin cambios.{" "}
                <Link href="/admin/productos" className="font-semibold underline underline-offset-2">Ver productos</Link>{" · "}
                <Link href="/admin/auditoria" className="font-semibold underline underline-offset-2">Ver auditoría</Link>
              </p>
            </div>
          )}

          {/* Vista previa */}
          {plan && (
            <section className={card} aria-labelledby="preview-title">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <h2 id="preview-title" className="text-sm font-semibold text-slate-700">Vista previa{fileName ? ` · ${fileName}` : ""}</h2>
                <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {([["create", "Se crean"], ["update", "Se actualizan"], ["unchanged", "Sin cambios"], ["error", "Con errores"]] as const).map(([k, label]) => (
                    <div key={k} className="flex items-baseline gap-1.5">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className={cn("font-semibold tabular-nums", k === "error" && plan.summary.error > 0 ? "text-red-600" : "text-slate-900")}>{plan.summary[k]}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {plan.fileErrors.length > 0 && (
                <ul className="space-y-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {plan.fileErrors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}
              {plan.ignoredColumns.length > 0 && (
                <p className="text-xs text-slate-500">Columnas que no se usan y se ignoran: {plan.ignoredColumns.join(", ")}.</p>
              )}

              {plan.rows.length > 0 && (
                <>
                  {plan.summary.error > 0 && (
                    <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} className="rounded border-slate-300 text-brand-600 focus-visible:ring-brand-600" />
                      Mostrar solo las filas con errores
                    </label>
                  )}
                  <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th scope="col" className="px-3 py-2 font-semibold">Línea</th>
                          <th scope="col" className="px-3 py-2 font-semibold">SKU</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Nombre</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Resultado</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleRows.map((r) => (
                          <tr key={r.line} className={r.action === "error" ? "bg-red-50/60" : undefined}>
                            <td className="px-3 py-2 tabular-nums text-slate-500">{r.line}</td>
                            <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-slate-700">{r.sku || "—"}</td>
                            <td className="px-3 py-2 text-slate-900">{r.name || "—"}</td>
                            <td className={cn("px-3 py-2 whitespace-nowrap font-medium", r.action === "error" ? "text-red-700" : r.action === "unchanged" ? "text-slate-400" : "text-slate-900")}>
                              {ACTION_LABEL[r.action]}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {r.action === "error" ? (
                                <ul className="space-y-0.5 text-red-700">
                                  {r.errors.map((e, i) => (
                                    <li key={i}>{e.column ? <span className="font-semibold">{COLUMN_LABELS[e.column]}: </span> : null}{e.message}</li>
                                  ))}
                                </ul>
                              ) : r.action === "update" ? (
                                r.changes.map((c) => COLUMN_LABELS[c]).join(", ")
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={blocked || status !== "idle"}
                  aria-busy={status === "confirming"}
                  className={adminButton("primary", "md")}
                >
                  {status === "confirming" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <FileUp className="h-4 w-4" aria-hidden="true" />}
                  Confirmar importación{pending > 0 ? ` (${pending} ${pending === 1 ? "producto" : "productos"})` : ""}
                </button>
                <p className="text-xs text-slate-500">
                  {plan.fileErrors.length > 0 || plan.summary.error > 0
                    ? "Corregí los errores en el archivo y volvé a cargarlo: no se importa nada mientras haya errores."
                    : pending === 0
                      ? "El archivo no trae cambios respecto del catálogo actual."
                      : "Se aplica todo el archivo o nada, y cada cambio queda en la auditoría."}
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
