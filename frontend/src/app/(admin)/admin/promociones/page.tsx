// =============================================
// PÁGINA ADMIN: GESTIÓN DE PROMOCIONES
// Lista y crea códigos de descuento.
// =============================================

import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatPrice } from "@/lib/utils/format";
import { Tag } from "lucide-react";
import type { Promotion } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const metadata: Metadata = { title: "Promociones — Admin" };
export const revalidate = 0;

export default async function AdminPromotionsPage() {
  let promotions: Promotion[] = [];
  try {
    const res = await fetch(`${API_URL}/reports/promotions`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json() as { data: Promotion[] };
      promotions = data.data;
    }
  } catch {
    promotions = [];
  }

  const TYPE_LABEL: Record<string, string> = {
    percentage:   "% Descuento",
    fixed_amount: "$ Fijo",
    free_shipping: "Envío gratis",
  };

  function formatValue(p: Promotion): string {
    if (p.type === "percentage")   return `-${p.value}%`;
    if (p.type === "fixed_amount") return `-${formatPrice(p.value)}`;
    return "Gratis";
  }

  const activeCount = promotions.filter((p) => p.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Promociones</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {promotions.length} código{promotions.length !== 1 ? "s" : ""} ·{" "}
            <span className="text-emerald-600 font-medium">{activeCount} activos</span>
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 bg-brand-600/60 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm cursor-not-allowed"
        >
          <Tag className="w-3.5 h-3.5" />
          Nueva promoción (próximamente)
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mínimo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Usos</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vence</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {promotions.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg text-xs tracking-wide">
                      {p.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-medium text-xs">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {TYPE_LABEL[p.type] ?? p.type}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-700 text-sm">
                    {formatValue(p)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {p.min_order_amount ? formatPrice(p.min_order_amount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 text-xs font-medium">
                    {p.current_uses}
                    <span className="text-slate-400">{p.max_uses ? ` / ${p.max_uses}` : " / ∞"}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {p.valid_until ? formatDate(p.valid_until) : "Sin vencimiento"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={p.is_active ? "success" : "default"}>
                      {p.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {promotions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-slate-400 text-sm">
                    No hay promociones creadas todavía
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
