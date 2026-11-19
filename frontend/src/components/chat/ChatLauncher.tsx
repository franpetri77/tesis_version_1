"use client";

// =============================================
// COMPONENTE: BOTÓN Y PANEL DE CHAT DE LA TIENDA (T9)
// Botón fijo abajo a la derecha con el globo de no leídos. Abre un panel con
// la conversación (clientes) o una invitación a iniciar sesión (visitantes).
// No se muestra al personal (responde desde el panel), en el panel de admin,
// en las páginas de acceso ni en /perfil/mensajes, que ya es el chat.
// =============================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { chatApi } from "@/lib/api/chat";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useModalStore } from "@/stores/modalStore";
import { CustomerChat } from "./CustomerChat";

const HIDDEN_ON = ["/admin", "/perfil/mensajes", "/login", "/registro", "/restablecer", "/verificar-email"];

export function ChatLauncher() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { open, openChat, closeChat } = useChatStore();
  const openModal = useModalStore((s) => s.openModal);
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setMounted(true); }, []);

  const isCustomer = isAuthenticated && user?.role === "customer";
  const hidden = !mounted || HIDDEN_ON.some((p) => pathname.startsWith(p)) || (isAuthenticated && user?.role !== "customer");

  // Globo de no leídos con el panel cerrado (con el panel abierto manda la conversación)
  const { data: unread = 0 } = useQuery({
    queryKey: ["chat-unread", user?.id],
    queryFn: chatApi.unread,
    enabled: !hidden && isCustomer && !open,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!open) return;
    queryClient.setQueryData(["chat-unread", user?.id], 0);
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") { closeChat(); buttonRef.current?.focus(); } }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeChat, queryClient, user?.id]);

  // Al cerrar sesión o cambiar de página a una oculta, el panel se cierra
  useEffect(() => { if (hidden && open) closeChat(); }, [hidden, open, closeChat]);

  if (hidden) return null;

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Mensajes con Tele Import"
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-paper-300 bg-white shadow-dropdown",
            "inset-x-3 bottom-3 top-20 sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-5 sm:h-[34rem] sm:max-h-[calc(100vh-6rem)] sm:w-[23rem]",
            "motion-safe:animate-fade-in"
          )}
        >
          <div className="flex items-center justify-between border-b border-paper-300 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Mensajes con Tele Import</p>
              <p className="text-[11px] text-slate-500">Te respondemos por acá</p>
            </div>
            <div className="flex items-center gap-1">
              {isCustomer && (
                <Link
                  href="/perfil/mensajes"
                  onClick={closeChat}
                  className="rounded-lg p-2 text-slate-500 hover:bg-paper-100 hover:text-slate-900"
                  aria-label="Abrir en Mis mensajes"
                  title="Abrir en Mis mensajes"
                >
                  <Maximize2 className="h-4 w-4" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => { closeChat(); buttonRef.current?.focus(); }}
                className="rounded-lg p-2 text-slate-500 hover:bg-paper-100 hover:text-slate-900"
                aria-label="Cerrar el chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isCustomer && user ? (
            <CustomerChat userId={user.id} active={open} className="flex-1" autoFocus />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <MessageCircle className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-sm font-semibold text-slate-900">Iniciá sesión para escribirnos</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Así guardamos la conversación en tu cuenta y te avisamos cuando respondamos.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => { closeChat(); openModal("auth", { authTab: "login" }); }}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => { closeChat(); openModal("auth", { authTab: "register" }); }}
                  className="rounded-xl border border-paper-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-paper-100"
                >
                  Crear cuenta
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!open && (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => openChat()}
          aria-label={`Abrir el chat con Tele Import${unread > 0 ? ` — ${unread} sin leer` : ""}`}
          className={cn(
            "fixed right-5 z-40 flex h-12 items-center gap-2 rounded-full bg-brand-600 pl-4 pr-5 text-sm font-semibold text-white shadow-dropdown",
            "hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2",
            "motion-safe:transition-colors",
            // Sobre la barra fija del carrito cuando está visible
            "bottom-5 [body[data-sticky-cart]_&]:bottom-24"
          )}
        >
          <MessageCircle className="h-5 w-5" aria-hidden />
          <span className="hidden sm:inline">Consultas</span>
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-white bg-slate-900 px-1 text-[10px] font-bold">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}
    </>
  );
}
