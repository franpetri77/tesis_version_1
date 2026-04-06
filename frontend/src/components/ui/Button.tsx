"use client";

// =============================================
// COMPONENTE: BUTTON
// Botón base reutilizable con variantes visuales.
// Soporta estado de carga y es accesible por teclado.
// =============================================

import { cn } from "@/lib/utils/cn";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 focus:ring-brand-500 disabled:bg-brand-300",
  secondary:
    "bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400",
  outline:
    "border border-brand-500 text-brand-600 hover:bg-brand-50 active:bg-brand-100 focus:ring-brand-500 disabled:border-slate-300 disabled:text-slate-400",
  ghost:
    "text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 disabled:bg-red-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-lg",
  lg: "px-6 py-3 text-sm rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Estilos base
          "inline-flex items-center justify-center gap-2 font-semibold",
          "transition-all duration-150 active:scale-[0.98]",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
          // Variante y tamaño
          variantClasses[variant],
          sizeClasses[size],
          // Ancho completo opcional
          fullWidth && "w-full",
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {/* Spinner de carga */}
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4 flex-shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
