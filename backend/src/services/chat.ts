// =============================================
// SERVICIO: MENSAJERÍA CLIENTE ↔ TIENDA (T9)
// Una conversación por cliente, guardada en la base (sin servicios de
// terceros). El cliente escribe desde la tienda; el personal responde desde
// el panel. La actualización es por consulta periódica: el frontend pide
// sólo los mensajes con id mayor al último que ya tiene.
//
// Lectura: cada lado guarda el id del último mensaje que leyó. Lo no leído
// es lo del otro lado con id mayor. El puntero avanza SOLO con /read, que
// la vista llama hasta el último mensaje que efectivamente recibió. Enviar
// no lo mueve: un mensaje del otro lado guardado mientras se redactaba no
// cuenta como leído hasta que llegue a la pantalla (revisión de Codex, T9).
// El aviso (campana y correo) sale sólo con el PRIMER mensaje no leído de
// cada tanda: si el otro lado todavía no leyó lo anterior, no se repite.
// =============================================

import { randomUUID } from "crypto";
import { z } from "zod";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import db from "../db/database";
import { withTransaction } from "./audit";

export const MAX_MESSAGE_LENGTH = 2000;
export const PAGE_SIZE = 50;
const POLL_LIMIT = 200;

export type SenderRole = "customer" | "staff";
type Exec = Pick<PoolConnection, "query">;

export class ChatError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/**
 * Quita caracteres de control (salvo saltos de línea y tabulaciones), los
 * invisibles de dirección de texto y los espacios sobrantes.
 */
export function cleanBody(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const tooLong = `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres`;
export const messageInput = z.object({
  body: z
    .string({ required_error: "Escribí un mensaje", invalid_type_error: "El mensaje debe ser texto" })
    .max(MAX_MESSAGE_LENGTH * 2, tooLong)
    .transform(cleanBody)
    .pipe(z.string().min(1, "Escribí un mensaje").max(MAX_MESSAGE_LENGTH, tooLong)),
  product_id: z.string().min(1).max(50).nullish(),
});

/** Lectura: ?after= (consulta periódica) o ?before= (mensajes anteriores). */
export const readQuery = z.object({
  after: z.coerce.number().int().min(0).optional(),
  before: z.coerce.number().int().min(1).optional(),
}).refine((q) => q.after === undefined || q.before === undefined, "Usá after o before, no los dos");

export const readBody = z.object({
  up_to: z.number({ required_error: "Falta el último mensaje leído", invalid_type_error: "El último mensaje leído debe ser un número" }).int().min(0),
});

export interface ChatProduct { id: string; name: string; slug: string; price: number; image_url: string | null; is_active: boolean }
export interface ChatMessage {
  id: number;
  sender_role: SenderRole;
  /** Nombre de pila de quien escribió; null si la cuenta ya no existe. */
  sender_name: string | null;
  body: string;
  created_at: string;
  product: ChatProduct | null;
}
export interface MessagePage { messages: ChatMessage[]; has_more: boolean }

const MESSAGE_SELECT = `
  SELECT m.id, m.sender_role, m.body, m.created_at, UNIX_TIMESTAMP(m.created_at) AS created_ts, m.product_id,
         u.first_name AS sender_first_name,
         p.name AS product_name, p.slug AS product_slug, p.price AS product_price, p.is_active AS product_active,
         (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id
          ORDER BY pi.sort_order ASC LIMIT 1) AS product_image
  FROM chat_messages m
  LEFT JOIN users u ON u.id = m.sender_id
  LEFT JOIN products p ON p.id = m.product_id`;

const iso = (v: unknown): string | null =>
  v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : String(v);

/**
 * Instante en ISO (UTC). La base devuelve DATETIME como texto sin zona
 * (dateStrings); UNIX_TIMESTAMP lo interpreta en la zona de la sesión, la
 * misma con que NOW() lo guardó, así la hora es correcta sea cual sea la
 * zona del servidor de base de datos.
 */
const instant = (ts: unknown, fallback: unknown): string | null =>
  ts === null || ts === undefined ? iso(fallback) : new Date(Number(ts) * 1000).toISOString();

function toMessage(r: RowDataPacket): ChatMessage {
  return {
    id: Number(r.id),
    sender_role: r.sender_role as SenderRole,
    sender_name: r.sender_first_name ? String(r.sender_first_name) : null,
    body: String(r.body),
    created_at: instant(r.created_ts, r.created_at) ?? "",
    product: r.product_id && r.product_name ? {
      id: String(r.product_id), name: String(r.product_name), slug: String(r.product_slug),
      price: Number(r.product_price), image_url: r.product_image ? String(r.product_image) : null,
      is_active: Boolean(Number(r.product_active)),
    } : null,
  };
}

/**
 * Mensajes de una conversación, siempre en orden ascendente:
 *  - sin parámetros: los últimos PAGE_SIZE;
 *  - before: los PAGE_SIZE anteriores a ese id;
 *  - after: los posteriores (hasta POLL_LIMIT), para la consulta periódica.
 */
export async function loadMessages(exec: Exec, conversationId: string, q: { after?: number; before?: number } = {}): Promise<MessagePage> {
  if (q.after !== undefined) {
    const [rows] = await exec.query<RowDataPacket[]>(
      `${MESSAGE_SELECT} WHERE m.conversation_id = ? AND m.id > ? ORDER BY m.id ASC LIMIT ${POLL_LIMIT + 1}`,
      [conversationId, q.after]
    );
    return { messages: rows.slice(0, POLL_LIMIT).map(toMessage), has_more: rows.length > POLL_LIMIT };
  }
  const before = q.before !== undefined;
  const [rows] = await exec.query<RowDataPacket[]>(
    `${MESSAGE_SELECT} WHERE m.conversation_id = ?${before ? " AND m.id < ?" : ""} ORDER BY m.id DESC LIMIT ${PAGE_SIZE + 1}`,
    before ? [conversationId, q.before] : [conversationId]
  );
  return { messages: rows.slice(0, PAGE_SIZE).reverse().map(toMessage), has_more: rows.length > PAGE_SIZE };
}

interface ConversationRow extends RowDataPacket {
  id: string; user_id: string; status: "open" | "closed";
  customer_last_read_id: number | string; staff_last_read_id: number | string;
  last_message_at: Date | string | null; created_at: Date | string; last_ts?: number | string | null;
}

/** Mensajes del otro lado que `reader` todavía no leyó. */
async function unreadFor(exec: Exec, conversationId: string, reader: SenderRole, lastRead: number): Promise<number> {
  const [rows] = await exec.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM chat_messages WHERE conversation_id = ? AND sender_role = ? AND id > ?",
    [conversationId, reader === "customer" ? "staff" : "customer", lastRead]
  );
  return Number(rows[0]?.n ?? 0);
}

