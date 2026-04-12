"use client";

// =============================================
// PÁGINA: MIS PEDIDOS
// Lista el historial de pedidos del usuario autenticado.
// Usa TanStack Query para cacheo y skeleton de carga.
// =============================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, ArrowRight, Package } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Badge, ORDER_STATUS_VARIANT, ORDER_STATUS_LABEL } from "@/components/ui/Badge";
import { OrderRowSkeleton } from "@/components/ui/Skeleton";
import { getMyOrders } from "@/lib/api/account";
import { formatPrice, formatDateTime } from "@/lib/utils/format";
import type { Order } from "@/types";

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Redirigir si no hay sesión activa
  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  // Obtener los pedidos del usuario desde el backend
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["my-orders", user?.id],
    queryFn: getMyOrders,
    enabled: Boolean(user?.id),
  });

  if (!isAuthenticated || !user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mis pedidos</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Historial completo de tus compras
        </p>
      </div>

      {isLoading ? (
        // Skeleton de carga mientras se obtienen los datos
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <OrderRowSkeleton key={i} />
          ))}
        </div>
      ) : orders?.length === 0 ? (
        // Estado vacío
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-14 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
          </div>
          <p className="text-slate-700 font-semibold mb-1">No tenés pedidos todavía</p>
          <p className="text-slate-400 text-sm mb-5">
            Cuando realices tu primera compra la verás aquí.
          </p>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-semibold transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Ir al catálogo
          </Link>
        </div>
      ) : (
        // Lista de pedidos
        <div className="space-y-3">
          {orders?.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-slate-200 shadow-card p-5 hover:shadow-card-hover transition-shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Número de pedido y fecha */}
                <div>
                  <span className="font-semibold text-slate-900 text-sm tracking-wide">
                    {order.order_number}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {order.created_at ? formatDateTime(order.created_at) : "—"}
                    {" · "}
                    {order.delivery_method === "pickup"
                      ? "Retiro en sucursal"
                      : "Envío a domicilio"}
                  </p>
                </div>

                {/* Estado del pedido */}
                <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
              </div>

              {/* Resumen de productos del pedido */}
              {order.items && order.items.length > 0 && (
                <p className="text-xs text-slate-500 mt-2 line-clamp-1">
                  {(order.items as Array<{ quantity: number; product_name?: string; product_id?: { name: string } }>)
                    .map((item) => {
                      const name = item.product_name ?? (typeof item.product_id === "object" ? item.product_id?.name : null) ?? "—";
                      return `${item.quantity}× ${name}`;
                    })
                    .join(", ")}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  {formatPrice(order.total)}
                </span>
                <Link
                  href={`/perfil/pedidos/${order.id}`}
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors"
                >
                  Ver detalle
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
