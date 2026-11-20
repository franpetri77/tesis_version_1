"use client";

// =============================================
// COMPONENTE: ACCIONES CSV DEL LISTADO DE PRODUCTOS (T6b)
// Exportar está disponible también para solo lectura; importar, no.
// =============================================

import { useState } from "react";
import Link from "next/link";
import { Download, Upload, Loader2 } from "lucide-react";
import { downloadProductsCsv } from "@/lib/api/productCsv";
import { useCanEdit } from "@/hooks/usePanelRole";

const secondary =
  "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60 motion-reduce:transition-none";

export function ProductCsvActions() {
  const canEdit = useCanEdit();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      await downloadProductsCsv();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo exportar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={handleExport} disabled={busy} className={secondary}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        Exportar CSV
      </button>
      {canEdit && (
        <Link href="/admin/productos/importar" className={secondary}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Importar CSV
        </Link>
      )}
      {error && <p role="alert" className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
