// =============================================
// API: MENSAJERÍA CLIENTE ↔ TIENDA (T9)
// El cliente usa /chat; el personal, /admin/chat. Las dos vistas comparten
// el formato de mensajes y la consulta periódica con ?after=.
// =============================================

import { apiFetch } from "./client";

export const MAX_MESSAGE_LENGTH = 2000;

export type SenderRole = "customer" | "staff";
export type ConversationStatus = "open" | "closed";

export interface ChatProduct { id: string; name: string; slug: string; price: number; image_url: string | null; is_active: boolean }

export interface ChatMessage {
  id: number;
  sender_role: SenderRole;
  sender_name: string | null;
  body: string;
  created_at: string;
  product: ChatProduct | null;
}

export interface ConversationView {
  id: string;
  status: ConversationStatus;
  unread: number;
  /** Último mensaje que leyó el otro lado. */
  other_last_read_id: number;
  last_message_at: string | null;
}

export interface ThreadPage {
  conversation: ConversationView | null;
  messages: ChatMessage[];
  has_more: boolean;
}

export interface StaffCustomer {
  id: string; name: string; email: string; phone: string | null; created_at: string | null;
  recent_orders: Array<{ id: string; order_number: string; status: string; total: number; created_at: string | null }>;
}

export interface StaffThreadPage extends ThreadPage { customer: StaffCustomer | null }

export interface ConversationSummary {
  id: string;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string | null;
  customer: { id: string; name: string; email: string };
  unread: number;
  last_message: { body: string; sender_role: SenderRole } | null;
}

export interface ReadParams { after?: number; before?: number }

function token(): string | undefined {
  return typeof window === "undefined" ? undefined : localStorage.getItem("tele_import_token") ?? undefined;
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}` : "";
}

const post = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "POST", body: JSON.stringify(body), token: token() });

// ---- Cliente ----
export const chatApi = {
  thread: async (p: ReadParams = {}) => (await apiFetch<ThreadPage>(`/chat${qs({ ...p })}`, { token: token() })).data,
  unread: async () => (await apiFetch<{ unread: number }>("/chat/unread", { token: token() })).data.unread,
  send: async (body: string, productId?: string | null) => (await post<ChatMessage>("/chat/messages", { body, product_id: productId ?? null })).data,
  read: async (upTo: number) => { await post("/chat/read", { up_to: upTo }); },
};

// ---- Personal ----
export const staffChatApi = {
  unread: async () => (await apiFetch<{ conversations: number; messages: number }>("/admin/chat/unread", { token: token() })).data,
  list: async (status: ConversationStatus | "all", q?: string) =>
    (await apiFetch<ConversationSummary[]>(`/admin/chat/conversations${qs({ status, q })}`, { token: token() })).data,
  thread: async (id: string, p: ReadParams = {}) =>
    (await apiFetch<StaffThreadPage>(`/admin/chat/conversations/${encodeURIComponent(id)}${qs({ ...p })}`, { token: token() })).data,
  send: async (id: string, body: string) =>
    (await post<ChatMessage>(`/admin/chat/conversations/${encodeURIComponent(id)}/messages`, { body })).data,
  read: async (id: string, upTo: number) => { await post(`/admin/chat/conversations/${encodeURIComponent(id)}/read`, { up_to: upTo }); },
  setStatus: async (id: string, status: ConversationStatus) => {
    await apiFetch(`/admin/chat/conversations/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }), token: token() });
  },
};