export interface ConversationView {
  id: string;
  status: "open" | "closed";
  /** No leídos por quien consulta. */
  unread: number;
  /** Último id que leyó el otro lado: permite mostrar "Leído". */
  other_last_read_id: number;
  last_message_at: string | null;
}

function view(c: ConversationRow, reader: SenderRole, unread: number): ConversationView {
  return {
    id: c.id, status: c.status, unread,
    other_last_read_id: Number(reader === "customer" ? c.staff_last_read_id : c.customer_last_read_id),
    last_message_at: instant(c.last_ts, c.last_message_at),
  };
}

// -----------------------------------------------
// Lado del cliente
// -----------------------------------------------

export async function customerConversation(userId: string, q: { after?: number; before?: number }) {
  const [rows] = await db.query<ConversationRow[]>("SELECT *, UNIX_TIMESTAMP(last_message_at) AS last_ts FROM chat_conversations WHERE user_id = ? LIMIT 1", [userId]);
  const c = rows[0];
  if (!c) return { conversation: null, messages: [], has_more: false };
  const page = await loadMessages(db, c.id, q);
  const unread = await unreadFor(db, c.id, "customer", Number(c.customer_last_read_id));
  return { conversation: view(c, "customer", unread), ...page };
}

export async function customerUnread(userId: string): Promise<number> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM chat_conversations c
     JOIN chat_messages m ON m.conversation_id = c.id
     WHERE c.user_id = ? AND m.sender_role = 'staff' AND m.id > c.customer_last_read_id`,
    [userId]
  );
  return Number(rows[0]?.n ?? 0);
}

async function checkProduct(conn: Exec, productId: string | null | undefined): Promise<string | null> {
  if (!productId) return null;
  const [rows] = await conn.query<RowDataPacket[]>("SELECT id FROM products WHERE id = ? AND is_active = 1 LIMIT 1", [productId]);
  if (!rows[0]) throw new ChatError(422, "El producto ya no está disponible. Enviá el mensaje sin adjuntarlo.");
  return String(rows[0].id);
}

async function insertMessage(conn: Exec, conversationId: string, role: SenderRole, senderId: string, body: string, productId: string | null): Promise<number> {
  const [res] = await conn.query<ResultSetHeader>(
    "INSERT INTO chat_messages (conversation_id, sender_role, sender_id, body, product_id) VALUES (?, ?, ?, ?, ?)",
    [conversationId, role, senderId, body, productId]
  );
  return Number(res.insertId);
}

async function insertedMessage(conn: Exec, conversationId: string, id: number): Promise<ChatMessage> {
  const [rows] = await conn.query<RowDataPacket[]>(`${MESSAGE_SELECT} WHERE m.conversation_id = ? AND m.id = ?`, [conversationId, id]);
  return toMessage(rows[0]);
}

export interface SendResult {
  conversationId: string;
  message: ChatMessage;
  /** true si es el primer mensaje no leído de la tanda: corresponde avisar al otro lado. */
  notify: boolean;
  /** Cliente de la conversación. */
  customerId: string;
}

/**
 * Mensaje del cliente. Crea la conversación la primera vez (la clave única
 * por cliente resuelve dos primeros mensajes simultáneos) y la reabre si
 * estaba resuelta. La fila de la conversación se bloquea antes de contar
 * los no leídos: dos mensajes simultáneos no generan dos avisos.
 */
export async function sendCustomerMessage(userId: string, body: string, productId?: string | null): Promise<SendResult> {
  return withTransaction(async (conn) => {
    await conn.query(
      "INSERT INTO chat_conversations (id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = id",
      [randomUUID(), userId]
    );
    const [rows] = await conn.query<ConversationRow[]>("SELECT *, UNIX_TIMESTAMP(last_message_at) AS last_ts FROM chat_conversations WHERE user_id = ? FOR UPDATE", [userId]);
    const c = rows[0];
    if (!c) throw new ChatError(500, "No se pudo abrir la conversación");
    const product = await checkProduct(conn, productId);
    const pending = await unreadFor(conn, c.id, "staff", Number(c.staff_last_read_id));
    const id = await insertMessage(conn, c.id, "customer", userId, body, product);
    // Enviar no mueve el puntero de lectura propio (ver el encabezado)
    await conn.query(
      "UPDATE chat_conversations SET status = 'open', closed_at = NULL, last_message_at = NOW() WHERE id = ?",
      [c.id]
    );
    return { conversationId: c.id, message: await insertedMessage(conn, c.id, id), notify: pending === 0, customerId: userId };
  });
}

/** Marca como leído hasta upTo, sin pasar del último mensaje existente. */
async function markRead(conversationId: string, reader: SenderRole, upTo: number): Promise<void> {
  const column = reader === "customer" ? "customer_last_read_id" : "staff_last_read_id";
  await db.query(
    `UPDATE chat_conversations c
     SET ${column} = GREATEST(${column}, LEAST(?, (SELECT COALESCE(MAX(m.id), 0) FROM chat_messages m WHERE m.conversation_id = c.id)))
     WHERE c.id = ?`,
    [upTo, conversationId]
  );
}

export async function markCustomerRead(userId: string, upTo: number): Promise<void> {
  const [rows] = await db.query<RowDataPacket[]>("SELECT id FROM chat_conversations WHERE user_id = ? LIMIT 1", [userId]);
  if (rows[0]) await markRead(String(rows[0].id), "customer", upTo);
}

// -----------------------------------------------
// Lado del personal (panel)
// -----------------------------------------------

export const listQuery = z.object({
  status: z.enum(["open", "closed", "all"]).default("open"),
  q: z.string().trim().max(100).optional(),
});

export async function staffConversations(filter: z.infer<typeof listQuery>) {
  const where: string[] = ["c.last_message_at IS NOT NULL"];
  const params: unknown[] = [];
  if (filter.status !== "all") { where.push("c.status = ?"); params.push(filter.status); }
  if (filter.q) {
    const like = `%${filter.q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
    where.push("(CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR u.email LIKE ?)");
    params.push(like, like);
  }
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT c.id, c.status, c.last_message_at, UNIX_TIMESTAMP(c.last_message_at) AS last_ts, c.created_at,
            u.id AS user_id, u.first_name, u.last_name, u.email,
            (SELECT COUNT(*) FROM chat_messages um
             WHERE um.conversation_id = c.id AND um.sender_role = 'customer' AND um.id > c.staff_last_read_id) AS unread,
            LEFT(lm.body, 140) AS last_body, lm.sender_role AS last_sender
     FROM chat_conversations c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN chat_messages lm ON lm.id = (SELECT MAX(x.id) FROM chat_messages x WHERE x.conversation_id = c.id)
     WHERE ${where.join(" AND ")}
     ORDER BY c.last_message_at DESC
     LIMIT 100`,
    params
  );
  return rows.map((r) => ({
    id: String(r.id), status: r.status as "open" | "closed",
    last_message_at: instant(r.last_ts, r.last_message_at), created_at: iso(r.created_at),
    customer: { id: String(r.user_id), name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(), email: String(r.email) },
    unread: Number(r.unread ?? 0),
    last_message: r.last_body === null || r.last_body === undefined ? null : { body: String(r.last_body), sender_role: r.last_sender as SenderRole },
  }));
}

export async function staffUnread(): Promise<{ conversations: number; messages: number }> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT c.id) AS conversations, COUNT(m.id) AS messages
     FROM chat_conversations c
     JOIN chat_messages m ON m.conversation_id = c.id AND m.sender_role = 'customer' AND m.id > c.staff_last_read_id`
  );
  return { conversations: Number(rows[0]?.conversations ?? 0), messages: Number(rows[0]?.messages ?? 0) };
}

