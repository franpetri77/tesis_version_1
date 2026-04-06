// =============================================
// UTILIDADES DE FORMATEO
// Funciones para mostrar precios, fechas y texto
// de manera consistente en toda la aplicación.
// =============================================

/**
 * Formatea un número como precio en pesos argentinos.
 * Ejemplo: formatPrice(1500) → "$1.500,00"
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea una fecha ISO a formato legible en español.
 * Ejemplo: formatDate("2024-01-15T10:30:00Z") → "15 de enero de 2024"
 */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateStr));
}

/**
 * Formatea fecha y hora.
 * Ejemplo: formatDateTime("2024-01-15T10:30:00Z") → "15/01/2024 10:30"
 */
export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

/**
 * Calcula el porcentaje de descuento entre precio original y precio actual.
 * Ejemplo: calculateDiscount(1000, 800) → 20
 */
export function calculateDiscount(originalPrice: number, currentPrice: number): number {
  if (originalPrice <= 0 || currentPrice >= originalPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

/**
 * Trunca un texto a una cantidad máxima de caracteres.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Genera el número de pedido legible.
 * Ejemplo: formatOrderNumber("TI-2024-00001")
 */
export function formatOrderNumber(orderNumber: string): string {
  return orderNumber.toUpperCase();
}
