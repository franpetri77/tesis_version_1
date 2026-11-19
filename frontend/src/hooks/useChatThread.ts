"use client";

// =============================================
// HOOK: CONVERSACIÓN CON CONSULTA PERIÓDICA (T9)
// Carga los últimos mensajes y, mientras la vista está activa y la pestaña
// visible, pide cada pocos segundos sólo los posteriores al último que ya
// tiene (?after=). Marca como leído únicamente lo que se está viendo.
// La usan el chat del cliente y la bandeja del panel.
// =============================================

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ConversationView, ReadParams, ThreadPage } from "@/lib/api/chat";

export interface ThreadSource<P extends ThreadPage> {
  /** Identifica la conversación; null desactiva el hook. */
  key: string | null;
  load: (params: ReadParams) => Promise<P>;
  send: (body: string, productId?: string | null) => Promise<ChatMessage>;
  read: (upTo: number) => Promise<void>;
  /** false para el rol de solo lectura: ve, pero no marca como leído. */
  canMarkRead: boolean;
}

export const POLL_MS = 4000;

function merge(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return current;
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export function useChatThread<P extends ThreadPage>(source: ThreadSource<P>, active: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationView | null>(null);
  const [page, setPage] = useState<P | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const src = useRef(source);
  src.current = source;
  const lastId = useRef(0);
  const lastMarked = useRef(0);
  const polling = useRef(false);
  const generation = useRef(0);

  useEffect(() => { lastId.current = messages.length ? messages[messages.length - 1].id : 0; }, [messages]);

  // Carga inicial (y al cambiar de conversación)
  useEffect(() => {
    const gen = ++generation.current;
    setMessages([]); setConversation(null); setPage(null); setHasMore(false); setError(null); setSendError(null);
    lastId.current = 0; lastMarked.current = 0;
    if (!source.key) return;
    setLoading(true);
    src.current.load({})
      .then((p) => {
        if (gen !== generation.current) return;
        setMessages(p.messages); setConversation(p.conversation); setHasMore(p.has_more); setPage(p);
      })
      .catch((e: Error) => { if (gen === generation.current) setError(e.message || "No se pudieron cargar los mensajes"); })
      .finally(() => { if (gen === generation.current) setLoading(false); });
  }, [source.key]);

  const poll = useCallback(async () => {
    if (!src.current.key || polling.current) return;
    polling.current = true;
    const gen = generation.current;
    try {
      const p = await src.current.load({ after: lastId.current });
      if (gen !== generation.current) return;
      setMessages((cur) => merge(cur, p.messages));
      setConversation(p.conversation);
      setError(null);
    } catch {
      // Un corte momentáneo no interrumpe la conversación: se reintenta en la próxima vuelta
    } finally {
      polling.current = false;
    }
  }, []);

  // Consulta periódica sólo con la vista activa y la pestaña visible
  useEffect(() => {
    if (!active || !source.key) return;
    const tick = () => { if (document.visibilityState === "visible") void poll(); };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    tick();
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [active, source.key, poll]);

  // Marcar como leído lo que se está viendo
  useEffect(() => {
    if (!active || !source.canMarkRead || !conversation || conversation.unread === 0) return;
    if (document.visibilityState !== "visible") return;
    const upTo = lastId.current;
    if (upTo === 0 || upTo <= lastMarked.current) return;
    lastMarked.current = upTo;
    src.current.read(upTo)
      .then(() => setConversation((c) => (c ? { ...c, unread: 0 } : c)))
      .catch(() => { lastMarked.current = 0; });
  }, [active, source.canMarkRead, conversation, messages]);

  const loadOlder = useCallback(async () => {
    const first = messages[0]?.id;
    if (!first) return;
    try {
      const p = await src.current.load({ before: first });
      setMessages((cur) => merge(cur, p.messages));
      setHasMore(p.has_more);
    } catch (e) {
      setError((e as Error).message || "No se pudieron cargar los mensajes anteriores");
    }
  }, [messages]);

  const send = useCallback(async (body: string, productId?: string | null): Promise<boolean> => {
    setSending(true); setSendError(null);
    try {
      const m = await src.current.send(body, productId);
      setMessages((cur) => merge(cur, [m]));
      // La primera vez se crea la conversación: se trae su estado
      if (!conversation) void poll();
      return true;
    } catch (e) {
      setSendError((e as Error).message || "No se pudo enviar el mensaje");
      return false;
    } finally {
      setSending(false);
    }
  }, [conversation, poll]);

  return { messages, conversation, page, hasMore, loading, error, sending, sendError, setSendError, loadOlder, send, refresh: poll };
}
