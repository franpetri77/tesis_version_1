"use client";

// =============================================
// COMPONENTE: BASE MODAL
// Overlay y panel con entrada breve; respeta movimiento reducido.
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
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-4",
        "motion-safe:animate-fade-in"
      )}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop — sin backdrop-blur: desenfocar toda la pantalla se
          recalcula cada vez que algo se mueve detrás (carruseles, barras
          de progreso) y en celulares hace que escribir en el modal se trabe. */}
      <div
        className="absolute inset-0 bg-slate-900/60"
        onClick={disableBackdropClose ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full",
          maxWidth,
          "max-h-[calc(100svh-2rem)] overflow-y-auto bg-paper-50 rounded-2xl shadow-dropdown",
          "border border-paper-300",
          "motion-safe:animate-modal-in"
        )}
      >
        {/* Botón cerrar */}
        {!hideCloseButton && (
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3.5 right-3.5 w-8 h-8 flex items-center justify-center
                       rounded-xl text-slate-400 hover:text-slate-700
                       hover:bg-paper-100 transicion-ui z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {children}
      </div>
    </div>
  );
}
