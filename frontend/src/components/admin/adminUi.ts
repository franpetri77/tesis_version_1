// =============================================
// ESTILOS COMPARTIDOS DEL PANEL DE ADMINISTRACIÓN
// Una sola escala de botones para todo el panel:
//   - md (36 px): acciones de encabezado y formularios.
//   - sm (32 px): acciones dentro de filas de tabla y filtros.
// Se usan con <button> y con <Link>, por eso son clases y no un componente.
// Un acento (brand-600); el resto en slate. Sin escalado al hacer clic, para
// que nada se mueva, y sin transición con prefers-reduced-motion.
// =============================================

import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold " +
  "transition-colors motion-reduce:transition-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-3.5 text-sm",
};

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
  danger: "border border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
};

/** Clases de botón del panel. */
export function adminButton(variant: Variant = "secondary", size: Size = "md", className?: string): string {
  return cn(BASE, SIZE[size], VARIANT[variant], className);
}

/** Botón cuadrado con solo un ícono (llevar siempre aria-label y title). */
export function adminIconButton(variant: Variant = "ghost", className?: string): string {
  return cn(BASE, "h-8 w-8 p-0", VARIANT[variant], className);
}

/** Pestaña de filtro (estado, categoría…): mismo alto en todas las páginas. */
export function adminFilterTab(active: boolean, className?: string): string {
  return cn(
    BASE,
    "h-8 flex-shrink-0 px-3 text-xs",
    active
      ? "bg-brand-600 text-white"
      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
    className
  );
}
