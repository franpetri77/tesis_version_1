// =============================================
// SERVICIO: RECOMENDACIONES DE PRODUCTOS
// Lógica de recomendaciones basada en:
//   - Historial de compras del usuario
//   - Categoría del producto actual
//   - Productos trending (más vendidos recientemente)
//
// Este servicio es llamado desde el router /reports
// o puede exponerse como endpoint propio.
// =============================================

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const TOKEN = process.env.DIRECTUS_SERVICE_TOKEN ?? "";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${TOKEN}`,
};

/**
 * Obtiene los IDs de categorías que el usuario ha comprado.
 * Base para calcular recomendaciones personalizadas.
 */
export async function getUserPreferredCategories(userId: string): Promise<string[]> {
  const res = await fetch(
    `${DIRECTUS_URL}/items/order_items?` +
      `fields=product_id.category_id` +
      `&filter[order_id][user_id][_eq]=${userId}` +
      `&filter[order_id][status][_in]=paid,delivered` +
      `&limit=30`,
    { headers }
  );

  if (!res.ok) return [];

  const data = (await res.json()) as {
    data: Array<{ product_id: { category_id: string } | null }>;
  };

  const categories = data.data
    .map((item) => item.product_id?.category_id)
    .filter(Boolean) as string[];

  // Devolver categorías únicas
  return [...new Set(categories)];
}

/**
 * Obtiene productos trending basados en cantidad vendida en los últimos 30 días.
 */
export async function getTrendingProductIds(limit = 10): Promise<string[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `${DIRECTUS_URL}/items/order_items?` +
      `fields=product_id` +
      `&filter[order_id][date_created][_gte]=${thirtyDaysAgo}` +
      `&filter[order_id][status][_in]=paid,delivered` +
      `&limit=200`,
    { headers }
  );

  if (!res.ok) return [];

  const data = (await res.json()) as {
    data: Array<{ product_id: string }>;
  };

  // Contar frecuencia de cada producto
  const countMap = new Map<string, number>();
  for (const item of data.data) {
    countMap.set(item.product_id, (countMap.get(item.product_id) ?? 0) + 1);
  }

  // Ordenar por frecuencia y tomar los top N
  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}
