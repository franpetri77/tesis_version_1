// =============================================
// RUTAS COMPARTIDAS
// Prefijos de las páginas de autenticación. Los elementos flotantes
// de la tienda (barra del carrito, chat) no se muestran en ellas.
// =============================================

export const AUTH_ROUTES = ["/login", "/registro", "/restablecer", "/verificar-email"];

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Valida el destino tal como lo interpretará el navegador, antes de navegar. */
export function safeInternalRedirect(target: string | null, origin: string): string {
  if (!target || !target.startsWith("/") || target.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(target)) return "/";
  try {
    const url = new URL(target, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}
