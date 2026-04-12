"use client";

// =============================================
// COMPONENTE: PRODUCT IMAGE GALLERY
// Galería interactiva del detalle de producto.
// Maneja errores de imagen y cambio de imagen activa.
// =============================================

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { getProductImageUrl } from "@/lib/api/catalog";
import { cn } from "@/lib/utils/cn";
import type { ProductImage } from "@/types";

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  discount: number;
  /** Callback cuando la imagen principal falla — para que el padre maneje el estado sin-stock */
  onMainImageError?: () => void;
}

export function ProductImageGallery({
  images,
  productName,
  discount,
  onMainImageError,
}: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [errorSet, setErrorSet] = useState<Set<number>>(new Set());

  function markError(index: number) {
    setErrorSet((prev) => new Set(prev).add(index));
    if (index === activeIndex && onMainImageError) {
      onMainImageError();
    }
  }

  const mainImage = images[activeIndex];
  const mainHasError = errorSet.has(activeIndex);

  return (
    <div className="space-y-3">
      {/* Imagen principal */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
        {mainImage && !mainHasError ? (
          <Image
            src={getProductImageUrl(mainImage.image_url, { width: 800, height: 800 })}
            alt={mainImage.alt_text ?? productName}
            fill
            className="object-contain p-6 transition-opacity duration-200"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            onError={() => markError(activeIndex)}
          />
        ) : (
          // Placeholder cuando no hay imagen o falla
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-300">
            <Package className="w-20 h-20" strokeWidth={0.75} />
            <span className="text-sm text-slate-400">Sin imagen disponible</span>
          </div>
        )}

        {/* Badge de descuento */}
        {discount > 0 && !mainHasError && (
          <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
            -{discount}% OFF
          </span>
        )}
      </div>

      {/* Miniaturas */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, index) => {
            const hasError = errorSet.has(index);
            const isActive = activeIndex === index;
            return (
              <button
                key={img.id ?? index}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative w-[64px] h-[64px] flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                  isActive
                    ? "border-brand-400 shadow-sm"
                    : "border-slate-100 hover:border-brand-300",
                  hasError && "opacity-40"
                )}
              >
                {!hasError ? (
                  <Image
                    src={getProductImageUrl(img.image_url, { width: 128, height: 128 })}
                    alt={img.alt_text ?? `${productName} imagen ${index + 1}`}
                    fill
                    className="object-contain p-1.5 bg-slate-50"
                    sizes="64px"
                    onError={() => markError(index)}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-slate-300" strokeWidth={1} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
