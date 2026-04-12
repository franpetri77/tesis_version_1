// =============================================
// COMPONENTE: BADGE
// Etiqueta de estado visual para pedidos, stock, etc.
// =============================================

import { cn } from "@/lib/utils/cn";
import type { OrderStatus } from "@/types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  danger:  "bg-red-50 text-red-600 ring-1 ring-red-200",
  info:    "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  purple:  "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
};

// Mapeo de estados de pedido a variante visual
export const ORDER_STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  pending:       "warning",
  paid:          "info",
  processing:    "purple",
  ready_to_ship: "info",
  shipped:       "info",
  delivered:     "success",
  cancelled:     "danger",
  refunded:      "warning",
};

// Mapeo de estados de pedido a texto en español
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending:       "Pendiente de pago",
  paid:          "Pago confirmado",
  processing:    "En preparación",
  ready_to_ship: "Listo para despacho",
  shipped:       "Enviado",
  delivered:     "Entregado",
  cancelled:     "Cancelado",
  refunded:      "Reembolsado",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
