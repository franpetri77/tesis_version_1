// =============================================
// UTILIDAD: CLASE CSS CONDICIONAL
// Combina clsx (clases condicionales) con tailwind-merge
// para evitar conflictos entre clases de Tailwind.
// Uso: cn("base-class", condition && "conditional-class", "otra-clase")
// =============================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
