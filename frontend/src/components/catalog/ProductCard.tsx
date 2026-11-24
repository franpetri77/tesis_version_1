"use client";

// =============================================
// COMPONENTE: PRODUCT CARD
// Ficha de producto compacta: papel cálido, encabezado técnico y precio
// separado por un filete. Al pasar el mouse (o con foco de teclado) la
// tarjeta se agranda levemente y muestra las características principales
// sobre la foto. El botón es sobrio (tinta sobre papel); el azul de marca
// queda para las acciones principales del sitio.
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

interface QuickSpec { label: string; value: string }

const MAX_SPECS = 4;

function humanize(key: string): string {
  const text = key.replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Hasta cuatro datos para la vista rápida: primero las especificaciones
 * cargadas en el panel (metadata); si faltan, marca, modelo, SKU y stock.
 * Algunas respuestas traen metadata como texto JSON, otras ya parseada.
 */
function quickSpecs(product: Product): QuickSpec[] {
  const specs: QuickSpec[] = [];
  let meta: unknown = product.metadata;
  if (typeof meta === "string") {
    try { meta = JSON.parse(meta); } catch { meta = null; }
  }
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
      if (specs.length >= MAX_SPECS) break;
      if (typeof value === "boolean") specs.push({ label: humanize(key), value: value ? "Sí" : "No" });
      else if ((typeof value === "string" || typeof value === "number") && String(value).trim()) {
        specs.push({ label: humanize(key), value: String(value) });
      }
    }
  }

  const stock = product.stock_quantity;
  const fallback: (QuickSpec | null)[] = [
    product.brand ? { label: "Marca", value: product.brand } : null,
    product.model ? { label: "Modelo", value: product.model } : null,
    product.sku ? { label: "SKU", value: product.sku } : null,
    { label: "Disponibilidad", value: stock <= 0 ? "Sin stock" : stock <= 5 ? `Últimas ${stock} unidades` : "En stock" },
  ];
  for (const item of fallback) {
    if (specs.length >= MAX_SPECS) break;
    if (item && !specs.some((s) => s.label.toLowerCase() === item.label.toLowerCase())) specs.push(item);
  }
  return specs;
}

// Vista rápida: sólo en dispositivos con puntero que permite hover (en
// pantallas táctiles el toque abre el producto) o con foco de teclado.
const REVEAL = "[@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0";

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const addItem    = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);
  // Si la URL de la imagen falla (p. ej. un recurso externo caído), se
  // muestra el mismo marcador que un producto sin foto en vez del texto alt.
  const [imageFailed, setImageFailed] = useState(false);

  const mainImage = product.images
    ?.slice()
    .sort((a, b) => a.sort_order - b.sort_order)[0];

  const discount     = product.compare_price
    ? calculateDiscount(product.compare_price, product.price)
    : 0;
  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock   = !isOutOfStock && product.stock_quantity <= 5;
  const specs        = quickSpecs(product);

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
        "shadow-card hover:z-10 hover:shadow-card-xl focus-within:z-10",
        // Zoom leve de toda la tarjeta. Se enumeran las propiedades animadas en
        // lugar de transition-all: la tarjeta se repite decenas de veces en la
        // grilla. Quien reduce el movimiento ve la vista rápida sin zoom.
        "motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-300 motion-safe:ease-out",
        "motion-safe:[@media(hover:hover)]:hover:scale-[1.035]"
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

          {mainImage && !imageFailed ? (
            <Image
              src={getProductImageUrl(mainImage.image_url)}
              alt={mainImage.alt_text ?? product.name}
              fill
              priority={priority}
              onError={() => setImageFailed(true)}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className={cn(
                // Sin will-change permanente: evitar una capa de composición
                // por cada imagen de la grilla.
                "object-contain p-5 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out",
                !isOutOfStock && "motion-safe:[@media(hover:hover)]:group-hover:scale-[1.06]"
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-10 w-10 text-slate-400" strokeWidth={1} aria-hidden="true" />
            </div>
          )}

          {/* Anotación de ficha, sin pastilla ni acento que compita con el CTA. */}
          <div className="absolute left-4 right-4 top-3 flex flex-col items-start gap-2">
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

          {/* ── VISTA RÁPIDA: características ──
              Decorativa para lectores de pantalla (el nombre del enlace no se
              alarga); la ficha del producto tiene la lista completa. */}
          {specs.length > 0 && (
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 border-t border-paper-300 bg-paper-50 px-4 pb-3 pt-2.5",
                "translate-y-3 opacity-0 motion-reduce:translate-y-0",
                "motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out",
                REVEAL
              )}
            >
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Características
              </p>
              <dl className="space-y-1">
                {specs.map((s) => (
                  <div key={s.label} className="flex min-w-0 items-baseline justify-between gap-3 text-xs leading-snug">
                    <dt className="shrink-0 text-slate-500">{s.label}</dt>
                    <dd className="min-w-0 truncate text-right font-medium text-slate-900">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* ── OVERLAY SIN STOCK ── */}
          {isOutOfStock && (
            // Velo opaco en lugar de backdrop-blur (costoso repetido en la grilla).
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
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">

          {/* Categoría / Marca */}
          {(product.brand || product.category_name) && (
            <p className="truncate text-[11px] font-semibold uppercase leading-normal tracking-wider text-slate-500">
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
          <div className="mt-auto flex min-w-0 flex-col gap-0.5 border-t border-paper-300 pt-2.5 tabular-nums">
            <span className="min-w-0 text-lg font-semibold leading-tight tracking-tight text-slate-900 [overflow-wrap:anywhere]">
              {formatPrice(product.price)}
            </span>
            {/* Reservar la línea del precio anterior mantiene alineadas las tarjetas. */}
            <div className="min-h-5 leading-5">
              {product.compare_price && product.compare_price > product.price && (
                <span className="text-xs font-normal leading-tight text-slate-500 line-through [overflow-wrap:anywhere]">
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
          "relative z-10 mx-4 mb-4 flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2",
          "text-xs font-semibold leading-tight sm:text-[13px]",
          "motion-safe:transition-[background-color,border-color,color,transform] motion-safe:duration-200 motion-safe:ease-out motion-safe:active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50",
          added
            ? "border-transparent bg-brand-50 text-brand-700"
            : isOutOfStock
            ? "cursor-not-allowed border-transparent bg-paper-200 text-slate-500"
            : "border-slate-900/15 bg-paper-50 text-slate-900 hover:border-slate-900 hover:bg-slate-900 hover:text-paper-50"
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
            <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            {/* En las columnas angostas de celular, la versión corta entra en una línea */}
            <span className="min-w-0">
              Agregar<span className="hidden min-[420px]:inline"> al carrito</span>
            </span>
          </>
        )}
      </button>
    </article>
  );
}
