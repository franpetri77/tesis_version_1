"use client";

// =============================================
// COMPONENTE: INPUT
// Campo de texto base con soporte para error, label y ayuda.
// =============================================

import { cn } from "@/lib/utils/cn";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900",
            "placeholder:text-slate-400 bg-white",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
            "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
            error
              ? "border-red-400 focus:ring-red-400"
              : "border-slate-200 hover:border-slate-300",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1" role="alert">
            {error}
          </p>
        )}
        {helpText && !error && (
          <p className="text-xs text-slate-500">{helpText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
