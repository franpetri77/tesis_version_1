"use client";

// =============================================
// ADMIN: DETALLE DEL PEDIDO (T3)
// Cliente, ítems, pagos, historial de estados y acciones para
// avanzar el pedido por su circuito (preparación → listo →
// enviado o retirado → entregado).
// =============================================

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Badge, ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "@/components/ui/Badge";
import { formatDateTime, formatPrice } from "@/lib/utils/format";
import { getAdminOrder, updateOrderStatus, type AdminOrderDetail } from "@/lib/api/admin";
import type { OrderStatus } from "@/types";

const label = "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500";
const statusText = (s: string | null) => (s ? ORDER_STATUS_LABEL[s as OrderStatus] ?? s : "—");
const PAYMENT_LABEL: Record<string, string> = { approved: "aprobado", pending: "pendiente", rejected: "rechazado", cancelled: "cancelado", refunded: "reembolsado" };

export function PedidoDetalle({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);   // transición elegida, a confirmar
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrder(await getAdminOrder(orderId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo obtener el pedido");
    }
  }, [orderId]);
  useEffect(() => { void load(); }, [load]);

  async function confirm() {
    if (!pending) return;
    setSaving(true);
    setActionError(null);
    try {
      await updateOrderStatus(orderId, pending, note);
      setPending(null);
      setNote("");
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/admin/pedidos" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Pedidos</Link>
        <p role="alert" className="border-y border-paper-300 py-4 text-sm text-slate-600">{error}</p>
      </div>
    );
  }
  if (!order) return <p className="py-6 text-sm text-slate-500">Cargando pedido…</p>;

  const address = order.shipping_address;
  const primary = order.allowed_transitions.find((t) => t.status !== "cancelled");
  const cancel = order.allowed_transitions.find((t) => t.status === "cancelled");

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <Link href="/admin/pedidos" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Pedidos
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-paper-300 pb-4">
          <div>
            <p className={label}>Pedido · {order.delivery_method === "pickup" ? "Retiro en el local" : "Envío a domicilio"}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{order.order_number}</h1>
            <p className="mt-1 text-sm text-slate-500 tabular-nums">{formatDateTime(order.created_at)}</p>
          </div>
          <Badge variant={ORDER_STATUS_VARIANT[order.status as OrderStatus] ?? "default"}>{statusText(order.status)}</Badge>
        </div>
      </div>

      {/* ---- Acciones ---- */}
      <section aria-labelledby="acciones" className="rounded-xl border border-paper-300 bg-paper-50 p-5">
        <h2 id="acciones" className={label}>Estado del pedido</h2>
        {order.allowed_transitions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            {order.status === "delivered" ? "El pedido ya fue entregado." :
             order.status === "cancelled" || order.status === "refunded" ? "El pedido está cerrado." :
             "No hay acciones disponibles para este estado."}
          </p>
        ) : pending ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-900">
              ¿Pasar el pedido de <strong>{statusText(order.status)}</strong> a <strong>{statusText(pending)}</strong>?
              {pending === "cancelled" && " Se repone el stock reservado y se devuelve el cupón, si lo había."}
            </p>
            <div>
              <label htmlFor="nota-estado" className={`${label} mb-1.5 block`}>Nota (opcional)</label>
              <input id="nota-estado" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500}
                placeholder={pending === "shipped" ? "Ej.: número de seguimiento" : "Ej.: retiró en sucursal"}
                className="w-full max-w-md rounded-lg border border-paper-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600" />
            </div>
            {actionError && <p role="alert" className="text-sm text-slate-700">{actionError}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={confirm} disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
                {saving ? "Guardando…" : "Confirmar"}
              </button>
              <button type="button" onClick={() => { setPending(null); setActionError(null); }} disabled={saving}
                className="rounded-lg border border-paper-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-paper-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
                Volver
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {primary && (
              <button type="button" onClick={() => setPending(primary.status)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
                Pasar a «{primary.label}»
              </button>
            )}
            {cancel && (
              <button type="button" onClick={() => setPending(cancel.status)}
                className="rounded-lg border border-paper-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-paper-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
                Cancelar pedido
              </button>
            )}
            {["paid", "processing", "ready_to_ship", "shipped"].includes(order.status) && (
              <p className="w-full text-xs text-slate-500">Un pedido pagado se cancela reembolsándolo desde Mercado Pago; el sistema registra el reembolso y repone el stock.</p>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* ---- Ítems ---- */}
        <section aria-labelledby="items">
          <h2 id="items" className={`${label} mb-2`}>Productos</h2>
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-paper-300 text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <th scope="col" className="py-2 font-semibold">Producto</th>
                <th scope="col" className="py-2 text-right font-semibold">Cant.</th>
                <th scope="col" className="py-2 text-right font-semibold">Precio</th>
                <th scope="col" className="py-2 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id} className="border-b border-paper-200">
                  <td className="py-2 text-slate-900">{i.product_name ?? "Producto eliminado"}{i.sku && <span className="ml-2 text-xs text-slate-500">{i.sku}</span>}</td>
                  <td className="py-2 text-right">{i.quantity}</td>
                  <td className="py-2 text-right text-slate-600">{formatPrice(i.unit_price)}</td>
                  <td className="py-2 text-right text-slate-900">{formatPrice(i.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="ml-auto mt-3 max-w-xs space-y-1 text-sm tabular-nums">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            {order.discount_amount > 0 && <div className="flex justify-between"><dt className="text-slate-500">Descuento</dt><dd>− {formatPrice(order.discount_amount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-slate-500">Envío</dt><dd>{order.shipping_cost > 0 ? formatPrice(order.shipping_cost) : "Sin cargo"}</dd></div>
            <div className="flex justify-between border-t border-paper-300 pt-1 font-semibold text-slate-900"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
          </dl>
        </section>

        {/* ---- Cliente, entrega y pagos ---- */}
        <aside className="space-y-6 text-sm">
          <section aria-labelledby="cliente">
            <h2 id="cliente" className={`${label} mb-2`}>Cliente</h2>
            <p className="text-slate-900">{order.user_first_name} {order.user_last_name}</p>
            <p className="text-slate-600">{order.user_email}</p>
            {order.user_phone && <p className="text-slate-600 tabular-nums">{order.user_phone}</p>}
          </section>
          <section aria-labelledby="entrega">
            <h2 id="entrega" className={`${label} mb-2`}>Entrega</h2>
            {order.delivery_method === "pickup" ? <p className="text-slate-900">Retiro en el local</p> : address ? (
              <p className="text-slate-900">
                {address.street} {address.number}{address.floor ? `, piso ${address.floor}` : ""}{address.apartment ? ` ${address.apartment}` : ""}<br />
                {address.city}, {address.province} ({address.postal_code})
              </p>
            ) : <p className="text-slate-500">Sin dirección registrada</p>}
            {order.notes && <p className="mt-2 text-slate-600">Nota del cliente: {order.notes}</p>}
          </section>
          <section aria-labelledby="pagos">
            <h2 id="pagos" className={`${label} mb-2`}>Pagos (Mercado Pago)</h2>
            {order.payments.length === 0 ? <p className="text-slate-500">Sin pagos registrados</p> : (
              <ul className="divide-y divide-paper-200 border-y border-paper-300">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2 py-2 tabular-nums">
                    <span className="text-slate-600">{p.mp_payment_id ?? "—"} · {PAYMENT_LABEL[p.status] ?? p.status}</span>
                    <span className="text-slate-900">{p.amount === null ? "sin importe" : formatPrice(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {/* ---- Historial ---- */}
      <section aria-labelledby="historial">
        <h2 id="historial" className={`${label} mb-2`}>Historial de estados</h2>
        {order.history.length === 0 ? <p className="text-sm text-slate-500">Todavía no hubo cambios de estado desde el panel.</p> : (
          <ol className="border-l border-paper-300 pl-4 text-sm">
            {order.history.map((h) => (
              <li key={h.id} className="mb-3">
                <p className="text-slate-900">{statusText(h.from)} → {statusText(h.to)}</p>
                <p className="text-xs text-slate-500 tabular-nums">{formatDateTime(h.at)}{h.by ? ` · ${h.by}` : ""}</p>
                {h.note && <p className="text-slate-600">{h.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
