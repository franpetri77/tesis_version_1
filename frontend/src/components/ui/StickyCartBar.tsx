"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, X, ChevronRight } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const HIDDEN_ON = ["/carrito", "/checkout", "/admin"];

export function StickyCartBar() {
  const pathname   = usePathname();
  const { total_items, total, items } = useCartStore();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted]     = useState(false);

  // Volver a mostrar automáticamente cuando se agrega un item nuevo
  const itemCount = total_items;
  useEffect(() => {
    if (itemCount > 0) setDismissed(false);
  }, [itemCount]);

  useEffect(() => { setMounted(true); }, []);

  const hide =
    !mounted ||
    total_items === 0 ||
    dismissed ||
    HIDDEN_ON.some((p) => pathname.startsWith(p));

  if (hide) return null;

  const firstName = items[0]?.product?.name ?? "";

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "animate-slide-up"
      )}
    >
      {/* Gradiente que no tapa el contenido de abajo */}
      <div className="pointer-events-none h-8 bg-gradient-to-t from-slate-900/10 to-transparent" />

      <div className="bg-brand-600 text-white shadow-2xl">
        <div className="container-main flex items-center gap-3 py-3">
          {/* Ícono + resumen */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <ShoppingCart className="w-5 h-5" strokeWidth={1.75} />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-brand-600 rounded-full text-[9px] font-extrabold flex items-center justify-center leading-none">
                {total_items > 9 ? "9+" : total_items}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-brand-100 leading-none mb-0.5">
                {total_items === 1
                  ? `1 producto en tu carrito`
                  : `${total_items} productos en tu carrito`}
              </p>
              <p className="text-sm font-bold leading-none truncate">
                {firstName && (
                  <span className="font-normal text-brand-200 text-xs mr-1">
                    {firstName}
                    {total_items > 1 ? ` +${total_items - 1} más` : ""}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="flex-shrink-0 text-right hidden sm:block">
            <p className="text-[11px] text-brand-200 leading-none mb-0.5">Total</p>
            <p className="text-base font-extrabold leading-none">{formatPrice(total)}</p>
          </div>

          {/* CTA */}
          <Link
            href="/carrito"
            className="flex-shrink-0 flex items-center gap-1.5 bg-white text-brand-700 font-bold text-sm px-4 py-2 rounded-lg hover:bg-brand-50 transition-colors shadow-sm"
          >
            Ver carrito
            <ChevronRight className="w-4 h-4" />
          </Link>

          {/* Cerrar */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-brand-200 hover:text-white hover:bg-brand-700 transition-colors"
            aria-label="Ocultar barra del carrito"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
