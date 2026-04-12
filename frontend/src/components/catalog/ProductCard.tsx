"use client";

// =============================================
// COMPONENTE: PRODUCT CARD
// Tarjeta de producto refinada — jerarquía tipográfica
// clara, hover reveal, badges elegantes y sombras
// multi-capa coherentes con el branding del proyecto.
// =============================================

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Package, Check, Star, ArrowRight } from "lucide-react";
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
    <Link
      href={`/producto/${product.slug}`}
      className={cn(
        // Shell
        "group flex flex-col bg-white overflow-hidden cursor-pointer",
        "rounded-2xl",
        // Border: sutil, se intensifica en hover
        "border border-slate-100 hover:border-slate-200/80",
        // Sombra multi-capa — se profundiza en hover
        "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)]",
        "hover:shadow-[0_10px_28px_rgba(0,0,0,0.09),0_4px_10px_rgba(0,0,0,0.05)]",
        // Elevación en hover
        "transition-all duration-300 ease-out hover:-translate-y-1",
        isOutOfStock && "opacity-70"
      )}
      aria-label={product.name}
    >
      {/* ── IMAGEN ─────────────────────────────────────── */}
      <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-b from-slate-50 to-white">

        {mainImage ? (
          <Image
            src={getProductImageUrl(mainImage.image_url)}
            alt={mainImage.alt_text ?? product.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              "object-contain p-5 transition-transform duration-500 ease-out will-change-transform",
              !isOutOfStock && "group-hover:scale-[1.05]"
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-slate-200" strokeWidth={1} />
          </div>
        )}

        {/* ── BADGES: apilados verticalmente en top-left ── */}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5 z-10">
          {discount > 0 && !isOutOfStock && (
            <span className={cn(
              "inline-flex items-center",
              "bg-red-500 text-white",
              "text-[10.5px] font-bold tracking-wide",
              "px-2 py-[3px] rounded-md shadow-sm"
            )}>
              −{discount}%
            </span>
          )}
          {!!product.is_featured && !discount && !isOutOfStock && (
            <span className={cn(
              "inline-flex items-center gap-1",
              "bg-amber-400 text-white",
              "text-[10px] font-bold",
              "px-2 py-[3px] rounded-md shadow-sm"
            )}>
              <Star className="w-2.5 h-2.5 fill-white" strokeWidth={0} />
              Destacado
            </span>
          )}
        </div>

        {/* ── OVERLAY SIN STOCK ── */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/55 backdrop-blur-[1.5px] flex items-center justify-center z-20">
            <span className={cn(
              "bg-slate-900/80 text-white",
              "text-[11px] font-semibold tracking-widest uppercase",
              "px-3.5 py-1.5 rounded-lg shadow-sm"
            )}>
              Sin stock
            </span>
          </div>
        )}

        {/* ── REVEAL EN HOVER: "Ver detalles →" ── */}
        {!isOutOfStock && (
          <div className={cn(
            "absolute inset-x-0 bottom-0 flex items-end justify-center pb-2.5",
            "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0",
            "transition-all duration-200 ease-out z-10"
          )}>
            <span className={cn(
              "inline-flex items-center gap-1.5",
              "bg-white/95 backdrop-blur-sm",
              "text-slate-700 text-[11px] font-semibold",
              "px-3 py-1.5 rounded-full",
              "shadow-sm border border-slate-200/70"
            )}>
              Ver detalles
              <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        )}

        {/* Separador imagen/info */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent" />
      </div>

      {/* ── INFO ──────────────────────────────────────── */}
      <div className="flex flex-col flex-1 px-4 pt-3 pb-3.5 gap-2">

        {/* Categoría / Marca */}
        {(product.brand || product.category_name) && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.09em] truncate leading-none">
            {[product.brand, product.category_name].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Nombre del producto */}
        <h3 className={cn(
          "text-[13.5px] font-semibold text-slate-900 leading-snug line-clamp-2",
          "-tracking-[0.01em]",
          "transition-colors duration-200",
          !isOutOfStock && "group-hover:text-brand-600"
        )}>
          {product.name}
        </h3>

        {/* Indicador de stock bajo */}
        {isLowStock && (
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-orange-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 animate-pulse" />
            Últimas {product.stock_quantity} unidades
          </p>
        )}

        {/* Precio */}
        <div className="flex items-baseline gap-2 mt-auto pt-0.5">
          <span className="text-[16px] font-extrabold text-slate-900 -tracking-[0.03em]">
            {formatPrice(product.price)}
          </span>
          {product.compare_price && product.compare_price > product.price && (
            <span className="text-[11.5px] text-slate-400 line-through font-normal">
              {formatPrice(product.compare_price)}
            </span>
          )}
        </div>

        {/* Botón agregar al carrito */}
        <button
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={cn(
            "flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl",
            "text-[12px] font-semibold tracking-wide",
            "transition-all duration-200 active:scale-[0.97]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
            added
              ? "bg-emerald-500 text-white shadow-sm"
              : isOutOfStock
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : [
                  "bg-brand-600 text-white",
                  "hover:bg-brand-700",
                  "shadow-[0_1px_2px_rgba(37,99,235,0.3)]",
                  "hover:shadow-[0_4px_12px_rgba(37,99,235,0.35)]",
                ]
          )}
        >
          {added ? (
            <>
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              ¡Agregado!
            </>
          ) : isOutOfStock ? (
            "Sin stock"
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5" strokeWidth={2} />
              Agregar al carrito
            </>
          )}
        </button>
      </div>
    </Link>
  );
}
