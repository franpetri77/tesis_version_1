"use client";

// =============================================
// COMPONENTE: CATALOG FILTERS
// Panel de filtros — sidebar desktop + botón y panel lateral en mobile.
// Estilo sobrio: sin tarjeta ni franjas de color, secciones separadas por
// filetes, categorías como lista de opción única, etiquetas como chips y
// rangos de precio rápidos. El orden de resultados vive en la barra de
// herramientas del listado (SortSelect), no en el panel.
// =============================================

import { useState, useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import type { ProductTag, Category, CatalogFilters as Filters } from "@/types";

interface CatalogFiltersProps {
  tags?: ProductTag[];
  categories: Category[];
  currentFilters: Filters;
  searchParams: Record<string, string | undefined>;
  totalProducts: number;
  /** Solo renderiza el botón + panel mobile */
  mobileOnly?: boolean;
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50";

// Rangos rápidos de precio (ARS)
const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: `Hasta ${formatPrice(100000).replace(",00", "")}`, max: 100000 },
  { label: `${formatPrice(100000).replace(",00", "")} a ${formatPrice(500000).replace(",00", "")}`, min: 100000, max: 500000 },
  { label: `Más de ${formatPrice(500000).replace(",00", "")}`, min: 500000 },
];

function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.tag) n++;
  if (f.category)  n++;
  if (f.search)    n++;
  if (f.min_price || f.max_price) n++;
  return n;
}

