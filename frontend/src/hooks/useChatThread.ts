"use client";

// =============================================
// HOOK: CONVERSACIÓN CON CONSULTA PERIÓDICA (T9)
// Carga los últimos mensajes (si falla, reintenta sola o con "Reintentar")
// y, cuando esa carga sale bien, mientras la vista
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
  const initRunning = useRef(false);
  /** Fallos seguidos de la carga inicial (0 = sin fallos); cambia en cada fallo para reprogramar el reintento. */
  const [initFailures, setInitFailures] = useState(0);

  /**
   * Carga inicial. Hasta que sale bien no hay consulta periódica (protege el
   * cursor). Si falla se reintenta sola (efecto de abajo), con el botón
   * "Reintentar" o después de un envío exitoso.
   */
  const loadInitial = useCallback(async () => {
    if (!src.current.key || initRunning.current || state.current.ready) return;
    initRunning.current = true;
    const gen = generation.current;
    setLoading(true);
    try {
      const p = await src.current.load({});
      if (gen !== generation.current) return;
      setSync((s) => applyInitial(s, p));
      setPage(p);
      setError(null);
      setInitFailures(0);
    } catch (e) {
      if (gen !== generation.current) return;
      setError((e as Error).message || "No se pudieron cargar los mensajes");
      setInitFailures((n) => n + 1);
    } finally {
      if (gen === generation.current) { initRunning.current = false; setLoading(false); }
    }
  }, [setSync]);

  // Al abrir (o cambiar de conversación): estado limpio y carga inicial
  useEffect(() => {
    ++generation.current;
    state.current = emptySync();
    setSyncState(state.current);
    setPage(null); setError(null); setSendError(null); setInitFailures(0);
    lastMarked.current = 0; polling.current = false; initRunning.current = false;
    if (source.key) void loadInitial();
  }, [source.key, loadInitial]);

  // Reintento de la carga inicial tras un fallo: 2 s, 4 s, 8 s… hasta 30 s,
  // sólo con la vista activa; al volver a la pestaña, enseguida.
  useEffect(() => {
    if (!active || !source.key || sync.ready || initFailures === 0) return;
    const delay = Math.min(2000 * 2 ** (initFailures - 1), 30_000);
    const retry = () => { if (document.visibilityState === "visible") void loadInitial(); };
    const timer = window.setTimeout(retry, delay);
    document.addEventListener("visibilitychange", retry);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", retry); };
  }, [active, source.key, sync.ready, initFailures, loadInitial]);

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
        // Trae enseguida lo que el otro lado haya escrito antes (y el estado de la
        // conversación). Si la carga inicial había fallado, la API respondió:
        // se reintenta esa carga en lugar de consultar con un cursor sin inicializar.
        if (state.current.ready) void poll(); else void loadInitial();
      }
      return true;
    } catch (e) {
      setSendError((e as Error).message || "No se pudo enviar el mensaje");
      return false;
    } finally {
      setSending(false);
    }
  }, [poll, loadInitial, setSync]);

  /** Actualiza: consulta incremental si ya cargó; si no, reintenta la carga inicial. */
  const refresh = useCallback(async () => {
    if (state.current.ready) await poll(); else await loadInitial();
  }, [poll, loadInitial]);

  return {
    messages: sync.messages, conversation: sync.conversation, page, hasMore: sync.hasOlder,
    loading, error, sending, sendError, setSendError, loadOlder, send, refresh,
    /** true mientras la carga inicial no salió bien (hay que mostrar "Reintentar"). */
    initFailed: !sync.ready && initFailures > 0,
    retry: loadInitial,
  };
}
