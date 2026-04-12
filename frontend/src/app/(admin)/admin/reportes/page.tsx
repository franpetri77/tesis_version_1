"use client";

// =============================================
// PÁGINA ADMIN: REPORTES
// Métricas globales, ventas por período, productos
// más/menos vendidos y stock crítico.
// =============================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Package,
  Users,
  RefreshCcw,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { formatPrice } from "@/lib/utils/format";
import {
  getMetrics,
  getSalesReport,
  getTopProducts,
  getWorstProducts,
  type AdminMetrics,
  type SalesMetrics,
  type TopProduct,
} from "@/lib/api/admin";
import type { Product } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// -----------------------------------------------
// Helpers de fecha
// -----------------------------------------------
function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().split("T")[0]!;
}

// -----------------------------------------------
// Componente: esqueleto de carga
// -----------------------------------------------
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="h-3 bg-slate-100 rounded w-24 mb-3" />
      <div className="h-7 bg-slate-200 rounded w-20 mb-2" />
      <div className="h-2.5 bg-slate-100 rounded w-16" />
    </div>
  );
}

export default function AdminReportsPage() {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(today());

  // -----------------------------------------------
  // Query: métricas globales
  // -----------------------------------------------
  const {
    data: metrics,
    isLoading: loadingMetrics,
    isError: errorMetrics,
  } = useQuery<AdminMetrics>({
    queryKey: ["admin-metrics"],
    queryFn: getMetrics,
    staleTime: 60_000, // 1 minuto
  });

  // -----------------------------------------------
  // Query: reporte de ventas por período
  // -----------------------------------------------
  const {
    data: salesReport,
    isLoading: loadingSales,
    isError: errorSales,
    refetch: refetchSales,
  } = useQuery<SalesMetrics>({
    queryKey: ["report-sales", dateFrom, dateTo],
    queryFn: () => getSalesReport(dateFrom, dateTo),
    retry: false,
  });

  // -----------------------------------------------
  // Query: top 10 productos más vendidos
  // -----------------------------------------------
  const {
    data: topProducts,
    isLoading: loadingTop,
    isError: errorTop,
  } = useQuery<TopProduct[]>({
    queryKey: ["report-top-products"],
    queryFn: () => getTopProducts(10),
    retry: false,
  });

  // -----------------------------------------------
  // Query: 10 productos menos vendidos
  // -----------------------------------------------
  const {
    data: worstProducts,
    isLoading: loadingWorst,
    isError: errorWorst,
  } = useQuery<TopProduct[]>({
    queryKey: ["report-worst-products"],
    queryFn: () => getWorstProducts(10),
    retry: false,
  });

  // -----------------------------------------------
  // Query: todos los productos para stock crítico
  // -----------------------------------------------
  const { data: allProducts, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["catalog-products-full"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/catalog/products?limit=1000`);
      if (!res.ok) throw new Error("Error al cargar productos");
      const data = await res.json() as { data: Product[] };
      return data.data;
    },
    staleTime: 120_000,
  });

  // Filtrar productos con stock crítico (<= 5)
  const criticalStock = (allProducts ?? [])
    .filter((p) => p.is_active && p.stock_quantity <= 5)
    .sort((a, b) => a.stock_quantity - b.stock_quantity);

  // Máximo de unidades vendidas del top (para la barra de progreso)
  const maxSold = topProducts?.[0]?.total_sold ?? 1;
  const maxWorstSold = worstProducts?.[worstProducts.length - 1]?.total_sold ?? 1;

  return (
    <div className="space-y-7">
      {/* Encabezado */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reportes</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Métricas de ventas y rendimiento del negocio
        </p>
      </div>

      {/* ============================================
          SECCIÓN 1: MÉTRICAS GLOBALES
          ============================================ */}
      <section>
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
          Métricas globales
        </h2>

        {errorMetrics ? (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            No se pudieron cargar las métricas. Verificá que el backend esté activo.
          </div>
        ) : loadingMetrics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-4 h-4 text-brand-500" />
                <p className="text-xs text-slate-500 font-medium">Total pedidos</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{metrics.total_orders}</p>
              <p className="text-xs text-slate-400 mt-1">
                {metrics.orders_today} hoy
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-slate-500 font-medium">Ingresos totales</p>
              </div>
              <p className="text-xl font-bold text-emerald-700">
                {formatPrice(metrics.total_revenue)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-violet-500" />
                <p className="text-xs text-slate-500 font-medium">Productos</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{metrics.total_products}</p>
              <p className="text-xs text-slate-400 mt-1">en catálogo</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-slate-500 font-medium">Usuarios</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{metrics.total_users}</p>
            </div>

            <div className={`rounded-xl border p-5 ${metrics.out_of_stock_count > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-4 h-4 ${metrics.out_of_stock_count > 0 ? "text-red-500" : "text-slate-400"}`} />
                <p className={`text-xs font-medium ${metrics.out_of_stock_count > 0 ? "text-red-600" : "text-slate-500"}`}>Sin stock</p>
              </div>
              <p className={`text-2xl font-bold ${metrics.out_of_stock_count > 0 ? "text-red-700" : "text-slate-900"}`}>
                {metrics.out_of_stock_count}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {metrics.low_stock_count} con stock bajo
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {/* ============================================
          SECCIÓN 2: REPORTE DE VENTAS POR PERÍODO
          ============================================ */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-brand-500" />
          <h2 className="font-semibold text-slate-900 text-sm">Ventas por período</h2>
        </div>

        {/* Selectores de fecha */}
        <div className="flex flex-wrap items-end gap-3 mb-5">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => refetchSales()}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Actualizar
          </button>
        </div>

        {/* Cards de métricas del período */}
        {errorSales ? (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-4 text-sm text-slate-500">
            No se pudo conectar con el backend.
          </div>
        ) : loadingSales ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-4 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-24 mx-auto mb-3" />
                <div className="h-7 bg-slate-200 rounded w-32 mx-auto" />
              </div>
            ))}
          </div>
        ) : salesReport ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-center">
              <p className="text-xs text-brand-600 font-semibold uppercase tracking-wide">
                Ingresos del período
              </p>
              <p className="text-2xl font-bold text-brand-700 mt-1.5">
                {formatPrice(salesReport.metrics.total_revenue)}
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">
                Pedidos pagados
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1.5">
                {salesReport.metrics.total_orders}
              </p>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-center">
              <p className="text-xs text-violet-600 font-semibold uppercase tracking-wide">
                Ticket promedio
              </p>
              <p className="text-2xl font-bold text-violet-700 mt-1.5">
                {formatPrice(salesReport.metrics.average_order_value)}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {/* ============================================
          SECCIÓN 3 Y 4: TOP / WORST PRODUCTOS
          ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 más vendidos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <ArrowUp className="w-4 h-4 text-emerald-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Más vendidos (top 10)</h2>
          </div>

          {errorTop ? (
            <p className="px-5 py-8 text-center text-slate-400 text-sm">Backend no disponible.</p>
          ) : loadingTop ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3 animate-pulse flex items-center gap-3">
                  <div className="h-3 bg-slate-100 rounded w-6" />
                  <div className="h-3 bg-slate-100 rounded flex-1" />
                  <div className="h-3 bg-slate-100 rounded w-12" />
                </div>
              ))}
            </div>
          ) : (topProducts ?? []).length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">
              <ShoppingCart className="w-6 h-6 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
              Sin datos de ventas todavía
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {(topProducts ?? []).map((product, index) => {
                const pct = maxSold > 0 ? Math.round((product.total_sold / maxSold) * 100) : 0;
                return (
                  <div key={product.id} className="px-5 py-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-xs font-bold text-slate-400 font-mono w-6 text-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                        <p className="text-xs text-slate-400">{product.sku} {product.brand ? `· ${product.brand}` : ""}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-700 flex-shrink-0">
                        {product.total_sold} uds.
                      </span>
                    </div>
                    {/* Barra de progreso relativa al primero */}
                    <div className="ml-9">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom 10 menos vendidos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Menos vendidos (bottom 10)</h2>
          </div>

          {errorWorst ? (
            <p className="px-5 py-8 text-center text-slate-400 text-sm">Backend no disponible.</p>
          ) : loadingWorst ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3 animate-pulse flex items-center gap-3">
                  <div className="h-3 bg-slate-100 rounded w-6" />
                  <div className="h-3 bg-slate-100 rounded flex-1" />
                  <div className="h-3 bg-slate-100 rounded w-12" />
                </div>
              ))}
            </div>
          ) : (worstProducts ?? []).length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">
              Sin datos disponibles
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {(worstProducts ?? []).map((product, index) => {
                const hasNoSales = product.total_sold === 0;
                const pct = maxWorstSold > 0 ? Math.round((product.total_sold / maxWorstSold) * 100) : 0;
                return (
                  <div
                    key={product.id}
                    className={`px-5 py-3 hover:bg-slate-50/60 transition-colors ${hasNoSales ? "bg-red-50/40" : ""}`}
                  >
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-xs font-bold text-slate-400 font-mono w-6 text-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${hasNoSales ? "text-red-700" : "text-slate-900"}`}>
                          {product.name}
                        </p>
                        <p className="text-xs text-slate-400">{product.sku}</p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${hasNoSales ? "text-red-600" : "text-slate-600"}`}>
                        {product.total_sold === 0 ? (
                          <span className="text-xs bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
                            Sin ventas
                          </span>
                        ) : (
                          `${product.total_sold} uds.`
                        )}
                      </span>
                    </div>
                    {!hasNoSales && (
                      <div className="ml-9">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================
          SECCIÓN 5: STOCK CRÍTICO
          ============================================ */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-slate-900 text-sm">
            Stock crítico{" "}
            {!loadingProducts && (
              <span className="text-slate-400 font-normal">
                ({criticalStock.length} productos)
              </span>
            )}
          </h2>
        </div>

        {loadingProducts ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3 animate-pulse flex items-center gap-4">
                <div className="h-3 bg-slate-100 rounded flex-1" />
                <div className="h-3 bg-slate-100 rounded w-20" />
                <div className="h-5 bg-slate-100 rounded w-12" />
              </div>
            ))}
          </div>
        ) : criticalStock.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">
            <Package className="w-6 h-6 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
            Todos los productos tienen stock suficiente
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Producto</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">SKU</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Categoría</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {criticalStock.map((product) => {
                  const isOut = product.stock_quantity <= 0;
                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-50/60 transition-colors ${isOut ? "bg-red-50/30" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <span className="font-medium text-slate-900 line-clamp-1">{product.name}</span>
                        {product.brand && (
                          <span className="text-xs text-slate-400 ml-1">· {product.brand}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-400 font-mono text-xs">{product.sku}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{product.category_name ?? "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`text-sm font-bold ${
                            isOut ? "text-red-600" : "text-amber-600"
                          }`}
                        >
                          {isOut ? "Sin stock" : product.stock_quantity}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Barra de estado de pedidos */}
      {metrics && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-brand-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Pedidos por estado</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(metrics.orders_by_status).map(([status, count]) => {
              const LABELS: Record<string, string> = {
                pending: "Pendiente",
                paid: "Pagado",
                processing: "En proceso",
                ready_to_ship: "Listo para envío",
                shipped: "Enviado",
                delivered: "Entregado",
                cancelled: "Cancelado",
                refunded: "Reembolsado",
              };
              const COLORS: Record<string, string> = {
                pending: "bg-slate-100 text-slate-600",
                paid: "bg-blue-100 text-blue-700",
                processing: "bg-amber-100 text-amber-700",
                ready_to_ship: "bg-violet-100 text-violet-700",
                shipped: "bg-indigo-100 text-indigo-700",
                delivered: "bg-emerald-100 text-emerald-700",
                cancelled: "bg-red-100 text-red-700",
                refunded: "bg-pink-100 text-pink-700",
              };
              return (
                <div
                  key={status}
                  className={`rounded-xl px-4 py-3 text-center ${COLORS[status] ?? "bg-slate-100 text-slate-600"}`}
                >
                  <p className="text-xs font-medium opacity-80">{LABELS[status] ?? status}</p>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
