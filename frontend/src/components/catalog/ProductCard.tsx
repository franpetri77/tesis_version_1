"use client";

// =============================================
// COMPONENTE: PRODUCT CARD — estilo minimalista Apple
// Tarjeta de producto con imagen generosa, jerarquía
// tipográfica clara y animaciones suaves.
// =============================================

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Package, Check, Star } from "lucide-react";
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
      className="product-card group block"
      aria-label={product.name}
    >
      {/* ── IMAGEN ────────────────────────────────────── */}
      <div className="relative w-full aspect-square bg-[#F5F5F7] overflow-hidden rounded-t-3xl">
        {mainImage ? (
          <Image
            src={getProductImageUrl(mainImage.image_url)}
            alt={mainImage.alt_text ?? product.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              "object-contain p-6 transition-transform duration-500 ease-out",
              !isOutOfStock && "group-hover:scale-[1.06]"
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-slate-300" strokeWidth={1} />
          </div>
        )}

        {/* Badge descuento */}
        {discount > 0 && !isOutOfStock && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[11px]
                           font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide">
            −{discount}%
          </span>
        )}

        {/* Badge destacado */}
        {!!product.is_featured && !discount && !isOutOfStock && (
          <span className="absolute top-3 left-3 flex items-center gap-1
                           bg-amber-400/90 text-white text-[11px] font-bold
                           px-2.5 py-1 rounded-full shadow-sm backdrop-blur-sm">
            <Star className="w-2.5 h-2.5 fill-white" strokeWidth={0} />
            Destacado
          </span>
        )}

        {/* Overlay sin stock */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]
                          flex items-center justify-center">
            <span className="bg-slate-800/80 text-white text-xs font-semibold
                             px-3 py-1.5 rounded-full shadow-sm tracking-wide">
              Sin stock
            </span>
          </div>
        )}
      </div>

      {/* ── INFO ──────────────────────────────────────── */}
      <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4 gap-3">

        {/* Categoría + nombre */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            {[product.brand, product.category_name].filter(Boolean).join(" · ")}
          </p>
          <h3 className={cn(
            "text-[13.5px] font-semibold text-slate-900 leading-snug line-clamp-2",
            "-tracking-[0.01em] transition-colors duration-200",
            !isOutOfStock && "group-hover:text-brand-600"
          )}>
            {product.name}
          </h3>
        </div>

        {/* Stock bajo */}
        {isLowStock && (
          <p className="text-[10px] font-semibold text-orange-500 -mt-1">
            ¡Últimas {product.stock_quantity} unidades!
          </p>
        )}

        {/* Precio */}
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="text-[15px] font-bold text-slate-900 -tracking-[0.02em]">
            {formatPrice(product.price)}
          </span>
          {product.compare_price && product.compare_price > product.price && (
            <span className="text-[12px] text-slate-400 line-through font-normal">
              {formatPrice(product.compare_price)}
            </span>
          )}
        </div>

        {/* Botón agregar */}
        <button
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={cn(
            "flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl",
            "text-[12px] font-semibold tracking-wide",
            "transition-all duration-200 active:scale-[0.96]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
            added
              ? "bg-emerald-500 text-white"
              : isOutOfStock
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-brand-600 text-white hover:bg-brand-700"
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
              Agregar
            </>
          )}
        </button>
      </div>
    </Link>
  );
}
