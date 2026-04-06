"use client";

// =============================================
// COMPONENTE: ACTIVE FILTER CHIPS
// Chips que muestran los filtros activos y permiten quitarlos.
// =============================================

import { X, Filter } from "lucide-react";
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
    const base = { ...searchParams } as Record<string, string>;
    keys.forEach((k) => delete base[k]);
    // Resetear paginación al quitar un filtro
    delete base["pagina"];
    const params = new URLSearchParams(base);
    const qs = params.toString();
    router.push(qs ? `/catalogo?${qs}` : "/catalogo");
  }

  const chips: { label: string; icon?: string; removeKeys: string[] }[] = [];

  if (currentFilters.category) {
    const cat = categories.find((c) => c.slug === currentFilters.category);
    chips.push({
      label: cat?.name ?? currentFilters.category,
      icon: "🏷️",
      removeKeys: ["categoria"],
    });
  }

  if (currentFilters.search) {
    chips.push({
      label: `"${currentFilters.search}"`,
      icon: "🔍",
      removeKeys: ["buscar"],
    });
  }

  if (currentFilters.min_price && currentFilters.max_price) {
    chips.push({
      label: `${formatPrice(currentFilters.min_price)} – ${formatPrice(currentFilters.max_price)}`,
      icon: "💰",
      removeKeys: ["precio_min", "precio_max"],
    });
  } else if (currentFilters.min_price) {
    chips.push({
      label: `Desde ${formatPrice(currentFilters.min_price)}`,
      icon: "💰",
      removeKeys: ["precio_min"],
    });
  } else if (currentFilters.max_price) {
    chips.push({
      label: `Hasta ${formatPrice(currentFilters.max_price)}`,
      icon: "💰",
      removeKeys: ["precio_max"],
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5 animate-fade-in">
      {/* Etiqueta */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <Filter className="w-3 h-3" />
        <span>Filtrando por:</span>
      </div>

      {/* Chips */}
      {chips.map((chip) => (
        <button
          key={chip.removeKeys.join(",")}
          onClick={() => removeFilter(chip.removeKeys)}
          className="group inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all"
        >
          {chip.icon && <span className="text-[10px]">{chip.icon}</span>}
          {chip.label}
          <span className="w-4 h-4 rounded-full bg-brand-100 group-hover:bg-red-100 flex items-center justify-center transition-colors flex-shrink-0">
            <X className="w-2.5 h-2.5" />
          </span>
        </button>
      ))}

      {/* Limpiar todo */}
      {chips.length > 1 && (
        <button
          onClick={() => router.push("/catalogo")}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 font-medium transition-colors ml-1 px-2 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200"
        >
          <X className="w-3 h-3" />
          Limpiar todo
        </button>
      )}
    </div>
  );
}
