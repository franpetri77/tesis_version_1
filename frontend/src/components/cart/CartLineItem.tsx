"use client";

// =============================================
// COMPONENTE: CART LINE ITEM
// Fila de producto compartida por /carrito (editable) y /checkout (solo
// lectura): foto grande, marca y categoría, nombre, SKU, disponibilidad,
// precio con anterior tachado y cantidad.
// =============================================

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Package } from "lucide-react";
import type { CartItem } from "@/types";
import { formatPrice, calculateDiscount } from "@/lib/utils/format";
import { getProductImageUrl } from "@/lib/api/catalog";
import { cn } from "@/lib/utils/cn";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50";

interface CartLineItemProps {
  item: CartItem;
  /** Sin handlers se muestra en modo lectura (checkout) */
  onQuantityChange?: (quantity: number) => void;
  onRemove?: () => void;
  compact?: boolean;
}

export function CartLineItem({ item, onQuantityChange, onRemove, compact = false }: CartLineItemProps) {
  const { product, quantity, unit_price } = item;
  const editable = Boolean(onQuantityChange);
  const [imageFailed, setImageFailed] = useState(false);
  const image = product.images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0];
  const stock = product.stock_quantity;
  const compare = product.compare_price && product.compare_price > unit_price ? product.compare_price : undefined;
  const discount = compare ? calculateDiscount(compare, unit_price) : 0;
  const meta = [product.brand, product.category_name].filter(Boolean).join(" · ");
  const imgSize = compact ? "h-16 w-16" : "h-20 w-20 sm:h-24 sm:w-24";

  return (
    <li className={cn("flex gap-4", compact ? "py-4" : "py-5")}>
      {/* Foto */}
      <Link
        href={`/producto/${product.slug}`}
        className={cn("relative shrink-0 overflow-hidden rounded-xl border border-paper-300 bg-paper-100", imgSize, FOCUS_RING)}
        tabIndex={-1}
        aria-hidden="true"
      >
        {image && !imageFailed ? (
          <Image
            src={getProductImageUrl(image.image_url)}
            alt=""
            fill
            sizes="96px"
            className="object-contain p-2"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Package className="h-7 w-7 text-slate-400" strokeWidth={1} />
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
        {/* Descripción */}
        <div className="min-w-0 flex-1">
          {meta && (
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">{meta}</p>
          )}
          <Link
            href={`/producto/${product.slug}`}
            className={cn("mt-0.5 line-clamp-2 rounded-sm text-[15px] font-medium leading-snug text-slate-900 hover:underline underline-offset-4", FOCUS_RING)}
          >
            {product.name}
          </Link>
          {product.sku && <p className="mt-1 text-xs text-slate-500">SKU {product.sku}</p>}
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span
              className={cn("h-1.5 w-1.5 rounded-full", stock <= 0 ? "bg-red-500" : stock <= 5 ? "bg-amber-500" : "bg-emerald-500")}
              aria-hidden="true"
            />
            {stock <= 0 ? "Sin stock" : stock <= 5 ? `Últimas ${stock} unidades` : "Stock disponible"}
          </p>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className={cn("mt-2 rounded-sm text-sm font-medium text-brand-700 underline-offset-4 hover:underline", FOCUS_RING)}
            >
              Eliminar
            </button>
          )}
        </div>

        {/* Cantidad */}
        {editable ? (
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-center">
            <div className="flex h-9 items-center rounded-lg border border-paper-300 bg-paper-50">
              <button
                type="button"
                onClick={() => onQuantityChange!(quantity - 1)}
                aria-label={`Restar una unidad de ${product.name}`}
                className={cn("flex h-full w-9 items-center justify-center rounded-l-lg text-slate-600 hover:bg-paper-100 hover:text-slate-900", FOCUS_RING)}
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span className="w-9 text-center text-sm font-semibold tabular-nums text-slate-900" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange!(quantity + 1)}
                disabled={quantity >= stock}
                aria-label={`Sumar una unidad de ${product.name}`}
                className={cn("flex h-full w-9 items-center justify-center rounded-r-lg text-slate-600 hover:bg-paper-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30", FOCUS_RING)}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            {stock > 0 && <p className="text-[11px] text-slate-500 tabular-nums">Máx. {stock}</p>}
          </div>
        ) : (
          <p className="shrink-0 text-sm text-slate-600 sm:pt-0.5">
            Cantidad: <span className="font-semibold tabular-nums text-slate-900">{quantity}</span>
          </p>
        )}

        {/* Precio */}
        <div className="shrink-0 tabular-nums sm:min-w-[8.5rem] sm:text-right">
          {compare && (
            <p className="text-xs text-slate-500">
              <span className="line-through">{formatPrice(compare * quantity)}</span>
              <span className="ml-1.5 font-semibold text-emerald-700">{discount}% OFF</span>
            </p>
          )}
          <p className="text-lg font-semibold leading-tight text-slate-900">{formatPrice(unit_price * quantity)}</p>
          {quantity > 1 && <p className="text-xs text-slate-500">{formatPrice(unit_price)} c/u</p>}
        </div>
      </div>
    </li>
  );
}
