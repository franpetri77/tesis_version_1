// =============================================
// COMPONENTE: ORDER SUMMARY
// Panel "Resumen de compra" compartido por /carrito y /checkout: filas de
// importes, total destacado y la acción principal (children). La página
// decide si lo fija al hacer scroll (envolviéndolo en un contenedor sticky).
// =============================================

import { Truck, Store, Lock, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export interface SummaryLine {
  label: string;
  value: string;
  /** discount: verde con signo menos · free: "Gratis" en verde · muted: gris */
  tone?: "discount" | "free" | "muted";
  /** Importe anterior tachado (p. ej. envío bonificado) */
  strike?: string;
}

interface OrderSummaryProps {
  lines: SummaryLine[];
  total: number;
  /** Texto bajo el total (p. ej. "Ahorrás $ 10.000") */
  totalNote?: string;
  children?: React.ReactNode;
  /** Contenido entre las filas y el total (p. ej. cupón) */
  extra?: React.ReactNode;
}

export function OrderSummary({ lines, total, totalNote, children, extra }: OrderSummaryProps) {
  return (
    <aside className="rounded-2xl border border-paper-300 bg-paper-50 p-5 shadow-card sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">Resumen de compra</h2>

      <dl className="mt-4 space-y-2.5 text-sm">
        {lines.map((l) => (
          <div key={l.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-slate-600">{l.label}</dt>
            <dd
              className={cn(
                "text-right tabular-nums",
                l.tone === "discount" || l.tone === "free" ? "font-medium text-emerald-700" : l.tone === "muted" ? "text-xs text-slate-500" : "text-slate-900"
              )}
            >
              {l.strike && <span className="mr-1.5 text-xs font-normal text-slate-400 line-through">{l.strike}</span>}
              {l.value}
            </dd>
          </div>
        ))}
      </dl>

      {extra && <div className="mt-4">{extra}</div>}

      <div className="mt-4 border-t border-paper-300 pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-base font-semibold text-slate-900">Total</span>
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{formatPrice(total)}</span>
        </div>
        {totalNote && <p className="mt-1 text-right text-xs font-medium text-emerald-700">{totalNote}</p>}
      </div>

      {children && <div className="mt-5 space-y-3">{children}</div>}
    </aside>
  );
}

/** Lista de garantías de compra que acompaña al resumen. */
export function PurchaseAssurances({ className }: { className?: string }) {
  const items = [
    { icon: Lock,        text: "Pago seguro con Mercado Pago" },
    { icon: ShieldCheck, text: "Garantía oficial y factura" },
    { icon: Truck,       text: "Envío a todo el país" },
    { icon: Store,       text: "Retiro sin costo en el local" },
  ];
  return (
    <ul className={cn("space-y-2.5 rounded-2xl border border-paper-300 bg-paper-50 p-5 text-sm text-slate-600", className)}>
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  );
}
