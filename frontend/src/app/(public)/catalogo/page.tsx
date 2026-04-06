// =============================================
// PÁGINA: CATÁLOGO DE PRODUCTOS
// SSR con filtros. Sidebar sticky con scroll propio.
// Estilo Apple: fondo gris, cards blancas, animaciones suaves.
// =============================================

import type { Metadata } from "next";
import Link from "next/link";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import { getPublicProducts, getCategories } from "@/lib/api/catalog";
import { ProductCard } from "@/components/catalog/ProductCard";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { ActiveFilterChips } from "@/components/catalog/ActiveFilterChips";
import type { CatalogFilters as Filters } from "@/types";

export const metadata: Metadata = {
  title: "Catálogo — Tele Import",
  description: "Televisores, smartphones, laptops, audio y electrodomésticos.",
};

export const revalidate = 120;

const PRODUCTS_PER_PAGE = 24;

interface CatalogPageProps {
  searchParams: {
    categoria?: string;
    buscar?: string;
    precio_min?: string;
    precio_max?: string;
    orden?: string;
    pagina?: string;
    destacados?: string;
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const currentPage = searchParams.pagina ? Math.max(1, Number(searchParams.pagina)) : 1;

  const filters: Filters = {
    category:  searchParams.categoria,
    search:    searchParams.buscar,
    min_price: searchParams.precio_min ? Number(searchParams.precio_min) : undefined,
    max_price: searchParams.precio_max ? Number(searchParams.precio_max) : undefined,
    sort:      (searchParams.orden as Filters["sort"]) ?? "newest",
    page:      currentPage,
    limit:     PRODUCTS_PER_PAGE,
    featured:  searchParams.destacados === "true" ? true : undefined,
  };

  const [productsResult, categories] = await Promise.all([
    getPublicProducts(filters),
    getCategories(),
  ]);

  const products       = productsResult.products;
  const totalPages     = productsResult.totalPages;
  const activeCategory = categories.find((c) => c.slug === filters.category);

  const rawParams: Record<string, string | undefined> = {
    categoria:   searchParams.categoria,
    buscar:      searchParams.buscar,
    precio_min:  searchParams.precio_min,
    precio_max:  searchParams.precio_max,
    orden:       searchParams.orden,
    pagina:      searchParams.pagina,
    destacados:  searchParams.destacados,
  };

  const hasMore = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  function buildPageUrl(page: number) {
    const p = { ...rawParams, pagina: page > 1 ? String(page) : undefined } as Record<string, string>;
    Object.keys(p).forEach((k) => !p[k] && delete p[k]);
    const qs = new URLSearchParams(p).toString();
    return qs ? `/catalogo?${qs}` : "/catalogo";
  }

  const pageTitle = filters.search
    ? `Resultados para "${filters.search}"`
    : filters.featured
    ? "Productos destacados"
    : activeCategory?.name ?? "Todos los productos";

  return (
    <div className="container-main py-8 fade-up">

      {/* ── ENCABEZADO ─────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 -tracking-[0.03em]">
          {pageTitle}
        </h1>
        <p className="text-sm text-slate-400 mt-1.5 font-medium">
          {products.length === 0
            ? "Sin resultados para los filtros seleccionados"
            : products.length < PRODUCTS_PER_PAGE
            ? `${products.length} ${products.length === 1 ? "producto" : "productos"}`
            : `Página ${currentPage} de ${totalPages}`}
        </p>
      </div>

      {/* ── LAYOUT: SIDEBAR + GRID ─────────────────────── */}
      {/*
        filters-sidebar: sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto
        El sidebar hace scroll de manera independiente a la página.
        El grid de productos scrollea normalmente con el body.
      */}
      <div className="flex gap-6 items-start">

        {/* SIDEBAR DESKTOP — con scroll independiente */}
        <aside className="hidden md:block w-[220px] lg:w-[240px] flex-shrink-0">
          <div className="filters-sidebar pr-2">
            <CatalogFilters
              categories={categories}
              currentFilters={filters}
              searchParams={rawParams}
              totalProducts={productsResult.total}
            />
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 min-w-0">

          {/* Botón filtros mobile + chips activos */}
          <div className="mb-5 space-y-3">
            <CatalogFilters
              categories={categories}
              currentFilters={filters}
              searchParams={rawParams}
              totalProducts={productsResult.total}
              mobileOnly
            />
            <ActiveFilterChips
              currentFilters={filters}
              searchParams={rawParams}
              categories={categories}
            />
          </div>

          {products.length === 0 ? (
            /* ── ESTADO VACÍO ── */
            <div className="flex flex-col items-center justify-center py-28 text-center fade-up">
              <div className="w-20 h-20 rounded-[28px] bg-white shadow-card
                              flex items-center justify-center mb-6">
                <Package className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 -tracking-[0.02em] mb-2">
                Sin resultados
              </h2>
              <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">
                No encontramos productos con esos filtros.
              </p>
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                           bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold
                           transition-colors shadow-sm"
              >
                Ver todos los productos
              </Link>
            </div>
          ) : (
            <>
              {/* ── GRID ── */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                {products.map((product, i) => (
                  <div
                    key={product.id}
                    className="card-enter"
                    style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}
                  >
                    <ProductCard product={product} priority={i < 6} />
                  </div>
                ))}
              </div>

              {/* ── PAGINACIÓN ── */}
              {(hasPrev || hasMore) && (
                <div className="flex items-center justify-center gap-3 mt-12">
                  <Link
                    href={buildPageUrl(currentPage - 1)}
                    aria-disabled={!hasPrev}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white
                                text-sm font-semibold transition-all shadow-card
                                ${hasPrev
                                  ? "text-slate-700 hover:shadow-card-hover hover:-translate-y-0.5"
                                  : "text-slate-300 pointer-events-none opacity-40"}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Link>

                  <span className="px-5 py-2.5 rounded-2xl bg-brand-600 text-white
                                   text-sm font-bold min-w-[80px] text-center shadow-sm">
                    {currentPage} / {totalPages}
                  </span>

                  <Link
                    href={buildPageUrl(currentPage + 1)}
                    aria-disabled={!hasMore}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white
                                text-sm font-semibold transition-all shadow-card
                                ${hasMore
                                  ? "text-slate-700 hover:shadow-card-hover hover:-translate-y-0.5"
                                  : "text-slate-300 pointer-events-none opacity-40"}`}
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
