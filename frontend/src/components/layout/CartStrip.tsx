"use client";

// =============================================
// COMPONENTE: CART STRIP
// Franja del carrito debajo del header (donde antes estaba la tira de
// categorías). Reemplaza a la barra fija inferior: no tapa contenido ni el
// botón del chat y queda junto al carrito del header.
// - Aparece deslizándose cuando hay productos.
// - Cada vez que se agrega un producto, el ícono "salta" y la franja se
//   ilumina un instante.
// - Se puede ocultar; vuelve a mostrarse al agregar otro producto.
// - No se muestra en /carrito ni en /checkout (ahí ya está el detalle).
// Las animaciones sólo corren si el usuario no pidió reducir el movimiento.
// =============================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, X, ArrowRight } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const HIDDEN_ON = ["/carrito", "/checkout"];
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-50";

export function CartStrip() {
  const pathname = usePathname();
  const { total_items, total, items } = useCartStore();
  const [mounted, setMounted]     = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Contador de "agregados" para reiniciar la animación de rebote
  const [bump, setBump] = useState(0);
  const previousCount = useRef(total_items);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (total_items > previousCount.current) {
      setDismissed(false);
      setBump((b) => b + 1);
    }
    previousCount.current = total_items;
  }, [total_items]);

  const hidden =
    !mounted ||
    total_items === 0 ||
    dismissed ||
    HIDDEN_ON.some((p) => pathname.startsWith(p));

  // Con la franja visible el header es más alto: los elementos sticky que
  // se ubican debajo (sidebar de filtros) leen --header-h.
  useEffect(() => {
    if (hidden) return;
    document.body.dataset.cartStrip = "1";
    return () => { delete document.body.dataset.cartStrip; };
  }, [hidden]);

  if (hidden) return null;

  const first = items[0]?.product?.name ?? "";
  const others = items.length - 1;

  return (
    <div className="overflow-hidden border-t border-slate-800 bg-brand-50 motion-safe:animate-strip-in">
      <div
        key={bump}
        className={cn("border-b border-paper-300", bump > 0 && "motion-safe:animate-strip-flash")}
      >
        <div className="container-main flex h-11 items-center gap-3 text-sm">
          <span
            key={`icon-${bump}`}
            className={cn("relative shrink-0 text-brand-700", bump > 0 && "motion-safe:animate-cart-bump")}
            aria-hidden="true"
          >
            <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
            <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold tabular-nums leading-none text-paper-50">
              {total_items > 9 ? "9+" : total_items}
            </span>
          </span>

          <p className="ml-1 min-w-0 flex-1 truncate text-slate-600">
            <span className="font-semibold text-slate-900">
              {total_items === 1 ? "1 producto" : `${total_items} productos`}
            </span>{" "}
            en tu carrito
            {first && (
              <span className="hidden text-slate-500 md:inline">
                {" · "}{first}{others > 0 ? ` y ${others} más` : ""}
              </span>
            )}
          </p>

          <p className="hidden shrink-0 tabular-nums text-slate-600 sm:block">
            Total <span className="font-semibold text-slate-900">{formatPrice(total)}</span>
          </p>

          <Link
            href="/carrito"
            className={cn(
              "group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-paper-50 hover:bg-brand-700 sm:text-sm",
              "motion-safe:transition-colors", FOCUS_RING
            )}
          >
            Ver carrito
            <ArrowRight className="h-3.5 w-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Ocultar aviso del carrito"
            className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-brand-100 hover:text-slate-900", FOCUS_RING)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
