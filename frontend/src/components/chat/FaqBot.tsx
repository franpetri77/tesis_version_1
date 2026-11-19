"use client";

// =============================================
// COMPONENTE: ASISTENTE DE PREGUNTAS FRECUENTES (T10)
// Menú de consultas con respuesta automática, como los de WhatsApp. Las
// respuestas salen de lib/chat/faq.ts, en el navegador: no se guardan ni
// pasan por el servidor. "Hablar con una persona" lleva a la mensajería.
// El recorrido se conserva mientras dure la pestaña (sessionStorage).
// =============================================

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, UserRound, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BOT_GREETING, BOT_NAME, FAQ, faqById } from "@/lib/chat/faq";

type Entry = { kind: "bot"; id: string } | { kind: "user"; id: string };
const STORAGE_KEY = "tele-import-faq";

function loadHistory(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as Entry[];
    // Sólo ids que siguen existiendo (los textos pueden cambiar entre versiones)
    return Array.isArray(raw) ? raw.filter((e) => (e.kind === "bot" || e.kind === "user") && faqById(e.id)) : [];
  } catch {
    return [];
  }
}

export interface FaqBotProps {
  /** Pasa a la conversación con una persona (o a la invitación a ingresar). */
  onHuman: () => void;
  /** Texto aclaratorio bajo "Hablar con una persona" (p. ej. que pide iniciar sesión). */
  humanHint?: string;
  /** Mensajes del equipo sin leer: se destaca el acceso a la conversación. */
  unread?: number;
  /** Al tocar un enlace interno (para cerrar el panel). */
  onNavigate?: () => void;
  className?: string;
}

export function FaqBot({ onHuman, humanHint, unread = 0, onNavigate, className }: FaqBotProps) {
  // Se lee al crear el estado (el panel sólo se dibuja en el navegador): con un
  // efecto, el primer guardado pisaría lo guardado con una lista vacía.
  const [history, setHistory] = useState<Entry[]>(loadHistory);
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch { /* modo privado: sin persistencia */ }
  }, [history]);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history]);

  const ask = (id: string) => { setExpanded(false); setHistory((h) => [...h, { kind: "user", id }, { kind: "bot", id }]); };
  const asked = new Set(history.filter((e) => e.kind === "user").map((e) => e.id));
  // Primero las que todavía no preguntó
  const options = [...FAQ].sort((a, b) => Number(asked.has(a.id)) - Number(asked.has(b.id)));
  // Después de una respuesta, pocas opciones para que la conversación tenga lugar
  const COMPACT = 3;
  const visible = history.length === 0 || expanded ? options : options.slice(0, COMPACT);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div ref={listRef} role="log" aria-live="polite" aria-relevant="additions" aria-label="Respuestas del asistente" className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <ol className="space-y-3">
          <li className="flex flex-col items-start">
            <span className="mb-1 px-1 text-[11px] font-medium text-slate-500">{BOT_NAME}</span>
            <div className="max-w-[88%] space-y-1.5 rounded-2xl rounded-bl-md bg-paper-100 px-3.5 py-2 text-sm leading-relaxed text-slate-800">
              {BOT_GREETING.map((line) => <p key={line}>{line}</p>)}
            </div>
          </li>
          {history.map((e, i) => {
            const item = faqById(e.id)!;
            return e.kind === "user" ? (
              <li key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-sm text-white">{item.question}</p>
              </li>
            ) : (
              <li key={i} className="flex flex-col items-start">
                <div className="max-w-[88%] space-y-1.5 rounded-2xl rounded-bl-md bg-paper-100 px-3.5 py-2 text-sm leading-relaxed text-slate-800">
                  {item.answer.map((p) => <p key={p}>{p}</p>)}
                  {item.links?.map((l) => (
                    <Link key={l.href} href={l.href} onClick={onNavigate} className="inline-block pt-0.5 font-semibold text-brand-600 hover:text-brand-700">
                      {l.label} →
                    </Link>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="border-t border-paper-300 bg-white px-3 py-3">
        <p className="mb-2 px-1 text-[11px] font-medium text-slate-500">
          {history.length ? "¿Algo más?" : "Consultas frecuentes"}
        </p>
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto" role="group" aria-label="Consultas frecuentes">
          {visible.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => ask(f.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-left text-xs font-medium motion-safe:transition-colors",
                asked.has(f.id)
                  ? "border-paper-300 text-slate-500 hover:bg-paper-100"
                  : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
              )}
            >
              {f.question}
            </button>
          ))}
          {visible.length < options.length && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-full px-2 py-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Más consultas ({options.length - visible.length})
            </button>
          )}
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={onHuman}
            className="relative inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
          >
            {unread > 0 ? <MessageCircle className="h-4 w-4" aria-hidden /> : <UserRound className="h-4 w-4" aria-hidden />}
            {unread > 0 ? `Ver respuesta del equipo (${unread > 9 ? "9+" : unread})` : "Hablar con una persona"}
          </button>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setHistory([])}
              className="rounded-xl border border-paper-300 p-2 text-slate-500 hover:bg-paper-100 hover:text-slate-800"
              aria-label="Empezar de nuevo"
              title="Empezar de nuevo"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
        {humanHint && <p className="mt-1.5 px-1 text-[10px] text-slate-400">{humanHint}</p>}
      </div>
    </div>
  );
}
