"use client";

// =============================================
// COMPONENTE: PRODUCT IMAGE GALLERY
// Galería interactiva del detalle de producto.
// Maneja errores de imagen, cambio de imagen activa
// y vista ampliada (lightbox) al hacer click.
// =============================================

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Package, ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getProductImageUrl } from "@/lib/api/catalog";
import { cn } from "@/lib/utils/cn";
import type { ProductImage } from "@/types";

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  discount: number;
  onMainImageError?: () => void;
}

export function ProductImageGallery({
  images,
  productName,
  discount,
  onMainImageError,
}: ProductImageGalleryProps) {
  const [activeIndex,  setActiveIndex]  = useState(0);
  const [errorSet,     setErrorSet]     = useState<Set<number>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx,  setLightboxIdx]  = useState(0);

  function markError(index: number) {
    setErrorSet((prev) => new Set(prev).add(index));
    if (index === activeIndex && onMainImageError) onMainImageError();
  }

  // ── Lightbox helpers ────────────────────────────────────────────────────
  function openLightbox(index: number) {
    setLightboxIdx(index);
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
  }

  const lightboxPrev = useCallback(() => {
    setLightboxIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIdx((i) => (i === images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  // Cerrar con Escape, navegar con flechas de teclado
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")      closeLightbox();
      if (e.key === "ArrowLeft")   lightboxPrev();
      if (e.key === "ArrowRight")  lightboxNext();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, lightboxPrev, lightboxNext]);

  const mainImage    = images[activeIndex];
  const mainHasError = errorSet.has(activeIndex);
  const canZoom      = mainImage && !mainHasError;

  return (
    <>
      <div className="space-y-3">
        {/* ── Imagen principal ── */}
        <div
          className={cn(
            "relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100",
            canZoom && "group cursor-zoom-in"
          )}
          onClick={() => canZoom && openLightbox(activeIndex)}
          role={canZoom ? "button" : undefined}
          tabIndex={canZoom ? 0 : undefined}
          aria-label={canZoom ? `Ampliar imagen de ${productName}` : undefined}
          onKeyDown={(e) => e.key === "Enter" && canZoom && openLightbox(activeIndex)}
        >
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

          {/* Hint de zoom — aparece al hover */}
          {canZoom && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5
                            bg-slate-900/60 text-white rounded-xl text-xs font-medium
                            opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <ZoomIn className="w-3.5 h-3.5" />
              Ampliar
            </div>
          )}
        </div>

        {/* ── Miniaturas ── */}
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
                    "relative w-[64px] h-[64px] flex-shrink-0 rounded-xl overflow-hidden border-2 transicion-ui",
                    isActive
                      ? "border-brand-400 shadow-sm"
                      : "border-slate-100 hover:border-brand-300",
                    hasError && "opacity-40"
                  )}
                  aria-label={`Ver imagen ${index + 1}`}
                  aria-pressed={isActive}
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

      {/* ── Lightbox ────────────────────────────────────────────────────────
          Portal nativo: se renderiza fuera del flujo del documento
          usando un div fixed z-[9000] para cubrir toda la pantalla.
      ─────────────────────────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9000] bg-slate-950/90 flex items-center justify-center"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ampliada de ${productName}`}
        >
          {/* Imagen ampliada */}
          <div
            className="relative w-full h-full max-w-4xl max-h-[90vh] mx-4 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {!errorSet.has(lightboxIdx) && images[lightboxIdx] ? (
              <Image
                src={getProductImageUrl(images[lightboxIdx].image_url, { width: 1200, height: 1200 })}
                alt={images[lightboxIdx].alt_text ?? productName}
                fill
                className="object-contain"
                sizes="(max-width: 1280px) 100vw, 1200px"
                priority
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Package className="w-20 h-20" strokeWidth={0.75} />
                <span className="text-sm">Sin imagen</span>
              </div>
            )}
          </div>

          {/* Botón cerrar */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700
                       text-white flex items-center justify-center transition-colors focus:outline-none
                       focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Cerrar imagen ampliada"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navegación entre imágenes (solo si hay más de una) */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
                           bg-slate-800/80 hover:bg-slate-700 text-white flex items-center
                           justify-center transition-colors focus:outline-none focus-visible:ring-2
                           focus-visible:ring-white"
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
                           bg-slate-800/80 hover:bg-slate-700 text-white flex items-center
                           justify-center transition-colors focus:outline-none focus-visible:ring-2
                           focus-visible:ring-white"
                aria-label="Imagen siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Indicador de posición */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transicion-ui",
                      i === lightboxIdx ? "bg-white w-4" : "bg-white/40 hover:bg-white/70"
                    )}
                    aria-label={`Ir a imagen ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Hint teclado — solo desktop */}
          <p className="absolute bottom-6 right-6 text-xs text-slate-500 hidden md:block select-none">
            ← → para navegar · Esc para cerrar
          </p>
        </div>
      )}
    </>
  );
}
