// =============================================
// COMPARTIR EN REDES
// URL pública del sitio y enlaces para compartir un producto.
// Funciones puras: se usan en el servidor (metadata) y en el cliente (botones).
// =============================================

const LOCAL_URL = "http://localhost:3000";

/**
 * URL pública del sitio, sin barra final.
 * Orden: NEXT_PUBLIC_APP_URL → dominio de producción de Vercel → localhost.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.NEXT_PUBLIC_APP_URL?.trim();
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const raw = explicit || (vercel ? `https://${vercel}` : LOCAL_URL);
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return LOCAL_URL;
    return url.origin;
  } catch {
    return LOCAL_URL;
  }
}

/** Dirección absoluta de la ficha de un producto. */
export function productUrl(slug: string, base: string = siteUrl()): string {
  return `${base}/producto/${encodeURIComponent(slug)}`;
}

export type ShareNetwork = "whatsapp" | "facebook" | "x";

/** Enlaces de cada red. El texto y la URL siempre van codificados. */
export function shareLinks(url: string, text: string): Record<ShareNetwork, string> {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://x.com/intent/post?text=${t}&url=${u}`,
  };
}

/** Texto que acompaña el enlace: nombre y precio. */
export function productShareText(name: string, priceLabel: string): string {
  return `${name} a ${priceLabel} en Tele Import`;
}
