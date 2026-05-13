"use client";

// =============================================
// PÁGINA ADMIN: AUDITORÍA
// Muestra el registro de acciones del sistema
// (audit_logs). Permite filtrar por tipo de acción
// y paginar resultados.
// =============================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const PAGE_SIZE = 50;

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  user_name: string | null;
  entity_name: string | null;
  previous_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditResponse {
  data: AuditLog[];
  meta: { total: number; limit: number; offset: number };
}

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("tele_import_token") : null;
}

// Interpreta el campo action para mostrar etiqueta y color
function actionMeta(action: string): { label: string; color: string; Icon: React.ElementType } {
  if (action === "stock_ingreso") return { label: "Ingreso",  color: "text-emerald-600 bg-emerald-50", Icon: ArrowDownCircle };
  if (action === "stock_egreso")  return { label: "Egreso",   color: "text-red-600 bg-red-50",         Icon: ArrowUpCircle };
  return { label: action, color: "text-slate-600 bg-slate-100", Icon: ClipboardList };
}

// Extrae el stock_quantity de un JSON almacenado como string
function parseStock(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (typeof obj.stock_quantity === "number") return obj.stock_quantity;
  } catch { /* noop */ }
  return null;
}

// Extrae el motivo del campo new_value
function parseReason(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (typeof obj.reason === "string" && obj.reason) return obj.reason;
  } catch { /* noop */ }
  return null;
}

const FILTER_OPTIONS = [
  { value: "",               label: "Todas las acciones" },
  { value: "stock_ingreso",  label: "Ingresos de stock"  },
  { value: "stock_egreso",   label: "Egresos de stock"   },
];

export default function AuditoriaPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError } = useQuery<AuditResponse>({
    queryKey: ["audit-logs", actionFilter, offset],
    queryFn: async () => {
      const token = getToken();
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (actionFilter) params.set("action", actionFilter);
      const res = await fetch(`${API_URL}/admin/audit-logs?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al cargar auditoría");
      return res.json() as Promise<AuditResponse>;
    },
    staleTime: 15_000,
  });

  const logs  = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function handleFilterChange(value: string) {
    setActionFilter(value);
    setOffset(0);
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Auditoría del sistema</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro de acciones realizadas por operadores
          </p>
        </div>

        {/* Filtro por acción */}
        <select
          value={actionFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700
                     bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30
                     focus:border-brand-400 min-w-[180px]"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
            <ClipboardList className="w-5 h-5 animate-pulse" />
            Cargando registros...
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-16 text-red-500 text-sm">
            Error al cargar los registros de auditoría.
          </div>
        )}

        {!isLoading && !isError && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <ClipboardList className="w-10 h-10 opacity-30" />
            <p className="text-sm">No hay registros para mostrar.</p>
          </div>
        )}

        {!isLoading && !isError && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    Fecha y hora
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Acción
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Operador
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Motivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => {
                  const meta   = actionMeta(log.action);
                  const prev   = parseStock(log.previous_value);
                  const next   = parseStock(log.new_value);
                  const reason = parseReason(log.new_value);
                  const diff   = prev !== null && next !== null ? next - prev : null;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold",
                          meta.color
                        )}>
                          <meta.Icon className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium max-w-[180px] truncate">
                        {log.entity_name ?? log.entity_id}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {log.user_name ?? <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {prev !== null && next !== null ? (
                          <span className="flex items-center gap-1 text-xs">
                            <span className="text-slate-500">{prev}</span>
                            <span className="text-slate-300">→</span>
                            <span className={cn(
                              "font-semibold",
                              diff !== null && diff > 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                              {next}
                            </span>
                            {diff !== null && (
                              <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                diff > 0
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              )}>
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[140px] truncate">
                        {reason ?? <span className="italic text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono whitespace-nowrap">
                        {log.ip_address ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total} registros
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40
                         disabled:cursor-not-allowed transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-medium text-slate-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40
                         disabled:cursor-not-allowed transition-colors"
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
