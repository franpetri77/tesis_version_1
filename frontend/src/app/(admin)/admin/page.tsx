// =============================================
// PÁGINA: DASHBOARD ADMIN
// Muestra métricas clave: pedidos hoy, ventas del mes,
// productos sin stock y últimos pedidos.
// =============================================

import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, TrendingUp, Package, Users, ArrowRight, Clock } from "lucide-react";
import { Badge, ORDER_STATUS_VARIANT, ORDER_STATUS_LABEL } from "@/components/ui/Badge";
import { formatPrice, formatDateTime } from "@/lib/utils/format";
import type { Order, Product } from "@/types";

export const metadata: Metadata = { title: "Dashboard — Admin" };
export const revalidate = 0;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchJson<T>(path: string): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return [] as unknown as T;
    const data = await res.json() as { data: T };
    return data.data;
  } catch {
    return [] as unknown as T;
  }
}

export default async function AdminDashboardPage() {
  const [allOrders, allProducts] = await Promise.all([
    fetchJson<Order[]>("/reports/orders?limit=100"),
    fetchJson<Product[]>("/catalog/products?limit=1000"),
  ]);

  // Calcular métricas
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ordersToday = allOrders.filter((o) => {
    if (!o.created_at) return false;
    return new Date(o.created_at) >= today;
  });

  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const salesThisMonth = allOrders
    .filter((o) => {
      if (!["paid", "delivered", "processing", "shipped"].includes(o.status)) return false;
      if (!o.created_at) return false;
      return new Date(o.created_at) >= thisMonth;
    })
    .reduce((sum, o) => sum + (o.total ?? 0), 0);

  const outOfStock = allProducts.filter((p) => p.stock_quantity <= 0).length;
  const lowStock = allProducts.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 5).length;

  const metrics = [
    {
      label: "Pedidos hoy",
      value: ordersToday.length,
      sub: ordersToday.length === 1 ? "pedido nuevo" : "pedidos nuevos",
      icon: ShoppingBag,
      color: "text-brand-600",
      bg: "bg-brand-50",
      iconBg: "bg-brand-100",
    },
    {
      label: "Ventas del mes",
      value: formatPrice(salesThisMonth),
      sub: "pedidos pagados",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100",
    },
    {
      label: "Sin stock",
      value: outOfStock,
      sub: `${lowStock} con stock bajo`,
      icon: Package,
      color: outOfStock > 0 ? "text-red-600" : "text-slate-600",
      bg: outOfStock > 0 ? "bg-red-50" : "bg-slate-50",
      iconBg: outOfStock > 0 ? "bg-red-100" : "bg-slate-100",
    },
    {
      label: "Productos activos",
      value: allProducts.filter((p) => p.is_active).length,
      sub: "en catálogo",
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
      iconBg: "bg-violet-100",
    },
  ];

  const recentOrders = allOrders.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Resumen de actividad de Tele Import S.A.
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, sub, icon: Icon, color, iconBg }) => (
          <div
            key={label}
            className={`rounded-xl border border-slate-200 bg-white p-5 flex items-start gap-4`}
          >
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Últimos pedidos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900 text-sm">Últimos pedidos</h2>
          </div>
          <Link
            href="/admin/pedidos"
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-400 text-sm">
            Aún no hay pedidos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Número</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {order.created_at ? formatDateTime(order.created_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                        {ORDER_STATUS_LABEL[order.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="text-brand-600 hover:text-brand-700 text-xs font-semibold transition-colors"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
