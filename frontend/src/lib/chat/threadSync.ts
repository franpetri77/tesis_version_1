// =============================================
// SINCRONIZACIÓN DE UNA CONVERSACIÓN (T9, corrección 1)
// Lógica pura, sin React, para poder probarla aislada
// (frontend/test/thread-sync.test.cjs).
//
// Dos cosas distintas que antes se confundían:
//   - lo que se MUESTRA: todos los mensajes conocidos, incluidos los propios
//     que devolvió el POST;
//   - el CURSOR de entrega: el id hasta el cual las consultas GET entregaron
//     la conversación sin huecos. Sólo avanza con respuestas de GET.
// La consulta periódica pide ?after=cursor, así un mensaje del otro lado
// guardado antes que el propio (id menor) igual llega. Y se marca como
// leído sólo hasta el cursor: nunca algo que todavía no se recibió.
// =============================================

import type { ChatMessage, ConversationView, ThreadPage } from "../api/chat";

export interface SyncState {
  messages: ChatMessage[];
  conversation: ConversationView | null;
  /** Último id entregado sin huecos por las consultas GET. */
  cursor: number;
  /** true cuando terminó la carga inicial: recién ahí arranca la consulta periódica. */
  ready: boolean;
  /** Hay mensajes anteriores al primero mostrado. */
  hasOlder: boolean;
}

export const emptySync = (): SyncState => ({ messages: [], conversation: null, cursor: 0, ready: false, hasOlder: false });

/** Une por id (sin duplicados) y ordena. Nunca descarta lo que ya estaba. */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return current;
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

const maxId = (list: ChatMessage[]) => list.reduce((max, m) => Math.max(max, m.id), 0);

/**
 * Carga inicial: los últimos mensajes, contiguos hasta el más nuevo. El
 * cursor queda en el mayor id entregado. Se combina con lo que hubiera (por
 * ejemplo, un mensaje propio enviado mientras cargaba) en vez de pisarlo.
 */
export function applyInitial(state: SyncState, page: ThreadPage): SyncState {
  return {
    messages: mergeMessages(state.messages, page.messages),
    conversation: page.conversation,
    cursor: Math.max(state.cursor, maxId(page.messages)),
    ready: true,
    hasOlder: page.has_more,
  };
}

/**
 * Respuesta de ?after=X. Entrega sin huecos desde X; como el cursor nunca
 * retrocede y X fue un cursor anterior (X <= cursor), lo entregado empalma
 * con lo que ya había y el cursor puede avanzar hasta el mayor id recibido.
 * Una respuesta vieja que llega tarde no hace retroceder nada.
 */
export function applyPoll(state: SyncState, page: ThreadPage, requestedAfter: number): SyncState {
  if (requestedAfter > state.cursor) return state; // no debería pasar: se ignora por seguridad
  return {
    ...state,
    messages: mergeMessages(state.messages, page.messages),
    conversation: page.conversation ?? state.conversation,
    cursor: Math.max(state.cursor, maxId(page.messages)),
  };
}

/** Mensaje propio devuelto por el POST: se muestra, pero NO mueve el cursor. */
export function applyOwn(state: SyncState, message: ChatMessage): SyncState {
  return { ...state, messages: mergeMessages(state.messages, [message]) };
}

/** Mensajes anteriores (?before=). No tocan el cursor. */
export function applyOlder(state: SyncState, page: ThreadPage): SyncState {
  return { ...state, messages: mergeMessages(state.messages, page.messages), hasOlder: page.has_more };
}

/** Hasta dónde se puede confirmar la lectura: lo entregado por GET, nada más. */
export function readableUpTo(state: SyncState): number {
  return state.cursor;
}
