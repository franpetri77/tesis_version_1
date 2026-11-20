// =============================================
// RUTAS COMPARTIDAS
// Prefijos de las páginas de autenticación. Los elementos flotantes
// de la tienda (barra del carrito, chat) no se muestran en ellas.
// =============================================

export const AUTH_ROUTES = ["/login", "/registro", "/restablecer", "/verificar-email"];

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
