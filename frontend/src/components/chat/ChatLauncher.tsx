"use client";

// =============================================
// COMPONENTE: BOTÓN Y PANEL DE CHAT DE LA TIENDA (T9 / T10)
// Botón fijo abajo a la derecha, para visitantes y clientes, con el globo de
// mensajes sin leer. El panel abre el asistente de preguntas frecuentes
// (respuesta automática, para todos). "Hablar con una persona" pasa a la
// conversación con el equipo (clientes) o a la invitación a iniciar sesión
// (visitantes). Va directo a la conversación si hay respuestas sin leer o si
// se abrió desde "Consultar por este producto".
// Una vez por pestaña aparece un aviso breve junto al botón.
// No se muestra al personal (responde desde el panel), en el panel de admin,
// en las páginas de acceso ni en /perfil/mensajes, que ya es el chat.
// =============================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Maximize2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { chatApi } from "@/lib/api/chat";
import { BOT_NAME } from "@/lib/chat/faq";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useModalStore } from "@/stores/modalStore";
import { CustomerChat } from "./CustomerChat";
import { FaqBot } from "./FaqBot";

const HIDDEN_ON = ["/admin", "/perfil/mensajes", "/login", "/registro", "/restablecer", "/verificar-email"];
const TEASER_KEY = "tele-import-chat-teaser";
const TEASER_DELAY_MS = 4000;

export function ChatLauncher() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { open, mode, openChat, setMode, closeChat } = useChatStore();
  const openModal = useModalStore((s) => s.openModal);
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [unreadAtOpen, setUnreadAtOpen] = useState(0);
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

  // Aviso junto al botón: una vez por pestaña, unos segundos después de entrar
  useEffect(() => {
    if (hidden || open) { setTeaser(false); return; }
    let seen = false;
    try { seen = sessionStorage.getItem(TEASER_KEY) === "1"; } catch { seen = true; }
    if (seen) return;
    const t = window.setTimeout(() => setTeaser(true), TEASER_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [hidden, open]);
  const dismissTeaser = () => {
    setTeaser(false);
    try { sessionStorage.setItem(TEASER_KEY, "1"); } catch { /* sin persistencia */ }
  };

  function launch() {
    dismissTeaser();
    // Con respuestas del equipo sin leer, directo a la conversación (y ya quedan vistas)
    const direct = isCustomer && unread > 0;
    setUnreadAtOpen(direct ? 0 : unread);
    openChat(undefined, direct ? "human" : "bot");
  }

  if (hidden) return null;

  const human = mode === "human";
  const close = () => { closeChat(); buttonRef.current?.focus(); };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label={human ? "Mensajes con Tele Import" : BOT_NAME}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-paper-300 bg-white shadow-dropdown",
            "inset-x-3 bottom-3 top-20 sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-5 sm:h-[34rem] sm:max-h-[calc(100vh-6rem)] sm:w-[23rem]",
            "motion-safe:animate-fade-in"
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-paper-300 px-3 py-3">
            <div className="flex min-w-0 items-center gap-1">
              {human && (
                <button
                  type="button"
                  onClick={() => setMode("bot")}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-paper-100 hover:text-slate-900"
                  aria-label="Volver a las consultas frecuentes"
                  title="Consultas frecuentes"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div className={cn("min-w-0", !human && "pl-1")}>
                <p className="truncate text-sm font-semibold text-slate-900">{human ? "Mensajes con Tele Import" : BOT_NAME}</p>
                <p className="truncate text-[11px] text-slate-500">{human ? "Te responde una persona del equipo" : "Respuestas al instante"}</p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              {isCustomer && human && (
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
                onClick={close}
                className="rounded-lg p-2 text-slate-500 hover:bg-paper-100 hover:text-slate-900"
                aria-label="Cerrar el chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!human ? (
            <FaqBot
              className="flex-1"
              onHuman={() => { setUnreadAtOpen(0); setMode("human"); }}
              unread={isCustomer ? unreadAtOpen : 0}
              humanHint={isCustomer ? undefined : "Para hablar con una persona te pedimos iniciar sesión: así guardamos la conversación y te avisamos la respuesta."}
              onNavigate={closeChat}
            />
          ) : isCustomer && user ? (
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
        <div className="fixed right-5 z-40 flex flex-col items-end gap-2 bottom-5 [body[data-sticky-cart]_&]:bottom-24">
          {teaser && (
            <div role="status" className="flex max-w-[16rem] items-start gap-2 rounded-2xl rounded-br-md border border-paper-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-dropdown motion-safe:animate-fade-in">
              <button type="button" onClick={launch} className="text-left">
                <span className="block font-semibold text-slate-900">¿Tenés una consulta?</span>
                <span className="block text-xs text-slate-500">Envíos, pagos, garantía… te respondo al instante.</span>
              </button>
              <button type="button" onClick={dismissTeaser} className="-mr-1 rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Cerrar el aviso">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <button
            ref={buttonRef}
            type="button"
            onClick={launch}
            aria-label={`Abrir el chat con Tele Import${unread > 0 ? ` — ${unread} sin leer` : ""}`}
            className={cn(
              "relative flex h-12 items-center gap-2 rounded-full bg-brand-600 pl-4 pr-5 text-sm font-semibold text-white shadow-dropdown",
              "hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2",
              "motion-safe:transition-colors"
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
        </div>
      )}
    </>
  );
}
