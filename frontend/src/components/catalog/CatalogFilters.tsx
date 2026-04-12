"use client";

// =============================================
// COMPONENTE: CATALOG FILTERS
// Panel de filtros — botón mobile + drawer + sidebar desktop.
// Rediseñado con acento de marca, secciones más limpias
// y estados activos más expresivos.
// =============================================

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal, X, ChevronDown, ChevronUp,
  Tag, ArrowUpDown, DollarSign, RotateCcw, Check,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Category, CatalogFilters as Filters } from "@/types";

interface CatalogFiltersProps {
  categories: Category[];
  currentFilters: Filters;
  searchParams: Record<string, string | undefined>;
  totalProducts: number;
  /** Solo renderiza el botón + drawer mobile */
  mobileOnly?: boolean;
}

const SORT_OPTIONS = [
  { value: "newest",     label: "Más recientes",  symbol: "✦" },
  { value: "price_asc",  label: "Menor precio",   symbol: "↑" },
  { value: "price_desc", label: "Mayor precio",   symbol: "↓" },
  { value: "name_asc",   label: "Nombre A–Z",     symbol: "Az" },
] as const;

function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.category)  n++;
  if (f.search)    n++;
  if (f.min_price) n++;
  if (f.max_price) n++;
  return n;
}

export function CatalogFilters({
  categories,
  currentFilters,
  searchParams,
  totalProducts,
  mobileOnly = false,
}: CatalogFiltersProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [priceMin, setPriceMin]           = useState(searchParams.precio_min ?? "");
  const [priceMax, setPriceMax]           = useState(searchParams.precio_max ?? "");
  const [catExpanded, setCatExpanded]     = useState(true);
  const [priceExpanded, setPriceExpanded] = useState(true);
  const [sortExpanded, setSortExpanded]   = useState(true);

  const activeCount      = countActiveFilters(currentFilters);
  const hasActiveFilters = activeCount > 0;

  const buildUrl = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const base   = { ...searchParams } as Record<string, string>;
      const merged = { ...base, ...overrides };
      Object.keys(merged).forEach((k) => { if (!merged[k]) delete merged[k]; });
      return `/catalogo?${new URLSearchParams(merged as Record<string, string>).toString()}`;
    },
    [searchParams]
  );

  function navigate(overrides: Record<string, string | undefined>) {
    router.push(buildUrl(overrides));
    setMobileOpen(false);
  }

  function applyPrice() {
    navigate({ precio_min: priceMin || undefined, precio_max: priceMax || undefined, pagina: undefined });
  }

  function clearAll() {
    setPriceMin(""); setPriceMax("");
    router.push("/catalogo");
    setMobileOpen(false);
  }

  /* ─────────────────────────────────────────────────────────
     PANEL DE FILTROS (sidebar y drawer comparten este JSX)
  ───────────────────────────────────────────────────────── */
  const panel = (
    <div className="space-y-2">

      {/* ── Encabezado del panel ── */}
      <div className="flex items-center justify-between pb-3 mb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-50 flex items-center justify-center">
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-600" />
          </div>
          <span className="font-bold text-slate-900 text-[13.5px] tracking-tight">Filtros</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
                             bg-brand-600 text-white text-[10px] font-bold leading-none">
              {activeCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="group flex items-center gap-1.5 text-[11px] font-semibold text-slate-500
                       hover:text-red-600 transition-colors px-2.5 py-1.5 rounded-lg
                       hover:bg-red-50 border border-transparent hover:border-red-200"
          >
            <RotateCcw className="w-3 h-3 group-hover:rotate-[-45deg] transition-transform duration-200" />
            Limpiar
          </button>
        )}
      </div>

      {/* ── 1. Categorías ── */}
      <FilterSection
        label="Categoría"
        icon={<Tag className="w-3.5 h-3.5" />}
        expanded={catExpanded}
        onToggle={() => setCatExpanded(!catExpanded)}
        active={Boolean(currentFilters.category)}
      >
        <div className="space-y-0.5 py-1">
          <CategoryButton
            label="Todas las categorías"
            active={!currentFilters.category}
            count={!currentFilters.category ? totalProducts : undefined}
            onClick={() => navigate({ categoria: undefined, pagina: undefined })}
          />
          {categories.map((cat) => (
            <CategoryButton
              key={cat.id}
              label={cat.name}
              active={currentFilters.category === cat.slug}
              onClick={() => navigate({ categoria: cat.slug, pagina: undefined })}
            />
          ))}
        </div>
      </FilterSection>

      {/* ── 2. Precio ── */}
      <FilterSection
        label="Precio (ARS)"
        icon={<DollarSign className="w-3.5 h-3.5" />}
        expanded={priceExpanded}
        onToggle={() => setPriceExpanded(!priceExpanded)}
        active={Boolean(currentFilters.min_price || currentFilters.max_price)}
      >
        <div className="px-1 py-2 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Desde
              </label>
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  min={0}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                  placeholder="0"
                  className="w-full pl-6 pr-2.5 py-2 rounded-lg border border-slate-200
                             hover:border-slate-300 bg-white
                             text-[12px] text-slate-900 placeholder:text-slate-300
                             focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-400
                             transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Hasta
              </label>
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  min={0}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                  placeholder="∞"
                  className="w-full pl-6 pr-2.5 py-2 rounded-lg border border-slate-200
                             hover:border-slate-300 bg-white
                             text-[12px] text-slate-900 placeholder:text-slate-300
                             focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-400
                             transition-colors"
                />
              </div>
            </div>
          </div>
          <button
            onClick={applyPrice}
            className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-700 active:scale-[0.98]
                       text-white text-[12px] font-semibold transition-all shadow-sm"
          >
            Aplicar rango
          </button>
          {(currentFilters.min_price || currentFilters.max_price) && (
            <button
              onClick={() => {
                setPriceMin(""); setPriceMax("");
                navigate({ precio_min: undefined, precio_max: undefined });
              }}
              className="w-full flex items-center justify-center gap-1.5
                         text-[11px] text-slate-400 hover:text-red-500 font-medium transition-colors py-1"
            >
              <X className="w-3 h-3" />
              Quitar filtro de precio
            </button>
          )}
        </div>
      </FilterSection>

      {/* ── 3. Ordenar por ── */}
      <FilterSection
        label="Ordenar por"
        icon={<ArrowUpDown className="w-3.5 h-3.5" />}
        expanded={sortExpanded}
        onToggle={() => setSortExpanded(!sortExpanded)}
        active={false}
      >
        <div className="space-y-0.5 py-1">
          {SORT_OPTIONS.map(({ value, label, symbol }) => {
            const isActive = currentFilters.sort === value;
            return (
              <button
                key={value}
                onClick={() => navigate({ orden: value })}
                className={cn(
                  "w-full text-left text-[12px] flex items-center justify-between",
                  "py-2 px-2.5 rounded-lg transition-all",
                  isActive
                    ? "bg-brand-50 text-brand-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className={cn(
                    "w-5 h-5 flex items-center justify-center rounded-md",
                    "text-[10px] font-bold flex-shrink-0",
                    isActive ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {symbol}
                  </span>
                  {label}
                </span>
                {isActive && <Check className="w-3 h-3 text-brand-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </FilterSection>
    </div>
  );

  return (
    <>
      {/* ── BOTÓN MOBILE ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl
                   bg-white text-[13px] font-semibold text-slate-700
                   border border-slate-200 hover:border-slate-300
                   shadow-sm hover:shadow transition-all"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
        Filtros
        {hasActiveFilters && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
                           bg-brand-600 text-white text-[10px] font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {/* ── SIDEBAR DESKTOP ── */}
      {!mobileOnly && (
        <div className="hidden md:block">
          <div className="bg-white rounded-2xl overflow-hidden
                          border border-slate-100
                          shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)]">
            {/* Franja de acento superior */}
            <div className="h-[3px] bg-gradient-to-r from-brand-700 via-brand-500 to-brand-400" />
            <div className="p-4 pb-5">
              {panel}
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER MOBILE ── */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[85vw] max-w-xs bg-white z-50
                          flex flex-col shadow-2xl rounded-r-2xl animate-drawer-in">
            {/* Header */}
            <div className="h-[3px] bg-gradient-to-r from-brand-700 via-brand-500 to-brand-400 flex-shrink-0" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-brand-600" />
                </div>
                <span className="font-bold text-slate-900 text-[14px]">Filtros</span>
                {hasActiveFilters && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
                                   bg-brand-600 text-white text-[10px] font-bold">
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl
                           hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {panel}
            </div>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-slate-100 space-y-2">
              {hasActiveFilters && (
                <button
                  onClick={clearAll}
                  className="w-full py-2.5 rounded-xl border border-slate-200
                             text-slate-600 text-sm font-semibold
                             hover:bg-slate-50 transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
              <button
                onClick={() => setMobileOpen(false)}
                className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700
                           text-white text-sm font-semibold transition-colors shadow-sm"
              >
                Ver {totalProducts.toLocaleString("es-AR")} producto{totalProducts !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   SUB-COMPONENTES
──────────────────────────────────────────────────────────── */

interface FilterSectionProps {
  label: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  active: boolean;
  children: React.ReactNode;
}

function FilterSection({ label, icon, expanded, onToggle, active, children }: FilterSectionProps) {
  return (
    <div className="border-t border-slate-100 first:border-t-0 pt-2 first:pt-0">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-1 py-2 rounded-lg transition-colors",
          "hover:bg-slate-50"
        )}
      >
        <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
          <span className={cn(
            "w-5 h-5 flex items-center justify-center rounded-md transition-colors flex-shrink-0",
            active ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-400"
          )}>
            {icon}
          </span>
          {label}
          {active && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
          )}
        </span>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        }
      </button>
      {expanded && (
        <div className="pl-1">
          {children}
        </div>
      )}
    </div>
  );
}

interface CategoryButtonProps {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}

function CategoryButton({ label, active, count, onClick }: CategoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left text-[12px] flex items-center justify-between",
        "py-2 px-2.5 rounded-lg transition-all duration-150",
        active
          ? "bg-brand-600 text-white font-semibold shadow-sm shadow-brand-600/20"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
      )}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded-md font-bold ml-2 flex-shrink-0 transition-colors",
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
        )}>
          {count.toLocaleString("es-AR")}
        </span>
      )}
    </button>
  );
}
