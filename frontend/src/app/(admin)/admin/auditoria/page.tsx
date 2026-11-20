"use client";

// =============================================
// PÁGINA ADMIN: AUDITORÍA
// Muestra el registro de acciones del sistema
// (audit_logs). Permite filtrar por acción, entidad,
// operador y rango de fechas, y paginar resultados.
// =============================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight,
  Package, UserCog, UserX, PackagePlus, PackageX, Pencil, Power, MessageSquare, Tag, FileUp
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
const ACTION_META: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  stock_ingreso:  { label: "Ingreso",            color: "text-slate-700 bg-paper-100", Icon: ArrowDownCircle },
  stock_egreso:   { label: "Egreso",             color: "text-slate-900 bg-paper-200",         Icon: ArrowUpCircle },
  order_status:   { label: "Estado de pedido",   color: "text-slate-700 bg-paper-100",     Icon: Package },
  product_create: { label: "Alta de producto",   color: "text-slate-700 bg-paper-100", Icon: PackagePlus },
  product_update: { label: "Edición de producto", color: "text-slate-700 bg-paper-100",   Icon: Pencil },
  product_import: { label: "Importación CSV",    color: "text-slate-700 bg-paper-100",   Icon: FileUp },
  product_toggle: { label: "Activación",         color: "text-slate-700 bg-paper-100",    Icon: Power },
  product_delete: { label: "Baja de producto",   color: "text-slate-900 bg-paper-200",         Icon: PackageX },
  user_role:      { label: "Cambio de rol",      color: "text-slate-700 bg-paper-100",     Icon: UserCog },
  user_delete:    { label: "Baja de usuario",    color: "text-slate-900 bg-paper-200",         Icon: UserX },
  review_approve: { label: "Reseña aprobada",    color: "text-slate-700 bg-paper-100", Icon: MessageSquare },
  review_hide:    { label: "Reseña oculta",      color: "text-slate-700 bg-paper-100",    Icon: MessageSquare },
  review_delete:  { label: "Reseña eliminada",   color: "text-slate-900 bg-paper-200",         Icon: MessageSquare },
  // Acciones que registra el ABM de promociones (T4)
  promotion_create: { label: "Alta de promoción",   color: "text-slate-700 bg-paper-100", Icon: Tag },
  promotion_update: { label: "Edición de promoción", color: "text-slate-700 bg-paper-100",   Icon: Tag },
};
function actionMeta(action: string): { label: string; color: string; Icon: React.ElementType } {
  return ACTION_META[action] ?? { label: action, color: "text-slate-600 bg-slate-100", Icon: ClipboardList };
}

const FIELD_LABEL: Record<string, string> = {
  status: "estado", role: "rol", price: "precio", compare_price: "precio anterior",
  stock_quantity: "stock", is_active: "activo", is_approved: "aprobada", name: "nombre",
  code: "código", value: "valor", max_uses: "límite de usos", min_order_amount: "compra mínima",
  valid_from: "vigente desde", valid_until: "vigente hasta",
};
// Campos técnicos que no aportan al resumen aunque vengan en la fila completa
const SKIP_FIELDS = new Set(["reason", "id", "created_at", "updated_at"]);
// Resume en una línea los campos que cambiaron (para acciones que no son de stock)
function summarizeChange(prevRaw: string | null, nextRaw: string | null): string | null {
  const parse = (raw: string | null) => {
    if (!raw) return {} as Record<string, unknown>;
    try { const o = JSON.parse(raw); return o && typeof o === "object" ? o as Record<string, unknown> : {}; }
    catch { return {}; }
  };
  const prev = parse(prevRaw), next = parse(nextRaw);
  const show = (v: unknown) => v === true ? "sí" : v === false ? "no" : v == null ? "—" : String(v);
  // Algunas acciones (p. ej. promociones) guardan la fila completa antes y después:
  // se muestran sólo los campos cuyo valor cambió.
  const same = (k: string) => k in prev && k in next && JSON.stringify(prev[k]) === JSON.stringify(next[k]);
  const keys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]))
    .filter((k) => !SKIP_FIELDS.has(k) && !same(k));
  if (keys.length === 0) return null;
  return keys.slice(0, 3).map((k) => {
    const label = FIELD_LABEL[k] ?? k.replace(/_/g, " ");
    if (!(k in next)) return `${label}: ${show(prev[k])}`;
    if (!(k in prev)) return `${label}: ${show(next[k])}`;
    return `${label}: ${show(prev[k])} → ${show(next[k])}`;
  }).join(" · ");
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
  { value: "", label: "Todas las acciones" },
  ...Object.entries(ACTION_META).map(([value, m]) => ({ value, label: m.label })),
];

const ENTITY_OPTIONS = [
  { value: "",        label: "Todas las entidades" },
  { value: "order",   label: "Pedidos" },
  { value: "product", label: "Productos" },
  { value: "user",    label: "Usuarios" },
  { value: "review",  label: "Reseñas" },
  { value: "promotion", label: "Promociones" },
];

interface Operator { id: string; first_name: string | null; last_name: string | null; email: string; role: string }

const CONTROL = "px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400";

export default function AuditoriaPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);

  // Operadores (todo usuario que no sea cliente) para el filtro por responsable
  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ["audit-operators"],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/users`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) return [];
      const body = await res.json() as { data: Operator[] };
      return body.data.filter((u) => u.role !== "customer");
    },
    staleTime: 60_000,
  });

  const { data, isLoading, isError } = useQuery<AuditResponse>({
    queryKey: ["audit-logs", actionFilter, entityFilter, userFilter, from, to, offset],
    queryFn: async () => {
      const token = getToken();
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entity_type", entityFilter);
      if (userFilter)   params.set("user_id", userFilter);
      if (from)         params.set("from", from);
      if (to)           params.set("to", to);
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

  // Cualquier cambio de filtro vuelve a la primera página
  function withReset<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setOffset(0); };
  }
  const hasFilters = Boolean(actionFilter || entityFilter || userFilter || from || to);
  function clearFilters() {
    setActionFilter(""); setEntityFilter(""); setUserFilter(""); setFrom(""); setTo(""); setOffset(0);
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

      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Acción
          <select value={actionFilter} onChange={(e) => withReset(setActionFilter)(e.target.value)} className={cn(CONTROL, "min-w-[180px]")}>
            {FILTER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Entidad
          <select value={entityFilter} onChange={(e) => withReset(setEntityFilter)(e.target.value)} className={CONTROL}>
            {ENTITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Responsable
          <select value={userFilter} onChange={(e) => withReset(setUserFilter)(e.target.value)} className={cn(CONTROL, "min-w-[160px]")}>
            <option value="">Todos</option>
            {operators.map((u) => (
              <option key={u.id} value={u.id}>
                {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Desde
          <input type="date" value={from} max={to || undefined} onChange={(e) => withReset(setFrom)(e.target.value)} className={CONTROL} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Hasta
          <input type="date" value={to} min={from || undefined} onChange={(e) => withReset(setTo)(e.target.value)} className={CONTROL} />
        </label>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="px-3 py-2 text-sm font-medium text-brand-600 hover:text-brand-700">
            Limpiar filtros
          </button>
        )}
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
                    Entidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Operador
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Cambio
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
                  const isStock = log.action.startsWith("stock_");
                  const summary = isStock ? null : summarizeChange(log.previous_value, log.new_value);

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
                        {isStock && prev !== null && next !== null ? (
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
                        ) : summary ? (
                          <span className="block max-w-[260px] truncate text-xs text-slate-600" title={summary}>{summary}</span>
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
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
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
