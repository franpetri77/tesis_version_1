// =============================================
// PÁGINA ADMIN: GESTIÓN DE PEDIDOS
// Lista de pedidos con filtro por estado.
// El admin puede cambiar el estado de cada pedido.
// =============================================

import type { Metadata } from "next";
import Link from "next/link";
import { Badge, ORDER_STATUS_VARIANT, ORDER_STATUS_LABEL } from "@/components/ui/Badge";
import { formatPrice, formatDateTime } from "@/lib/utils/format";
import type { Order } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const metadata: Metadata = { title: "Pedidos — Admin" };
export const revalidate = 0;

interface AdminOrdersPageProps {
  searchParams: { estado?: string };
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const statusFilter = searchParams.estado;

  const qs = statusFilter ? `?status=${statusFilter}` : "";
  let orders: Order[] = [];
  try {
    const res = await fetch(`${API_URL}/reports/orders${qs}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json() as { data: Order[] };
      orders = data.data;
    }
  } catch {
    orders = [];
  }

  const statusTabs = [
    { label: "Todos",         value: "" },
    { label: "Pendientes",    value: "pending" },
    { label: "Pagados",       value: "paid" },
    { label: "En preparación",value: "processing" },
    { label: "Enviados",      value: "shipped" },
    { label: "Entregados",    value: "delivered" },
    { label: "Cancelados",    value: "cancelled" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Pedidos</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {orders.length} pedido{orders.length !== 1 ? "s" : ""} encontrado{orders.length !== 1 ? "s" : ""}
          {statusFilter ? ` con estado "${ORDER_STATUS_LABEL[statusFilter as keyof typeof ORDER_STATUS_LABEL] ?? statusFilter}"` : ""}
        </p>
      </div>

      {/* Tabs de filtro por estado */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/admin/pedidos?estado=${tab.value}` : "/admin/pedidos"}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              (statusFilter ?? "") === tab.value
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Tabla de pedidos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Entrega
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => {
                const user = typeof order.user_id === "object" ? order.user_id : null;
                return (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3">
                      {user ? (
                        <div>
                          <p className="font-medium text-slate-800 text-xs">
                            {(user as unknown as { first_name: string; last_name: string }).first_name}{" "}
                            {(user as unknown as { first_name: string; last_name: string }).last_name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {(user as unknown as { email: string }).email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {order.created_at ? formatDateTime(order.created_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                        {ORDER_STATUS_LABEL[order.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {order.delivery_method === "pickup" ? "🏪 Retiro" : "🚚 Envío"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="text-brand-600 hover:text-brand-700 text-xs font-semibold transition-colors"
                      >
                        Ver / Gestionar
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-slate-400 text-sm">
                    No hay pedidos con este filtro.
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
