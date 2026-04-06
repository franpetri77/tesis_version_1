"use client";

// =============================================
// COMPONENTE: CATALOG FILTERS
// Panel de filtros — botón mobile + drawer + sidebar desktop.
// Actualiza la URL con router.push para re-render SSR.
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
  /** Solo renderiza el botón + drawer mobile (omite el sidebar desktop) */
  mobileOnly?: boolean;
}

const SORT_OPTIONS = [
  { value: "newest",     label: "Más recientes",  icon: "✦" },
  { value: "price_asc",  label: "Menor precio",   icon: "↑" },
  { value: "price_desc", label: "Mayor precio",   icon: "↓" },
  { value: "name_asc",   label: "Nombre A–Z",     icon: "Az" },
] as const;

// Contador de filtros activos (sin contar ordenamiento)
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

  const activeCount = countActiveFilters(currentFilters);
  const hasActiveFilters = activeCount > 0;

  const buildUrl = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const base = { ...searchParams } as Record<string, string>;
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
     PANEL DE FILTROS (reutilizado en sidebar y drawer)
  ───────────────────────────────────────────────────────── */
  const panel = (
    <div className="space-y-1.5">

      {/* ── Encabezado del panel ── */}
      <div className="flex items-center justify-between pb-3 mb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-100 flex items-center justify-center">
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-600" />
          </div>
          <span className="font-bold text-slate-900 text-sm tracking-tight">Filtros</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold leading-none">
              {activeCount}
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="group flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200"
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
          {/* Todas */}
          <CategoryButton
            label="Todas las categorías"
            active={!currentFilters.category}
            count={!currentFilters.category ? totalProducts : undefined}
            onClick={() => navigate({ categoria: undefined, pagina: undefined })}
          />
          {/* Por categoría */}
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
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Desde</label>
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  min={0}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                  placeholder="0"
                  className="w-full pl-6 pr-2.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Hasta</label>
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  min={0}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                  placeholder="∞"
                  className="w-full pl-6 pr-2.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
          </div>

          <button
            onClick={applyPrice}
            className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-xs font-semibold transition-all shadow-sm"
          >
            Aplicar rango de precio
          </button>

          {(currentFilters.min_price || currentFilters.max_price) && (
            <button
              onClick={() => {
                setPriceMin(""); setPriceMax("");
                navigate({ precio_min: undefined, precio_max: undefined });
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-red-500 font-medium transition-colors py-1"
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
          {SORT_OPTIONS.map(({ value, label, icon }) => {
            const isActive = currentFilters.sort === value;
            return (
              <button
                key={value}
                onClick={() => navigate({ orden: value })}
                className={cn(
                  "w-full text-left text-[12px] flex items-center justify-between py-2 px-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span className="flex items-center gap-2">
                  <span className={cn(
                    "w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-bold",
                    isActive ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {icon}
                  </span>
                  {label}
                </span>
                {isActive && <Check className="w-3 h-3 text-brand-600" />}
              </button>
            );
          })}
        </div>
      </FilterSection>
    </div>
  );

  return (
    <>
      {/* ── BOTÓN MOBILE (siempre visible en mobile) ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden flex items-center gap-2 px-4 py-2.5 rounded-2xl
                   bg-white text-sm font-semibold text-slate-700 shadow-card
                   hover:shadow-card-hover transition-all"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filtros
        {hasActiveFilters && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
                           bg-brand-600 text-white text-[10px] font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {/* ── SIDEBAR DESKTOP (oculto si mobileOnly) ── */}
      {!mobileOnly && (
        <div className="hidden md:block">
          {/* El scroll lo maneja el wrapper filters-sidebar de la página */}
          <div className="bg-white rounded-2xl shadow-card p-4 pb-6">
            {panel}
          </div>
        </div>
      )}

      {/* ── DRAWER MOBILE ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] z-40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-[85vw] max-w-xs bg-white z-50 flex flex-col shadow-2xl rounded-r-2xl animate-drawer-in">
            {/* Header del drawer */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4 text-brand-600" />
                </div>
                <span className="font-bold text-slate-900">Filtros</span>
                {hasActiveFilters && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold">
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Contenido del drawer */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {panel}
            </div>

            {/* Footer del drawer */}
            <div className="px-4 py-4 border-t border-slate-100 space-y-2">
              {hasActiveFilters && (
                <button
                  onClick={clearAll}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
              <button
                onClick={() => setMobileOpen(false)}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                Ver {totalProducts} producto{totalProducts !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   SUB-COMPONENTES
───────────────────────────────────────────────────────── */

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
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 transition-colors",
          expanded ? "bg-slate-50" : "bg-white hover:bg-slate-50"
        )}
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span className={cn(
            "w-5 h-5 flex items-center justify-center rounded-md transition-colors",
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
        <div className="px-2 border-t border-slate-100">
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
        "w-full text-left text-[12px] flex items-center justify-between py-2 px-2.5 rounded-lg transition-all",
        active
          ? "bg-brand-600 text-white font-semibold shadow-sm"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors",
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
