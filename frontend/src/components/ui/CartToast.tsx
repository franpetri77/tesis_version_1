"use client";

// =============================================
// COMPONENTE: CART TOAST
// Notificación flotante que aparece al agregar un producto al carrito.
// Se auto-oculta luego de 3 segundos.
// =============================================

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, X, CheckCircle2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { getProductImageUrl } from "@/lib/api/catalog";
import { cn } from "@/lib/utils/cn";

export function CartToast() {
  const { toast, total_items, dismissToast } = useCartStore();

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-dropdown border border-slate-200 overflow-hidden",
        "transition-all duration-300 ease-out",
        toast.visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
      role="status"
      aria-live="polite"
    >
      {/* Barra de progreso animada */}
      <div
        className={cn(
          "h-0.5 bg-brand-500 origin-left",
          toast.visible ? "animate-[shrink_3s_linear_forwards]" : "w-0"
        )}
      />

      <div className="flex items-start gap-3 p-4">
        {/* Ícono de confirmación o imagen del producto */}
        <div className="flex-shrink-0">
          {toast.productImage ? (
            <div className="relative w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
              <Image
                src={getProductImageUrl(toast.productImage, { width: 96, height: 96 })}
                alt={toast.productName}
                fill
                className="object-contain p-1"
                sizes="48px"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-brand-600" />
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-emerald-600">Agregado al carrito</p>
          </div>
          <p className="text-sm font-medium text-slate-900 line-clamp-1">
            {toast.productName}
          </p>
          <Link
            href="/carrito"
            onClick={dismissToast}
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold mt-1.5 transition-colors"
          >
            Ver carrito ({total_items})
            <span aria-hidden>→</span>
          </Link>
        </div>

        {/* Cerrar */}
        <button
          onClick={dismissToast}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Cerrar notificación"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
