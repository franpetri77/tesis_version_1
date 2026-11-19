"use client";

// =============================================
// HOOK: CONVERSACIÓN CON CONSULTA PERIÓDICA (T9)
// Carga los últimos mensajes y, cuando esa carga termina, mientras la vista
// está activa y la pestaña visible, pide cada pocos segundos lo posterior al
// cursor de entrega (?after=). La lógica del cursor está en
// lib/chat/threadSync.ts: los mensajes propios que devuelve el POST se
// muestran sin mover el cursor, y sólo se marca como leído hasta el cursor.
// La usan el chat del cliente y la bandeja del panel.
// =============================================

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ReadParams, ThreadPage } from "@/lib/api/chat";
import { applyInitial, applyOlder, applyOwn, applyPoll, emptySync, readableUpTo, type SyncState } from "@/lib/chat/threadSync";

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
/** Vueltas seguidas como máximo para vaciar un ?after= con has_more. */
const MAX_DRAIN = 20;

export function useChatThread<P extends ThreadPage>(source: ThreadSource<P>, active: boolean) {
  const [sync, setSyncState] = useState<SyncState>(emptySync);
  const [page, setPage] = useState<P | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const src = useRef(source);
  src.current = source;
  // Copia sincrónica del estado: las consultas leen el cursor vigente sin esperar un render
  const state = useRef<SyncState>(sync);
  const setSync = useCallback((next: (s: SyncState) => SyncState) => {
    state.current = next(state.current);
    setSyncState(state.current);
  }, []);
  const generation = useRef(0);
  const polling = useRef(false);
  const lastMarked = useRef(0);

  // Carga inicial (y al cambiar de conversación). Hasta que termina no hay consulta periódica.
  useEffect(() => {
    const gen = ++generation.current;
    state.current = emptySync();
    setSyncState(state.current);
    setPage(null); setError(null); setSendError(null);
    lastMarked.current = 0; polling.current = false;
    if (!source.key) return;
    setLoading(true);
    src.current.load({})
      .then((p) => {
        if (gen !== generation.current) return;
        setSync((s) => applyInitial(s, p));
        setPage(p);
      })
      .catch((e: Error) => { if (gen === generation.current) setError(e.message || "No se pudieron cargar los mensajes"); })
      .finally(() => { if (gen === generation.current) setLoading(false); });
  }, [source.key, setSync]);

  /** Pide lo posterior al cursor y vacía has_more en vueltas seguidas. */
  const poll = useCallback(async () => {
    if (!src.current.key || polling.current || !state.current.ready) return;
    polling.current = true;
    const gen = generation.current;
    try {
      for (let round = 0; round < MAX_DRAIN; round++) {
        const after = state.current.cursor;
        const p = await src.current.load({ after });
        if (gen !== generation.current) return;
        setSync((s) => applyPoll(s, p, after));
        setError(null);
        if (!p.has_more) break;
      }
    } catch {
      // Un corte momentáneo no interrumpe la conversación: se reintenta en la próxima vuelta
    } finally {
      if (gen === generation.current) polling.current = false;
    }
  }, [setSync]);

  // Consulta periódica: con la carga inicial lista, la vista activa y la pestaña visible
  useEffect(() => {
    if (!active || !source.key || !sync.ready) return;
    const tick = () => { if (document.visibilityState === "visible") void poll(); };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    tick();
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [active, source.key, sync.ready, poll]);

  // Marcar como leído sólo lo entregado por las consultas y a la vista
  useEffect(() => {
    if (!active || !source.canMarkRead || !sync.conversation || sync.conversation.unread === 0) return;
    if (document.visibilityState !== "visible") return;
    const upTo = readableUpTo(sync);
    if (upTo === 0 || upTo <= lastMarked.current) return;
    lastMarked.current = upTo;
    const gen = generation.current;
    src.current.read(upTo)
      .then(() => {
        if (gen !== generation.current) return;
        // Los pendientes posteriores al cursor (si los hubiera) los trae la próxima consulta
        setSync((s) => (s.conversation ? { ...s, conversation: { ...s.conversation, unread: 0 } } : s));
      })
      .catch(() => { lastMarked.current = 0; });
  }, [active, source.canMarkRead, sync, setSync]);

  const loadOlder = useCallback(async () => {
    const first = state.current.messages[0]?.id;
    if (!first) return;
    const gen = generation.current;
    try {
      const p = await src.current.load({ before: first });
      if (gen === generation.current) setSync((s) => applyOlder(s, p));
    } catch (e) {
      setError((e as Error).message || "No se pudieron cargar los mensajes anteriores");
    }
  }, [setSync]);

  const send = useCallback(async (body: string, productId?: string | null): Promise<boolean> => {
    setSending(true); setSendError(null);
    const gen = generation.current;
    try {
      const m = await src.current.send(body, productId);
      if (gen === generation.current) {
        setSync((s) => applyOwn(s, m));
        // Trae enseguida lo que el otro lado haya escrito antes (y el estado de la conversación)
        void poll();
      }
      return true;
    } catch (e) {
      setSendError((e as Error).message || "No se pudo enviar el mensaje");
      return false;
    } finally {
      setSending(false);
    }
  }, [poll, setSync]);

  return {
    messages: sync.messages, conversation: sync.conversation, page, hasMore: sync.hasOlder,
    loading, error, sending, sendError, setSendError, loadOlder, send, refresh: poll,
  };
}
