"use client";

// =============================================
// COMPONENTE: CONVERSACIÓN (T9)
// Lista de mensajes y caja de texto. La comparten el chat de la tienda y la
// bandeja del panel; `viewer` indica de qué lado se mira. El texto se
// muestra tal cual lo escribieron (React lo escapa) y no se convierten
// enlaces automáticamente. En el panel la bandeja es compartida: las
// respuestas se firman con el nombre de quien respondió, no con "Vos".
// =============================================

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Send, Package, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { MAX_MESSAGE_LENGTH, type ChatMessage, type ChatProduct, type ConversationView, type SenderRole } from "@/lib/api/chat";

const timeFmt = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" });

function dayLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return dayFmt.format(d);
}

function ProductCard({ product, own, external }: { product: ChatProduct; own: boolean; external: boolean }) {
  const content = (
    <span className={cn("flex items-center gap-2.5 rounded-lg border p-2 text-left", own ? "border-white/25 bg-white/10" : "border-paper-300 bg-white")}>
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-paper-100">
        {product.image_url
          ? <Image src={product.image_url} alt="" width={40} height={40} className="object-contain" />
          : <Package className="h-4 w-4 text-slate-400" aria-hidden />}
      </span>
      <span className="min-w-0">
        <span className={cn("block truncate text-xs font-semibold", own ? "text-white" : "text-slate-900")}>{product.name}</span>
        <span className={cn("block text-xs", own ? "text-brand-100" : "text-slate-500")}>
          {product.is_active ? formatPrice(product.price) : "Ya no está publicado"}
        </span>
      </span>
    </span>
  );
  if (!product.is_active) return <div className="mb-1.5">{content}</div>;
  return (
    <Link href={`/producto/${product.slug}`} target={external ? "_blank" : undefined} className="mb-1.5 block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40">
      {content}
    </Link>
  );
}