async function conversationById(exec: Exec, id: string, lock = false): Promise<ConversationRow> {
  const [rows] = await exec.query<ConversationRow[]>(`SELECT *, UNIX_TIMESTAMP(last_message_at) AS last_ts FROM chat_conversations WHERE id = ? LIMIT 1${lock ? " FOR UPDATE" : ""}`, [id]);
  if (!rows[0]) throw new ChatError(404, "Conversación no encontrada");
  return rows[0];
}

export async function staffConversation(id: string, q: { after?: number; before?: number }) {
  const c = await conversationById(db, id);
  const page = await loadMessages(db, c.id, q);
  const unread = await unreadFor(db, c.id, "staff", Number(c.staff_last_read_id));
  // Datos del cliente sólo en la carga inicial, no en cada consulta periódica
  let customer = null;
  if (q.after === undefined) {
    const [users] = await db.query<RowDataPacket[]>(
      "SELECT id, first_name, last_name, email, phone, created_at FROM users WHERE id = ? LIMIT 1", [c.user_id]
    );
    const [orders] = await db.query<RowDataPacket[]>(
      "SELECT id, order_number, status, total, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
      [c.user_id]
    );
    const u = users[0];
    customer = u ? {
      id: String(u.id), name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(), email: String(u.email),
      phone: u.phone ? String(u.phone) : null, created_at: iso(u.created_at),
      recent_orders: orders.map((o) => ({
        id: String(o.id), order_number: String(o.order_number), status: String(o.status),
        total: Number(o.total), created_at: iso(o.created_at),
      })),
    } : null;
  }
  return { conversation: view(c, "staff", unread), customer, ...page };
}

