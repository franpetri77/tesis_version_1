// =============================================
// PÁGINA: CATÁLOGO DE PRODUCTOS
// SSR con filtros. Sidebar sticky con scroll propio.
// Diseño refinado: breadcrumb, jerarquía visual,
// paginación numerada, estado vacío mejorado.
// =============================================

import type { Metadata } from "next";
import Link from "next/link";
import { Package, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { getPublicProducts, getCategories } from "@/lib/api/catalog";
import { ProductCard } from "@/components/catalog/ProductCard";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { ActiveFilterChips } from "@/components/catalog/ActiveFilterChips";
import { PromoBanner } from "@/components/catalog/PromoBanner";
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

// Genera un rango de páginas con "..." para paginaciones largas
function getPaginationRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 1;
  const range: (number | "…")[] = [];
  const left  = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1);
  if (left > 2) range.push("…");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push("…");
  range.push(total);
  return range;
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
    categoria:  searchParams.categoria,
    buscar:     searchParams.buscar,
    precio_min: searchParams.precio_min,
    precio_max: searchParams.precio_max,
    orden:      searchParams.orden,
    pagina:     searchParams.pagina,
    destacados: searchParams.destacados,
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

  const paginationRange = totalPages > 1 ? getPaginationRange(currentPage, totalPages) : [];

  return (
    <div className="container-catalog py-7 fade-up">

      {/* ── ENCABEZADO ──────────────────────────────────── */}
      <div className="mb-7">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11.5px] text-slate-400 mb-3.5">
          <Link href="/" className="flex items-center gap-1 hover:text-slate-600 transition-colors">
            <Home className="w-3 h-3" />
            <span>Inicio</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <Link href="/catalogo" className={filters.category || filters.search || filters.featured
            ? "hover:text-slate-600 transition-colors"
            : "text-slate-800 font-semibold pointer-events-none"
          }>
            Catálogo
          </Link>
          {activeCategory && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-700 font-semibold">{activeCategory.name}</span>
            </>
          )}
          {filters.featured && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-700 font-semibold">Destacados</span>
            </>
          )}
          {filters.search && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-700 font-semibold truncate max-w-[180px]">
                &ldquo;{filters.search}&rdquo;
              </span>
            </>
          )}
        </nav>

        {/* Título + contador */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Acento visual izquierdo */}
            <div className="hidden sm:block w-1 h-8 rounded-full bg-brand-600 flex-shrink-0" />
            <div>
              <h1 className="text-[22px] font-bold text-slate-900 -tracking-[0.03em] leading-tight">
                {pageTitle}
              </h1>
              <p className="text-[12px] text-slate-400 mt-0.5 font-medium">
                {products.length === 0
                  ? "Sin resultados para los filtros seleccionados"
                  : `${productsResult.total.toLocaleString("es-AR")} ${productsResult.total === 1 ? "producto" : "productos"}${totalPages > 1 ? ` · Página ${currentPage} de ${totalPages}` : ""}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MINI BANNER PROMOCIONAL ────────────────────── */}
      <PromoBanner />

      {/* ── LAYOUT: SIDEBAR + GRID ─────────────────────── */}
      <div className="flex gap-6 xl:gap-7 2xl:gap-8 items-start">

        {/* SIDEBAR DESKTOP */}
        <aside className="hidden md:block w-[220px] lg:w-[240px] xl:w-[260px] 2xl:w-[280px] flex-shrink-0">
          <div className="filters-sidebar pr-1">
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
          <div className="mb-4 space-y-2.5">
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
            <div className="flex flex-col items-center justify-center py-24 text-center fade-up">
              {/* Ícono con gradiente radial decorativo */}
              <div className="relative mb-7">
                <div className="absolute inset-0 scale-[2] rounded-full bg-brand-600/5 blur-2xl pointer-events-none" />
                <div className="relative w-20 h-20 rounded-[22px] bg-white border border-slate-100
                                shadow-[0_4px_20px_rgba(0,0,0,0.06)]
                                flex items-center justify-center">
                  <Package className="w-9 h-9 text-slate-300" strokeWidth={1.25} />
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-800 -tracking-[0.02em] mb-2.5">
                Sin resultados
              </h2>
              <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">
                No encontramos productos con esos filtros.<br />
                Intentá ajustar o limpiar los criterios de búsqueda.
              </p>
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl
                           bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold
                           transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                Ver todos los productos
              </Link>
            </div>

          ) : (
            <>
              {/* ── GRID DE PRODUCTOS ── */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 lg:gap-4 xl:gap-5">
                {products.map((product, i) => (
                  <div
                    key={product.id}
                    className="card-enter"
                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                  >
                    <ProductCard product={product} priority={i < 6} />
                  </div>
                ))}
              </div>

              {/* ── PAGINACIÓN NUMERADA ── */}
              {paginationRange.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 mt-12">

                  {/* Anterior */}
                  <PaginationButton
                    href={buildPageUrl(currentPage - 1)}
                    disabled={!hasPrev}
                    label="Anterior"
                    icon={<ChevronLeft className="w-3.5 h-3.5" />}
                    iconPosition="left"
                  />

                  {/* Números */}
                  {paginationRange.map((item, idx) =>
                    item === "…" ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-1.5 text-slate-400 text-sm select-none"
                      >
                        …
                      </span>
                    ) : (
                      <Link
                        key={item}
                        href={buildPageUrl(item as number)}
                        className={cn(
                          "min-w-[36px] h-9 flex items-center justify-center",
                          "rounded-xl text-sm font-semibold transition-all",
                          item === currentPage
                            ? "bg-brand-600 text-white shadow-sm shadow-brand-600/25"
                            : "bg-white text-slate-600 border border-slate-200 hover:border-brand-300 hover:text-brand-600"
                        )}
                      >
                        {item}
                      </Link>
                    )
                  )}

                  {/* Siguiente */}
                  <PaginationButton
                    href={buildPageUrl(currentPage + 1)}
                    disabled={!hasMore}
                    label="Siguiente"
                    icon={<ChevronRight className="w-3.5 h-3.5" />}
                    iconPosition="right"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── cn helper inline (para uso server-side sin importar) ─── */
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ─── Botón de paginación (prev/next) ─── */
interface PaginationButtonProps {
  href: string;
  disabled: boolean;
  label: string;
  icon: React.ReactNode;
  iconPosition: "left" | "right";
}

function PaginationButton({ href, disabled, label, icon, iconPosition }: PaginationButtonProps) {
  if (disabled) {
    return (
      <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                        bg-white border border-slate-200
                        text-slate-300 text-sm font-semibold
                        cursor-not-allowed select-none">
        {iconPosition === "left" && icon}
        {label}
        {iconPosition === "right" && icon}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                 bg-white border border-slate-200
                 text-slate-600 text-sm font-semibold
                 hover:border-brand-300 hover:text-brand-600
                 transition-all"
    >
      {iconPosition === "left" && icon}
      {label}
      {iconPosition === "right" && icon}
    </Link>
  );
}