export interface ChatThreadProps {
  viewer: SenderRole;
  messages: ChatMessage[];
  conversation: ConversationView | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadOlder: () => Promise<void>;
  onSend: (body: string) => Promise<boolean>;
  sending: boolean;
  sendError: string | null;
  /** false: se muestra la conversación sin caja de texto. */
  canWrite: boolean;
  readOnlyNote?: ReactNode;
  /** Presente sólo si la carga inicial falló: muestra el aviso con "Reintentar". */
  onRetry?: () => void;
  /** Producto que se adjuntará al próximo mensaje (sólo el cliente). */
  attachment?: { product: Pick<ChatProduct, "name" | "price">; onRemove: () => void } | null;
  empty?: ReactNode;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function ChatThread(props: ChatThreadProps) {
  const { viewer, messages, conversation, loading, error, hasMore, onLoadOlder, onSend, sending, sendError, canWrite } = props;
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const stick = useRef(true);
  const prevHeight = useRef<number | null>(null);
  const lastId = messages.length ? messages[messages.length - 1].id : 0;

  // Mantener la vista abajo si ya estaba abajo (o si el mensaje es propio)
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (prevHeight.current !== null) {
      // Se cargaron mensajes anteriores: conservar la posición de lectura
      el.scrollTop = el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
      return;
    }
    const last = messages[messages.length - 1];
    if (stick.current || last?.sender_role === viewer) el.scrollTop = el.scrollHeight;
  }, [lastId, messages, viewer]);

  useEffect(() => { if (props.autoFocus && canWrite) inputRef.current?.focus(); }, [props.autoFocus, canWrite]);

  // Alto automático de la caja de texto (hasta ~6 líneas)
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [draft]);

  function onScroll() {
    const el = listRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }

  async function older() {
    const el = listRef.current;
    setLoadingOlder(true);
    prevHeight.current = el ? el.scrollHeight : null;
    await onLoadOlder();
    setLoadingOlder(false);
  }

  async function submit() {
    const body = draft.trim();
    if (!body || sending) return;
    stick.current = true;
    if (await onSend(body)) setDraft("");
    inputRef.current?.focus();
  }

  const lastOwn = [...messages].reverse().find((m) => m.sender_role === viewer);
  const remaining = MAX_MESSAGE_LENGTH - draft.length;

  return (
    <div className={cn("flex min-h-0 flex-col", props.className)}>
      <div
        ref={listRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Mensajes"
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4"
      >
        {hasMore && (
          <div className="mb-3 text-center">
            <button
              type="button"
              onClick={older}
              disabled={loadingOlder}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:text-slate-400"
            >
              {loadingOlder ? "Cargando…" : "Ver mensajes anteriores"}
            </button>
          </div>
        )}

        {loading && messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden /> Cargando mensajes…
          </div>
        )}
        {props.onRetry ? (
          // La carga inicial falló: se avisa aunque ya se vea algún mensaje propio
          <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span>No se pudo cargar la conversación. Volvemos a intentar solos en unos segundos.</span>
            <button
              type="button"
              onClick={props.onRetry}
              disabled={loading}
              className="flex-shrink-0 rounded-md border border-red-200 bg-white px-2.5 py-1 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {loading ? "Cargando…" : "Reintentar"}
            </button>
          </div>
        ) : !loading && error && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-red-600">{error}</p>
        )}
        {!loading && !error && !props.onRetry && messages.length === 0 && props.empty}

        <ol className="space-y-1">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const date = new Date(m.created_at);
            const newDay = !prev || new Date(prev.created_at).toDateString() !== date.toDateString();
            const own = m.sender_role === viewer;
            const newRun = newDay || !prev || prev.sender_role !== m.sender_role || prev.sender_name !== m.sender_name;
            const who = m.sender_role === "staff"
              ? `Tele Import${m.sender_name ? ` · ${m.sender_name}` : ""}`
              : (m.sender_name ?? "Cliente");
            return (
              <li key={m.id}>
                {newDay && (
                  <div className="my-3 flex items-center gap-3 text-[11px] font-medium text-slate-400">
                    <span className="h-px flex-1 bg-paper-300" />{dayLabel(date)}<span className="h-px flex-1 bg-paper-300" />
                  </div>
                )}
                <div className={cn("flex flex-col", own ? "items-end" : "items-start", newRun && !newDay && "mt-3")}>
                  {newRun && <span className="mb-1 px-1 text-[11px] font-medium text-slate-500">{own && viewer === "customer" ? "Vos" : who}</span>}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                      own ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-paper-100 text-slate-800"
                    )}
                  >
                    {m.product && <ProductCard product={m.product} own={own} external={viewer === "staff"} />}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                  <span className="mt-0.5 px-1 text-[10px] text-slate-400">
                    <time dateTime={m.created_at}>{timeFmt.format(date)}</time>
                    {own && lastOwn?.id === m.id && conversation && (
                      <> · {m.id <= conversation.other_last_read_id ? "Leído" : "Enviado"}</>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {canWrite ? (
        <form
          className="border-t border-paper-300 bg-white px-3 py-3"
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
        >
          {props.attachment && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-paper-300 bg-paper-50 px-2.5 py-1.5 text-xs text-slate-600">
              <Package className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                Consulta sobre <span className="font-semibold text-slate-800">{props.attachment.product.name}</span> · {formatPrice(props.attachment.product.price)}
              </span>
              <button type="button" onClick={props.attachment.onRemove} className="rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Quitar el producto del mensaje">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {sendError && <p role="alert" className="mb-2 text-xs text-red-600">{sendError}</p>}
          <div className="flex items-end gap-2">
            <label htmlFor={`chat-input-${viewer}`} className="sr-only">Escribí tu mensaje</label>
            <textarea
              id={`chat-input-${viewer}`}
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); }
              }}
              placeholder={props.placeholder ?? "Escribí tu mensaje"}
              className="min-h-[40px] flex-1 resize-none rounded-xl border border-paper-300 bg-paper-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Enviar"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white motion-safe:transition-colors hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {sending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          <p className="mt-1.5 flex justify-between text-[10px] text-slate-400">
            <span>Enter envía · Shift + Enter, nueva línea</span>
            {remaining < 200 && <span className={remaining < 50 ? "text-amber-600" : undefined}>{remaining} caracteres</span>}
          </p>
        </form>
      ) : (
        props.readOnlyNote && <div className="border-t border-paper-300 bg-paper-50 px-4 py-3 text-xs text-slate-500">{props.readOnlyNote}</div>
      )}
    </div>
  );
}
