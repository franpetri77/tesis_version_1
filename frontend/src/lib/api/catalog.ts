// =============================================
// QUERIES DEL CATÁLOGO
// Funciones para obtener productos y categorías
// desde el backend Express + SQLite.
// Reemplaza las funciones de directus/collections.ts
// =============================================

import { apiGet } from "./client";
import type { Product, Category, CatalogFilters } from "@/types";

// -----------------------------------------------
// MÓDULO: CATEGORÍAS
// -----------------------------------------------

/**
 * Obtiene todas las categorías activas para el menú y filtros.
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const res = await apiGet<Category[]>("/catalog/categories");
    return res.data;
  } catch {
    return [];
  }
}

// -----------------------------------------------
// MÓDULO: CATÁLOGO / PRODUCTOS
// -----------------------------------------------

/**
 * Obtiene el listado de productos activos con filtros y paginación.
 * Usado en SSR de la página de catálogo.
 */
export async function getPublicProducts(filters: CatalogFilters = {}): Promise<{
  products: Product[];
  total: number;
  totalPages: number;
}> {
  const { category, search, min_price, max_price, sort, page = 1, limit = 24, featured } = filters;

  // Construir query string con los filtros presentes
  const params = new URLSearchParams();
  if (category)   params.set("category", category);
  if (search)     params.set("search", search);
  if (min_price !== undefined) params.set("min_price", String(min_price));
  if (max_price !== undefined) params.set("max_price", String(max_price));
  if (sort)       params.set("sort", sort);
  if (featured)   params.set("featured", "1");
  params.set("page", String(page));
  params.set("limit", String(limit));

  try {
    const res = await apiGet<Product[]>(`/catalog/products?${params.toString()}`);
    return {
      products: res.data,
      total: res.meta?.total_count ?? 0,
      totalPages: res.meta?.total_pages ?? 1,
    };
  } catch {
    return { products: [], total: 0, totalPages: 1 };
  }
}

/**
 * Obtiene el detalle completo de un producto por su slug.
 * Usado en la página de detalle de producto.
 */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  try {
    const res = await apiGet<Product>(`/catalog/products/${slug}`);
    return res.data;
  } catch {
    return undefined;
  }
}

/**
 * Obtiene todos los slugs de productos activos.
 * Usado para generateStaticParams en Next.js.
 */
export async function getAllProductSlugs(): Promise<string[]> {
  try {
    const res = await apiGet<Product[]>("/catalog/products?limit=1000");
    return res.data.map((p) => p.slug);
  } catch {
    return [];
  }
}

/**
 * Obtiene los productos destacados para la home.
 */
export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  try {
    const res = await apiGet<Product[]>(`/catalog/products/featured?limit=${limit}`);
    return res.data;
  } catch {
    return [];
  }
}

// -----------------------------------------------
// MÓDULO: IMÁGENES DE PRODUCTOS
// -----------------------------------------------

/**
 * Devuelve la URL de la imagen de un producto.
 * En el backend Express+SQLite las imágenes ya vienen
 * como URLs directas en el campo `image_url`.
 * Esta función acepta la URL tal cual y la retorna,
 * siendo compatible con la firma previa de Directus.
 */
export function getProductImageUrl(
  imageUrl: string,
  _options: { width?: number; height?: number; quality?: number } = {}
): string {
  return imageUrl;
}
