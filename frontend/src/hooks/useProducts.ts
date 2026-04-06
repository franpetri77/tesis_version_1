"use client";

// =============================================
// HOOK: useProducts
// Consulta productos desde el backend Express+SQLite en el cliente.
// Usado para búsquedas reactivas y filtros sin recargar página.
// =============================================

import { useQuery } from "@tanstack/react-query";
import { getPublicProducts, getProductBySlug } from "@/lib/api/catalog";
import type { CatalogFilters } from "@/types";

/**
 * Hook para obtener productos con filtros desde el cliente.
 * Cachea los resultados por 1 minuto usando React Query.
 */
export function useProducts(filters: CatalogFilters = {}) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => getPublicProducts(filters),
    staleTime: 60_000, // 1 minuto
  });
}

/**
 * Hook para obtener un solo producto por slug (client-side).
 */
export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug(slug),
    staleTime: 60_000,
    enabled: Boolean(slug),
  });
}
