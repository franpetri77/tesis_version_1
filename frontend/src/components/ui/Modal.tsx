"use client";

// =============================================
// COMPONENTE: BASE MODAL
// Overlay animado + panel central con glassmorphism.
// Cierra con Escape o click en el backdrop.
// =============================================

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Ancho máximo del panel (default: max-w-sm) */
  maxWidth?: string;
  /** No cerrar al clickear en el backdrop */
  disableBackdropClose?: boolean;
  /** No mostrar botón X */
  hideCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = "max-w-sm",
  disableBackdropClose = false,
  hideCloseButton = false,
}: ModalProps) {
  // Cerrar con Escape
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Bloquear scroll del body mientras esté abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-4",
        "animate-fade-in"
      )}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[3px]"
        onClick={disableBackdropClose ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full",
          maxWidth,
          "bg-white rounded-2xl shadow-2xl shadow-slate-900/20",
          "border border-slate-200/80",
          "animate-modal-in"
        )}
      >
        {/* Botón cerrar */}
        {!hideCloseButton && (
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3.5 right-3.5 w-8 h-8 flex items-center justify-center
                       rounded-xl text-slate-400 hover:text-slate-700
                       hover:bg-slate-100 transition-all z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {children}
      </div>
    </div>
  );
}
