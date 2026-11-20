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
import { adminButton } from "@/components/admin/adminUi";

const secondary = adminButton("secondary", "md");

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