export function CatalogFilters({
  categories,
  tags = [],
  currentFilters,
  searchParams,
  totalProducts,
  mobileOnly = false,
}: CatalogFiltersProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [priceMin, setPriceMin]     = useState(searchParams.precio_min ?? "");
  const [priceMax, setPriceMax]     = useState(searchParams.precio_max ?? "");
  const closeRef  = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const activeCount      = countActiveFilters(currentFilters);
  const hasActiveFilters = activeCount > 0;
  const hasPrice         = Boolean(currentFilters.min_price || currentFilters.max_price);

  const buildUrl = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const base   = { ...searchParams } as Record<string, string>;
      const merged = { ...base, ...overrides };
      Object.keys(merged).forEach((k) => { if (!merged[k]) delete merged[k]; });
      const qs = new URLSearchParams(merged as Record<string, string>).toString();
      return qs ? `/catalogo?${qs}` : "/catalogo";
    },
    [searchParams]
  );

  function navigate(overrides: Record<string, string | undefined>) {
    router.push(buildUrl({ ...overrides, pagina: undefined }));
    setMobileOpen(false);
  }

  function applyPrice(min = priceMin, max = priceMax) {
    navigate({ precio_min: min || undefined, precio_max: max || undefined });
  }

  function clearAll() {
    setPriceMin(""); setPriceMax("");
    router.push("/catalogo");
    setMobileOpen(false);
  }

  // Panel mobile: foco en "cerrar" al abrir, Escape cierra y el foco vuelve
  // al botón "Filtros"; el scroll de la página queda bloqueado mientras tanto.
  useEffect(() => {
    if (!mobileOpen) return;
    closeRef.current?.focus();
    const opener = openerRef.current;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMobileOpen(false); }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus();
    };
  }, [mobileOpen]);

  /* ─────────────────────────────────────────────────────────
     PANEL DE FILTROS (sidebar y panel mobile comparten este JSX)
  ───────────────────────────────────────────────────────── */
  const panel = (
    <div>
      {/* ── 1. Categoría ── */}
      <FilterSection label="Categoría" active={Boolean(currentFilters.category)}>
        <ul className="space-y-0.5">
          <li>
            <OptionButton
              label="Todas"
              active={!currentFilters.category}
              count={!currentFilters.category ? totalProducts : undefined}
              onClick={() => navigate({ categoria: undefined })}
            />
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <OptionButton
                label={cat.name}
                active={currentFilters.category === cat.slug}
                count={currentFilters.category === cat.slug ? totalProducts : undefined}
                onClick={() => navigate({ categoria: cat.slug })}
              />
            </li>
          ))}
        </ul>
      </FilterSection>

      {/* ── 2. Precio ── */}
      <FilterSection label="Precio" active={hasPrice}>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((p) => {
            const active = (currentFilters.min_price ?? undefined) === p.min && (currentFilters.max_price ?? undefined) === p.max;
            return (
              <Chip
                key={p.label}
                active={active}
                onClick={() => {
                  if (active) { setPriceMin(""); setPriceMax(""); applyPrice("", ""); return; }
                  setPriceMin(p.min ? String(p.min) : ""); setPriceMax(p.max ? String(p.max) : "");
                  applyPrice(p.min ? String(p.min) : "", p.max ? String(p.max) : "");
                }}
              >
                {p.label}
              </Chip>
            );
          })}
        </div>

        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); applyPrice(); }}
        >
          <PriceInput label="Precio mínimo" placeholder="Mín." value={priceMin} onChange={setPriceMin} />
          <span className="text-slate-400" aria-hidden="true">–</span>
          <PriceInput label="Precio máximo" placeholder="Máx." value={priceMax} onChange={setPriceMax} />
          <button
            type="submit"
            aria-label="Aplicar rango de precio"
            className={cn(
              "h-9 shrink-0 rounded-lg border border-slate-900/15 px-3 text-xs font-semibold text-slate-900 hover:border-slate-900 hover:bg-slate-900 hover:text-paper-50",
              "motion-safe:transition-colors", FOCUS_RING
            )}
          >
            Ir
          </button>
        </form>
      </FilterSection>

      {/* ── 3. Etiquetas ── */}
      {(tags.length > 0 || currentFilters.tag) && (
        <FilterSection label="Etiquetas" active={Boolean(currentFilters.tag)}>
          <div className="flex flex-wrap gap-1.5">
            {currentFilters.tag && !tags.some((t) => t.slug === currentFilters.tag) && (
              <Chip active onClick={() => navigate({ etiqueta: undefined })}>{currentFilters.tag}</Chip>
            )}
            {tags.map((t) => {
              const active = currentFilters.tag === t.slug;
              return (
                <Chip key={t.id} active={active} onClick={() => navigate({ etiqueta: active ? undefined : t.slug })}>
                  {t.name}
                </Chip>
              );
            })}
          </div>
        </FilterSection>
      )}
    </div>
  );

  const header = (
    <div className="flex items-center justify-between gap-3 pb-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        Filtros
        {hasActiveFilters && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-bold tabular-nums text-paper-50">
            {activeCount}
          </span>
        )}
      </h2>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className={cn("rounded-sm text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline", FOCUS_RING)}
        >
          Limpiar todo
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ── BOTÓN MOBILE ── */}
      <button
        ref={openerRef}
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-expanded={mobileOpen}
        aria-controls="catalog-filters-panel"
        className={cn(
          "md:hidden flex h-10 items-center gap-2 rounded-lg border border-paper-300 bg-paper-50 px-3.5 text-sm font-medium text-slate-800 hover:border-paper-400",
          "motion-safe:transition-colors", FOCUS_RING
        )}
      >
        <SlidersHorizontal className="h-4 w-4 text-slate-500" aria-hidden="true" />
        Filtros
        {hasActiveFilters && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-bold tabular-nums text-paper-50">
            {activeCount}
          </span>
        )}
      </button>

      {/* ── SIDEBAR DESKTOP ── */}
      {!mobileOnly && (
        <div className="hidden md:block">
          {header}
          {panel}
        </div>
      )}

      {/* ── PANEL MOBILE ──
          En un portal sobre <body>: el listado tiene animaciones con
          transform que crean un contexto de apilamiento y dejarían el panel
          debajo del header fijo. */}
      {mobileOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[60] bg-slate-900/40 motion-safe:animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            id="catalog-filters-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            className="fixed inset-y-0 left-0 z-[61] flex w-[86vw] max-w-sm flex-col bg-paper-50 shadow-2xl motion-safe:animate-drawer-in"
          >
            <div className="flex items-center justify-between border-b border-paper-300 px-5 py-4">
              <span className="text-base font-semibold text-slate-900">Filtros</span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar filtros"
                className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-paper-100 hover:text-slate-900", FOCUS_RING)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2 [&>div>section:first-child]:border-t-0">
              {panel}
            </div>

            <div className="flex gap-2 border-t border-paper-300 px-5 py-4">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className={cn("h-11 flex-1 rounded-lg border border-paper-300 text-sm font-medium text-slate-700 hover:bg-paper-100", FOCUS_RING)}
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className={cn("h-11 flex-[2] rounded-lg bg-brand-600 text-sm font-semibold text-paper-50 hover:bg-brand-700", FOCUS_RING)}
              >
                Ver {totalProducts.toLocaleString("es-AR")} producto{totalProducts !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   SUB-COMPONENTES
──────────────────────────────────────────────────────────── */

function FilterSection({
  label, active, children,
}: { label: string; active: boolean; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const contentId = useId();
  return (
    <section className="border-t border-paper-300 py-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={contentId}
        className={cn("flex w-full items-center justify-between gap-2 rounded-sm text-left", FOCUS_RING)}
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
          {active && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
              <span className="sr-only">(filtro activo)</span>
            </>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-slate-400 motion-safe:transition-transform motion-safe:duration-200", expanded && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {expanded && <div id={contentId} className="mt-3">{children}</div>}
    </section>
  );
}

/** Opción de una lista de selección única (categorías). */
function OptionButton({
  label, active, count, onClick,
}: { label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left text-sm",
        active ? "font-medium text-slate-900" : "text-slate-600 hover:bg-paper-100 hover:text-slate-900",
        "motion-safe:transition-colors", FOCUS_RING
      )}
    >
      <span
        className={cn(
          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
          active ? "border-brand-600" : "border-slate-300"
        )}
        aria-hidden="true"
      >
        {active && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="shrink-0 text-xs tabular-nums text-slate-400">{count.toLocaleString("es-AR")}</span>
      )}
    </button>
  );
}

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium",
        active
          ? "border-slate-900 bg-slate-900 text-paper-50"
          : "border-paper-300 bg-paper-50 text-slate-700 hover:border-slate-400 hover:text-slate-900",
        "motion-safe:transition-colors", FOCUS_RING
      )}
    >
      {children}
    </button>
  );
}

function PriceInput({
  label, placeholder, value, onChange,
}: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400" aria-hidden="true">$</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-paper-300 bg-paper-50 pl-6 pr-2 text-sm text-slate-900 placeholder:text-slate-400 hover:border-paper-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </label>
  );
}