/**
 * Respuesta del personal. Bloquea la conversación antes de contar lo que el
 * cliente no leyó (un solo aviso por tanda) y la reabre si estaba resuelta.
 * Responder no marca como leído lo anterior del cliente: eso lo hace la
 * vista con /read cuando de verdad lo recibió.
 */
export async function sendStaffMessage(staffId: string, conversationId: string, body: string, productId?: string | null): Promise<SendResult> {
  return withTransaction(async (conn) => {
    const c = await conversationById(conn, conversationId, true);
    const product = await checkProduct(conn, productId);
    const pending = await unreadFor(conn, c.id, "customer", Number(c.customer_last_read_id));
    const id = await insertMessage(conn, c.id, "staff", staffId, body, product);
    await conn.query(
      "UPDATE chat_conversations SET status = 'open', closed_at = NULL, last_message_at = NOW() WHERE id = ?",
      [c.id]
    );
    return { conversationId: c.id, message: await insertedMessage(conn, c.id, id), notify: pending === 0, customerId: c.user_id };
  });
}

export async function markStaffRead(conversationId: string, upTo: number): Promise<void> {
  await conversationById(db, conversationId);
  await markRead(conversationId, "staff", upTo);
}

export async function setConversationStatus(conversationId: string, status: "open" | "closed"): Promise<void> {
  await conversationById(db, conversationId);
  await db.query(
    `UPDATE chat_conversations SET status = ?, closed_at = ${status === "closed" ? "NOW()" : "NULL"} WHERE id = ?`,
    [status, conversationId]
  );
}
