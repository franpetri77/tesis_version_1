"use client";

// =============================================
// COMPONENTE: ACTIVE FILTER CHIPS
// Chips que muestran los filtros activos.
// Diseño refinado sin emojis: tags con icono
// de categoría, colores consistentes con branding.
// =============================================

import { X, Tag, Search, DollarSign, Star, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Category, CatalogFilters } from "@/types";
import { formatPrice } from "@/lib/utils/format";

interface ActiveFilterChipsProps {
  currentFilters: CatalogFilters;
  searchParams: Record<string, string | undefined>;
  categories: Category[];
}

export function ActiveFilterChips({
  currentFilters,
  searchParams,
  categories,
}: ActiveFilterChipsProps) {
  const router = useRouter();

  function removeFilter(key: string | string[]) {
    const keys = Array.isArray(key) ? key : [key];
    const base  = { ...searchParams } as Record<string, string>;
    keys.forEach((k) => delete base[k]);
    delete base["pagina"];
    const params = new URLSearchParams(base);
    const qs = params.toString();
    router.push(qs ? `/catalogo?${qs}` : "/catalogo");
  }

  const chips: {
    label: string;
    Icon: React.ElementType;
    removeKeys: string[];
  }[] = [];

  if (currentFilters.category) {
    const cat = categories.find((c) => c.slug === currentFilters.category);
    chips.push({ label: cat?.name ?? currentFilters.category, Icon: Tag,    removeKeys: ["categoria"] });
  }

  if (currentFilters.search) {
    chips.push({ label: `"${currentFilters.search}"`, Icon: Search, removeKeys: ["buscar"] });
  }

  if (currentFilters.featured) {
    chips.push({ label: "Destacados", Icon: Star, removeKeys: ["destacados"] });
  }

  if (currentFilters.min_price && currentFilters.max_price) {
    chips.push({
      label: `${formatPrice(currentFilters.min_price)} – ${formatPrice(currentFilters.max_price)}`,
      Icon: DollarSign,
      removeKeys: ["precio_min", "precio_max"],
    });
  } else if (currentFilters.min_price) {
    chips.push({
      label: `Desde ${formatPrice(currentFilters.min_price)}`,
      Icon: DollarSign,
      removeKeys: ["precio_min"],
    });
  } else if (currentFilters.max_price) {
    chips.push({
      label: `Hasta ${formatPrice(currentFilters.max_price)}`,
      Icon: DollarSign,
      removeKeys: ["precio_max"],
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 animate-fade-in">

      {/* Etiqueta de contexto */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <SlidersHorizontal className="w-3 h-3" />
        <span>Filtrando por:</span>
      </div>

      {/* Chips individuales */}
      {chips.map((chip) => (
        <button
          key={chip.removeKeys.join(",")}
          onClick={() => removeFilter(chip.removeKeys)}
          className="group inline-flex items-center gap-1.5
                     pl-2.5 pr-1.5 py-1 rounded-lg
                     bg-brand-50 text-brand-700
                     text-[11.5px] font-semibold
                     border border-brand-200/60
                     hover:bg-red-50 hover:text-red-700 hover:border-red-200
                     transition-all duration-150"
        >
          <chip.Icon className="w-3 h-3 flex-shrink-0 opacity-70" />
          <span className="max-w-[140px] truncate">{chip.label}</span>
          <span className="ml-0.5 w-4 h-4 rounded-md
                           bg-brand-100 group-hover:bg-red-100
                           flex items-center justify-center flex-shrink-0
                           transition-colors">
            <X className="w-2.5 h-2.5" />
          </span>
        </button>
      ))}

      {/* Limpiar todo (solo si hay más de un filtro) */}
      {chips.length > 1 && (
        <button
          onClick={() => router.push("/catalogo")}
          className="inline-flex items-center gap-1 text-[11.5px] text-slate-400
                     hover:text-red-600 font-medium transition-colors
                     ml-1 px-2.5 py-1 rounded-lg
                     hover:bg-red-50 border border-transparent hover:border-red-200"
        >
          <X className="w-3 h-3" />
          Limpiar todo
        </button>
      )}
    </div>
  );
}
