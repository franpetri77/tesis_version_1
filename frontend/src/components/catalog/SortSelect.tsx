"use client";

// =============================================
// COMPONENTE: SORT SELECT
// "Ordenar por" en la barra de herramientas del listado, como en la
// mayoría de las tiendas. Select nativo: accesible y cómodo en celulares.
// =============================================

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { CatalogFilters as Filters } from "@/types";

const SORT_OPTIONS: { value: NonNullable<Filters["sort"]>; label: string }[] = [
  { value: "newest",     label: "Más recientes" },
  { value: "price_asc",  label: "Menor precio" },
  { value: "price_desc", label: "Mayor precio" },
  { value: "name_asc",   label: "Nombre A–Z" },
];

export function SortSelect({
  current,
  searchParams,
}: {
  current: Filters["sort"];
  searchParams: Record<string, string | undefined>;
}) {
  const router = useRouter();

  function onChange(value: string) {
    const params = { ...searchParams, orden: value === "newest" ? undefined : value, pagina: undefined };
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>;
    const qs = new URLSearchParams(clean).toString();
    router.push(qs ? `/catalogo?${qs}` : "/catalogo");
  }

  return (
    <label className="flex shrink-0 items-center gap-2 text-sm text-slate-500">
      <span className="hidden sm:inline">Ordenar por</span>
      <span className="sr-only sm:hidden">Ordenar por</span>
      <span className="relative">
        <select
          value={current ?? "newest"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 appearance-none rounded-lg border border-paper-300 bg-paper-50 pl-3 pr-9 text-sm font-medium text-slate-900 hover:border-paper-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      </span>
    </label>
  );
}
