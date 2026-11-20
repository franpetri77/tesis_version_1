"use client";

// =============================================
// R02 — TENDENCIAS DE COMPRA
// Unidades vendidas por período, variación entre períodos
// completos y desglose por categoría o producto.
// =============================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSalesTrend, type SalesTrend, type TrendGroup } from "@/lib/api/admin";
import { getCategories } from "@/lib/api/catalog";
import type { Category } from "@/types";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
// Fecha local (no UTC): a la noche, en Argentina, toISOString ya da el día siguiente.
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function defaultFrom(): string {
  const d = new Date();
  return isoDay(new Date(Date.UTC(d.getFullYear(), d.getMonth() - 5, 1)));
}
function shortDate(value: string): string {
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}
function Variation({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return (
    <span className={value < 0 ? "text-slate-500" : "text-slate-900"}>
      {sign}
      {Math.abs(value).toLocaleString("es-AR", { maximumFractionDigits: 1 })} %
    </span>
  );
}

const fieldLabel = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1.5";
const fieldInput =
  "rounded-lg border border-paper-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600";

export function TendenciasCompra() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(todayLocal());
  const [group, setGroup] = useState<TrendGroup>("month");
  const [by, setBy] = useState<"category" | "product">("category");
  const [categoryId, setCategoryId] = useState("");

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["catalog-categories"],
    queryFn: getCategories,
    staleTime: 300_000,
  });
  const { data, isLoading, isError, error } = useQuery<SalesTrend, Error>({
    queryKey: ["admin-sales-trend", from, to, group, by, categoryId],
    queryFn: () => getSalesTrend({ from, to, group, by, categoryId: categoryId || undefined }),
    staleTime: 60_000,
    retry: false,
  });

  const max = Math.max(1, ...(data?.series.map((s) => s.units) ?? [1]));

  return (
    <section className="rounded-xl border border-paper-300 bg-paper-50 p-5" aria-labelledby="tendencias-titulo">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-paper-300 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">R02 · Reporte del mandato</p>
          <h2 id="tendencias-titulo" className="text-lg font-semibold tracking-tight text-slate-900">
            Tendencias de compra
          </h2>
        </div>
        {data && (
          <p className="text-xs tabular-nums text-slate-500">
            {shortDate(data.period.from)} · {shortDate(data.period.to)}
          </p>
        )}
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="tend-desde" className={fieldLabel}>Desde</label>
          <input id="tend-desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldInput} />
        </div>
        <div>
          <label htmlFor="tend-hasta" className={fieldLabel}>Hasta</label>
          <input id="tend-hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={fieldInput} />
        </div>
        <div>
          <label htmlFor="tend-agrupacion" className={fieldLabel}>Agrupar por</label>
          <select id="tend-agrupacion" value={group} onChange={(e) => setGroup(e.target.value as TrendGroup)} className={fieldInput}>
            <option value="day">Día</option>
            <option value="week">Semana</option>
            <option value="month">Mes</option>
          </select>
        </div>
        <div>
          <label htmlFor="tend-categoria" className={fieldLabel}>Categoría</label>
          <select id="tend-categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={fieldInput}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tend-desglose" className={fieldLabel}>Desglose</label>
          <select id="tend-desglose" value={by} onChange={(e) => setBy(e.target.value as "category" | "product")} className={fieldInput}>
            <option value="category">Por categoría</option>
            <option value="product">Por producto</option>
          </select>
        </div>
      </div>

      {isError ? (
        <p role="alert" className="border-y border-paper-300 py-4 text-sm text-slate-600">
          {error?.message ?? "No se pudo obtener el reporte de tendencias."}
        </p>
      ) : isLoading || !data ? (
        <p className="border-y border-paper-300 py-4 text-sm text-slate-500">Cargando tendencias…</p>
      ) : (
        <>
          <div className="mb-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Unidades vendidas por período</p>
            <div className="flex items-end gap-2 overflow-x-auto pb-1" role="img"
              aria-label={`Unidades por período: ${data.series.map((s) => `${s.label} ${s.units}`).join(", ")}`}>
              {data.series.map((s) => (
                <div key={s.start} className="flex min-w-[44px] flex-1 flex-col items-center gap-1.5">
                  <span className="text-xs font-semibold tabular-nums text-slate-900">{s.units}</span>
                  <div className="flex h-36 w-full items-end">
                    <div
                      className={`w-full rounded-t-sm ${s.partial || s.open ? "bg-paper-400" : "bg-slate-700"}`}
                      style={{ height: `${Math.max(2, (s.units / max) * 100)}%` }}
                    />
                  </div>
                  <span className="whitespace-nowrap text-[11px] tabular-nums text-slate-500">{s.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Las barras claras son períodos parciales (recortados por el rango) o en curso al {shortDate(data.as_of.date)}, y no se comparan.
            </p>
          </div>

          <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <caption className="sr-only">Detalle por período</caption>
            <thead>
              <tr className="border-b border-paper-300 text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <th scope="col" className="py-2 font-semibold">Período</th>
                <th scope="col" className="py-2 text-right font-semibold">Unidades</th>
                <th scope="col" className="py-2 text-right font-semibold">Reembolsadas</th>
                <th scope="col" className="py-2 text-right font-semibold">Variación</th>
              </tr>
            </thead>
            <tbody>
              {data.series.map((s) => (
                <tr key={s.start} className="border-b border-paper-200">
                  <td className="py-2 text-slate-900">
                    {s.label}
                    {s.open ? (
                      <span className="ml-2 text-xs text-slate-500">en curso</span>
                    ) : s.partial ? (
                      <span className="ml-2 text-xs text-slate-500">parcial</span>
                    ) : null}
                  </td>
                  <td className="py-2 text-right text-slate-900">{s.units}</td>
                  <td className="py-2 text-right text-slate-500">{s.refunded_units}</td>
                  <td className="py-2 text-right"><Variation value={s.variation_pct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {data.breakdown_by === "product" ? "Productos" : "Categorías"} · último período cerrado frente al anterior
            </p>
            {data.comparison ? (
              <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">Desglose del último período completo frente al anterior</caption>
                <thead>
                  <tr className="border-b border-paper-300 text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    <th scope="col" className="py-2 font-semibold">{data.breakdown_by === "product" ? "Producto" : "Categoría"}</th>
                    <th scope="col" className="py-2 text-right font-semibold">{shortDate(data.comparison.current.start)} · {shortDate(data.comparison.current.end)}</th>
                    <th scope="col" className="py-2 text-right font-semibold">{shortDate(data.comparison.previous.start)} · {shortDate(data.comparison.previous.end)}</th>
                    <th scope="col" className="py-2 text-right font-semibold">Variación</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.length === 0 ? (
                    <tr><td colSpan={4} className="py-3 text-slate-500">Sin unidades vendidas en esos períodos.</td></tr>
                  ) : (
                    data.breakdown.map((b) => (
                      <tr key={b.id} className="border-b border-paper-200">
                        <td className="py-2 text-slate-900">{b.name}</td>
                        <td className="py-2 text-right text-slate-900">{b.units_current}</td>
                        <td className="py-2 text-right text-slate-500">{b.units_previous}</td>
                        <td className="py-2 text-right"><Variation value={b.variation_pct} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            ) : (
              <p className="border-y border-paper-300 py-3 text-sm text-slate-500">
                El rango no incluye dos períodos completos y cerrados consecutivos para comparar.
              </p>
            )}
          </div>

          <ul className="mt-5 space-y-1 border-t border-paper-300 pt-3 text-xs text-slate-500">
            {data.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </>
      )}
    </section>
  );
}
