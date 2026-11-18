"use client";

// =============================================
// COMPONENTE: ADMIN ONLY (T7)
// Muestra su contenido sólo al administrador. Al rol de solo lectura le
// muestra `fallback` (por defecto, nada). Sirve también dentro de páginas
// de servidor, que no pueden usar hooks. La autorización real la hace el
// backend: esto sólo evita ofrecer acciones que responderían 403.
// =============================================

import type { ReactNode } from "react";
import { useCanEdit } from "@/hooks/usePanelRole";

export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{useCanEdit() ? children : fallback}</>;
}
