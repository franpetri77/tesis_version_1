"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useAuthStore } from "@/stores/authStore";
import type { Product } from "@/types";

type Props =
  | { placement: "home" }
  | { placement: "product"; productId: string }
  | { placement: "checkout"; orderId: string };

interface Recommendations {
  products: Product[];
  matched: boolean;
}

export function RecommendationSection(props: Props) {
  const userId = useAuthStore((state) => state.isAuthenticated ? state.user?.id : undefined);
  const titleId = useId();
  const [result, setResult] = useState<{ key: string; data: Recommendations } | null>(null);
  // En el inicio el carrusel admite más productos (el backend acepta hasta 12)
  const params = new URLSearchParams({ limit: props.placement === "home" ? "12" : "4" });
  if (props.placement === "product") params.set("product_id", props.productId);
  else params.set("scope", "personal");
  if (props.placement === "checkout") params.set("order_id", props.orderId);
  const query = params.toString();
  const publicSection = props.placement === "product";
  const waitingForOrder = props.placement === "checkout";
  const key = publicSection ? query : userId ? `${userId}:${query}` : null;

  useEffect(() => {
    if (!key) return;
    const token = publicSection ? null : localStorage.getItem("tele_import_token");
    if (!publicSection && !token) return;
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;

    async function load(attempt = 0) {
      try {
        const response = await fetch(`/api/recomendaciones?${query}`, {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data: Recommendations = await response.json();
        if (controller.signal.aborted || !key) return;
        if (waitingForOrder && data.products.length === 0 && attempt < 4) {
          // El regreso a la tienda puede ocurrir antes de que llegue el webhook.
          retry = setTimeout(() => void load(attempt + 1), 2000);
          return;
        }
        setResult({ key, data });
      } catch {
        // El contenido principal sigue disponible si falla esta consulta.
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(retry);
      setResult(null);
    };
  }, [key, publicSection, query, waitingForOrder]);

  const data = key && result?.key === key ? result.data : null;
  if (!data?.products.length) return null;

  const title = props.placement === "product" ? "Productos relacionados"
    : props.placement === "checkout" && data.matched ? "También te puede interesar"
    : data.matched ? "Recomendados para vos"
    : "Descubrí más productos";

  // En el inicio, un carrusel horizontal: se distingue de la grilla de
  // destacados que tiene arriba y permite mostrar más productos sin alargar
  // la página.
  if (props.placement === "home") {
    return (
      <ProductRail
        titleId={titleId}
        title={title}
        subtitle={data.matched ? "Según lo que viste y compraste en la tienda" : "Más productos disponibles en el catálogo"}
        products={data.products}
      />
    );
  }

  return (
    <section className="border-t border-paper-300 py-10 text-left sm:py-12" aria-labelledby={titleId}>
      <h2 id={titleId} className="titulo-display mb-6 text-2xl text-slate-900 sm:mb-8 sm:text-3xl">{title}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {data.products.map((product) => (
          <li key={product.id} className="min-w-0"><ProductCard product={product} /></li>
        ))}
      </ul>
    </section>
  );
}

// ─── Carrusel horizontal de productos ────────────────────────────────────────
// Desplazamiento nativo con scroll-snap (funciona con trackpad, rueda con
// Shift, arrastre táctil y teclado) y flechas que avanzan de a una "página".

const ARROW =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-paper-300 bg-paper-50 text-slate-700 hover:bg-paper-100 hover:text-slate-900 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-paper-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50";

function ProductRail({
  titleId, title, subtitle, products,
}: { titleId: string; title: string; subtitle: string; products: Product[] }) {
  const railRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [updateEdges, products.length]);

  function page(direction: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <section className="bg-paper-50 py-14 lg:py-16" aria-labelledby={titleId}>
      <div className="container-main">
        <div className="mb-6 flex items-end justify-between gap-6 lg:mb-8">
          <div className="min-w-0">
            <h2 id={titleId} className="titulo-display text-2xl text-slate-900 lg:text-3xl">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button type="button" className={ARROW} onClick={() => page(-1)} disabled={edges.start} aria-label="Ver productos anteriores">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={ARROW} onClick={() => page(1)} disabled={edges.end} aria-label="Ver más productos">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <ul
          ref={railRef}
          onScroll={updateEdges}
          className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-1 px-1 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product) => (
            <li
              key={product.id}
              className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23%] xl:w-[18.6%]"
            >
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
