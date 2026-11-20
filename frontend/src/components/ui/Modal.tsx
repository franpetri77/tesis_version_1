"use client";

// =============================================
// COMPONENTE: BASE MODAL
// Overlay + panel central accesible:
// - role="dialog", aria-modal y título con aria-labelledby
// - foco al primer control al abrir y atrapado dentro con Tab
// - cierra con Escape, botón X o click en el backdrop
// - devuelve el foco al elemento que lo abrió
// - sin animación si el usuario pidió reducir el movimiento
// =============================================

import { useEffect, useRef } from "react";
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
  /** id del encabezado que nombra al diálogo (aria-labelledby) */
  labelledBy?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = "max-w-sm",
  disableBackdropClose = false,
  hideCloseButton = false,
  labelledBy,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // onClose cambia en cada render del padre; lo leemos desde un ref para no
  // re-ejecutar el efecto de apertura (que movería el foco) en cada tecla.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Quién tenía el foco antes de abrir. Se lee en el render de apertura porque
  // el autoFocus de los hijos se aplica en el commit, antes de los efectos.
  const openerRef = useRef<HTMLElement | null>(null);
  if (!isOpen) {
    openerRef.current = null;
  } else if (openerRef.current === null && typeof document !== "undefined") {
    openerRef.current = document.activeElement as HTMLElement | null;
  }

  // Apertura: enfocar dentro, atrapar Tab y Escape; al cerrar, devolver el foco.
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const opener = openerRef.current;

    // Si un hijo ya se enfocó solo (autoFocus), se respeta; si no, el primer
    // control que no sea el botón de cerrar, y como último recurso el panel.
    if (!panel.contains(document.activeElement)) {
      const items = focusables(panel);
      const first = items.find((el) => !el.dataset.modalClose) ?? items[0];
      (first ?? panel).focus();
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = focusables(panel);
      if (items.length === 0) { e.preventDefault(); panel.focus(); return; }
      const first = items[0];
      const last  = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
      // Devolver el foco al disparador si sigue en la página (puede haberse
      // desmontado al navegar, p. ej. al seguir al checkout).
      if (opener && opener.isConnected && opener !== document.body) {
        opener.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      {/* Backdrop sólido — sin backdrop-blur: desenfocar toda la pantalla se
          recalcula cada vez que algo se mueve detrás (carruseles, barras
          de progreso) y en celulares hace que escribir en el modal se trabe. */}
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={disableBackdropClose ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-h-[calc(100dvh-2rem)] overflow-y-auto",
          maxWidth,
          "bg-white rounded-2xl shadow-2xl shadow-slate-900/20",
          "border border-slate-200/80 focus:outline-none",
          "animate-modal-in motion-reduce:animate-none"
        )}
      >
        {/* Botón cerrar */}
        {!hideCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            data-modal-close="true"
            className="absolute top-3.5 right-3.5 w-8 h-8 flex items-center justify-center
                       rounded-xl text-slate-400 hover:text-slate-700
                       hover:bg-slate-100 transicion-ui z-10
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {children}
      </div>
    </div>
  );
}
