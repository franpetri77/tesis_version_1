"use client";

// =============================================
// PÁGINA: DETALLE DE PEDIDO
// Muestra el detalle completo de un pedido específico:
// ítems, montos, método de entrega y estado.
// =============================================

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  MapPin,
  Store,
  CreditCard,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Badge, ORDER_STATUS_VARIANT, ORDER_STATUS_LABEL } from "@/components/ui/Badge";
import { OrderDetailSkeleton } from "@/components/ui/Skeleton";
import { getMyOrder } from "@/lib/api/account";
import { formatPrice, formatDate, formatDateTime } from "@/lib/utils/format";
import type { Order, OrderStatus } from "@/types";

// -----------------------------------------------
// Tipo extendido para ítems con datos del producto
// que devuelve el backend en el detalle del pedido
// -----------------------------------------------
interface OrderItemDetail {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  product_slug: string;
  product_sku: string;
  product_image: string | null;
}

// -----------------------------------------------
// Mapa de colores e íconos por estado del pedido
// -----------------------------------------------
const STATUS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending",       label: "Pendiente" },
  { status: "paid",          label: "Pagado" },
  { status: "processing",    label: "En preparación" },
  { status: "ready_to_ship", label: "Listo" },
  { status: "shipped",       label: "Enviado" },
  { status: "delivered",     label: "Entregado" },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  pending:       0,
  paid:          1,
  processing:    2,
  ready_to_ship: 3,
  shipped:       4,
  delivered:     5,
  cancelled:     -1,
  refunded:      -1,
};

function StatusIcon({ status }: { status: OrderStatus }) {
  if (status === "delivered") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === "cancelled" || status === "refunded") return <AlertCircle className="w-4 h-4 text-red-400" />;
  if (status === "shipped") return <Truck className="w-4 h-4 text-blue-500" />;
  return <Clock className="w-4 h-4 text-amber-400" />;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated } = useAuthStore();
  const orderId = params.id as string;

  // Redirigir si no hay sesión activa
  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  // Obtener el detalle del pedido
  const { data: order, isLoading, isError } = useQuery<Order>({
    queryKey: ["order-detail", orderId],
    queryFn: () => getMyOrder(orderId),
    enabled: Boolean(user?.id && orderId),
  });

  if (!isAuthenticated || !user) return null;

  // Error: pedido no encontrado o sin acceso
  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-14 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-400" strokeWidth={1.5} />
        </div>
        <p className="text-slate-700 font-semibold mb-1">Pedido no encontrado</p>
        <p className="text-slate-400 text-sm mb-5">
          No pudimos encontrar este pedido en tu cuenta.
        </p>
        <Link
          href="/perfil/pedidos"
          className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a mis pedidos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Link de regreso */}
      <Link
        href="/perfil/pedidos"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Mis pedidos
      </Link>

      {isLoading ? (
        <OrderDetailSkeleton />
      ) : order ? (
        <>
          {/* ---- ENCABEZADO DEL PEDIDO ---- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  {order.order_number}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Realizado el {order.created_at ? formatDate(order.created_at) : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={order.status} />
                <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
              </div>
            </div>

            {/* Barra de progreso del estado (solo para pedidos activos) */}
            {STATUS_ORDER[order.status] >= 0 && (
              <div className="mt-5">
                <div className="flex items-center gap-0">
                  {STATUS_STEPS.map((step, index) => {
                    const currentStep = STATUS_ORDER[order.status];
                    const stepIndex   = STATUS_ORDER[step.status];
                    const isDone      = stepIndex <= currentStep;
                    const isCurrent   = stepIndex === currentStep;

                    return (
                      <div key={step.status} className="flex items-center flex-1 last:flex-none">
                        {/* Círculo del paso */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                              isCurrent
                                ? "bg-brand-600 ring-2 ring-brand-200"
                                : isDone
                                ? "bg-brand-500"
                                : "bg-slate-200"
                            }`}
                          />
                          <span
                            className={`text-[10px] mt-1.5 font-medium whitespace-nowrap hidden sm:block ${
                              isCurrent
                                ? "text-brand-700"
                                : isDone
                                ? "text-slate-500"
                                : "text-slate-300"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>

                        {/* Línea conectora */}
                        {index < STATUS_STEPS.length - 1 && (
                          <div
                            className={`h-0.5 flex-1 mx-1 ${
                              stepIndex < currentStep ? "bg-brand-400" : "bg-slate-100"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ---- ÍTEMS DEL PEDIDO ---- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Productos</h2>
            <div className="divide-y divide-slate-100">
              {(order.items as unknown as OrderItemDetail[]).map((item) => (
                <div key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  {/* Imagen del producto */}
                  <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0 overflow-hidden">
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* Nombre y SKU */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 line-clamp-2">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">SKU: {item.product_sku}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </p>
                  </div>

                  {/* Precio del ítem */}
                  <div className="text-sm font-semibold text-slate-900 flex-shrink-0">
                    {formatPrice(item.total_price)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---- RESUMEN DE MONTOS ---- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Resumen</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Descuento</span>
                  <span>− {formatPrice(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Envío</span>
                <span>
                  {order.shipping_cost === 0 ? (
                    <span className="text-emerald-600 font-medium">Gratis</span>
                  ) : (
                    formatPrice(order.shipping_cost)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* ---- INFORMACIÓN DE ENTREGA ---- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Entrega</h2>
            {order.delivery_method === "pickup" ? (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Store className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Retiro en sucursal</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tele Import S.A. · Av. Siempre Viva 742
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Envío a domicilio</p>
                  {order.shipping_address && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {typeof order.shipping_address === "string"
                        ? (() => {
                            try {
                              const addr = JSON.parse(order.shipping_address) as {
                                street?: string;
                                number?: string;
                                floor?: string;
                                apartment?: string;
                                city?: string;
                                province?: string;
                                postal_code?: string;
                              };
                              return [
                                `${addr.street ?? ""} ${addr.number ?? ""}`.trim(),
                                addr.floor ? `Piso ${addr.floor}` : null,
                                addr.apartment ? `Dpto ${addr.apartment}` : null,
                                `${addr.city ?? ""}, ${addr.province ?? ""}`.trim(),
                                addr.postal_code,
                              ]
                                .filter(Boolean)
                                .join(" · ");
                            } catch {
                              return order.shipping_address as string;
                            }
                          })()
                        : ""}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ---- NOTAS DEL PEDIDO ---- */}
          {order.notes && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Notas</h2>
              <p className="text-sm text-slate-500">{order.notes}</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
