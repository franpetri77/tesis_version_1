// =============================================
// HOOK: ROL EN EL PANEL (T7)
// El backend es quien autoriza: el rol de solo lectura recibe 403 en
// cualquier escritura. Este hook sólo evita mostrarle acciones que no
// puede ejecutar.
// =============================================

import { useAuthStore } from "@/stores/authStore";

/** true si el usuario puede modificar datos desde el panel (rol admin). */
export function useCanEdit(): boolean {
  return useAuthStore((s) => s.user?.role === "admin");
}
