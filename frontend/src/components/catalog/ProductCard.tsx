"use client";

// =============================================
// COMPONENTE: PRODUCT CARD
// Ficha de producto: papel cálido, encabezado técnico y precio
// separado por un filete. La marca se reserva para acción y foco.
// =============================================

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Package, Check } from "lucide-react";
import type { Product } from "@/types";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice, calculateDiscount } from "@/lib/utils/format";
import { getProductImageUrl } from "@/lib/api/catalog";
import { cn } from "@/lib/utils/cn";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const addItem    = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const mainImage = product.images
    ?.slice()
    .sort((a, b) => a.sort_order - b.sort_order)[0];

  const discount     = product.compare_price
    ? calculateDiscount(product.compare_price, product.price)
    : 0;
  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock   = !isOutOfStock && product.stock_quantity <= 5;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (isOutOfStock || added) return;
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <article
      className={cn(
        "group relative isolate flex h-full min-w-0 flex-col rounded-2xl bg-paper-50",
        "border border-paper-300 hover:border-paper-400",
        "shadow-card hover:shadow-card-hover",
        // Elevación en hover. Se enumeran las propiedades animadas en lugar
        // de usar transition-all: la tarjeta se repite decenas de veces en la
        // grilla. Las personas que reducen el movimiento no reciben animación.
        "motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-300 motion-safe:ease-out motion-safe:hover:-translate-y-0.5"
      )}
    >
      {/* El pseudo-elemento extiende el enlace al article; el botón hermano
          queda por encima. El foco dibuja el contorno de toda la tarjeta. */}
      <Link
        href={`/producto/${product.slug}`}
        className={cn(
          "flex min-w-0 flex-1 flex-col after:absolute after:inset-0 after:rounded-2xl after:content-['']",
          "focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-600/40",
          "focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-paper-50"
        )}
      >
        {/* ── IMAGEN ─────────────────────────────────────── */}
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-t-2xl bg-paper-100">

          {mainImage ? (
            <Image
              src={getProductImageUrl(mainImage.image_url)}
              alt={mainImage.alt_text ?? product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                // Sin will-change permanente: evitar una capa de composición
                // por cada imagen de la grilla. El zoom es leve y opcional.
                "object-contain p-6 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out",
                !isOutOfStock && "motion-safe:group-hover:scale-[1.03]"
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-10 w-10 text-slate-400" strokeWidth={1} aria-hidden="true" />
            </div>
          )}

          {/* Anotación de ficha, sin pastilla ni acento que compita con el CTA.
              La línea queda en el margen de papel que deja p-6 en la imagen. */}
          <div className="absolute left-5 right-5 top-3 flex flex-col items-start gap-2">
            {discount > 0 && !isOutOfStock && (
              <span className="text-xs font-semibold leading-none tracking-wide text-slate-900 tabular-nums">
                −{discount}%
              </span>
            )}
            {!!product.is_featured && !discount && !isOutOfStock && (
              <span className="text-xs font-medium leading-none tracking-wide text-slate-600">
                Destacado
              </span>
            )}
          </div>

          {/* ── OVERLAY SIN STOCK ── */}
          {isOutOfStock && (
            // Se evita backdrop-blur: es de los efectos mas costosos y aqui se
            // repetiria por cada tarjeta sin stock de la grilla. Un velo opaco
            // logra el mismo objetivo de atenuar la imagen.
            <div className="absolute inset-0 flex items-center justify-center bg-paper-50/75">
              <span className={cn(
                "rounded-lg bg-slate-900/85 px-3 py-1.5 text-paper-50",
                "text-xs font-semibold uppercase tracking-widest"
              )}>
                Sin stock
              </span>
            </div>
          )}

          {/* Separador imagen/info */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-paper-300" />
        </div>

        {/* ── INFO ──────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">

          {/* Categoría / Marca */}
          {(product.brand || product.category_name) && (
            <p className="truncate text-xs font-semibold uppercase leading-normal tracking-wider text-slate-500">
              {[product.brand, product.category_name].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Nombre del producto */}
          <h3 className="min-h-10 min-w-0 line-clamp-2 break-words text-sm font-medium leading-snug tracking-normal text-slate-900">
            {product.name}
          </h3>

          {/* Indicador de stock bajo */}
          {isLowStock && (
            <p className="flex items-center gap-2 text-xs font-medium leading-normal text-slate-600 tabular-nums">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
              Últimas {product.stock_quantity} unidades
            </p>
          )}

          {/* Precio */}
          <div className="mt-auto flex min-w-0 flex-col gap-1 border-t border-paper-300 pt-3 tabular-nums">
            <span className="min-w-0 text-lg font-semibold leading-tight tracking-tight text-slate-900 [overflow-wrap:anywhere] sm:text-xl">
              {formatPrice(product.price)}
            </span>
            {/* Reservar dos líneas en las columnas más estrechas mantiene
                alineado el precio aun con importes anteriores largos. */}
            <div className="min-h-10 leading-5 sm:min-h-5 md:min-h-10 lg:min-h-5">
              {product.compare_price && product.compare_price > product.price && (
                <span className="text-sm font-normal leading-tight text-slate-500 line-through [overflow-wrap:anywhere]">
                  {formatPrice(product.compare_price)}
                </span>
              )}
            </div>
          </div>

        </div>
      </Link>

      {/* Botón independiente del enlace y por encima de su área extendida. */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={isOutOfStock}
        aria-live="polite"
        className={cn(
          "relative z-10 mx-5 mb-5 flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5",
          "text-xs font-semibold leading-tight sm:text-sm sm:leading-tight",
          "motion-safe:transition-[background-color,color,transform,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-safe:active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50",
          added
            ? "bg-brand-50 text-brand-700"
            : isOutOfStock
            ? "cursor-not-allowed bg-paper-200 text-slate-600"
            : [
                "bg-brand-600 text-white",
                "hover:bg-brand-700",
                "shadow-sm hover:shadow-md",
              ]
        )}
      >
        {added ? (
          <>
            <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            <span className="min-w-0">¡Agregado!</span>
          </>
        ) : isOutOfStock ? (
          "Sin stock"
        ) : (
          <>
            <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="min-w-0">Agregar al carrito</span>
          </>
        )}
      </button>
    </article>
  );
}
