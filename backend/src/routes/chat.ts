// =============================================
// RUTAS: MENSAJERÍA (T9)
//
// Cliente, montado en /chat detrás de requireAuth y sólo para el rol
// customer (el rol se lee de la base, no del token):
//   GET  /chat[?after=id|?before=id]   conversación propia y mensajes
//   GET  /chat/unread                  no leídos (globo del botón de chat)
//   POST /chat/messages { body, product_id? }
//   POST /chat/read { up_to }
//
// Personal, montado en /admin/chat (requireAuth + requirePanelAccess:
// readonly puede leer, pero no responder ni cambiar el estado):
//   GET   /admin/chat/unread
//   GET   /admin/chat/conversations[?status=open|closed|all&q=]
//   GET   /admin/chat/conversations/:id[?after=id|?before=id]
//   POST  /admin/chat/conversations/:id/messages { body, product_id? }
//   POST  /admin/chat/conversations/:id/read { up_to }
//   PATCH /admin/chat/conversations/:id { status }
// =============================================

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import db from "../db/database";
import { requireAuth } from "./auth";
import { takeQuota } from "../services/rateLimit";
import { dispatch, notifyChatToCustomer, notifyChatToStaff } from "../services/notifications";
import {
  ChatError, customerConversation, customerUnread, listQuery, markCustomerRead, markStaffRead,
  messageInput, readBody, readQuery, sendCustomerMessage, sendStaffMessage, setConversationStatus,
  staffConversation, staffConversations, staffUnread,
} from "../services/chat";

type WithUser = Request & { user: { userId: string; role: string } };
const userId = (req: Request) => (req as WithUser).user.userId;

/** Mensajes por cliente: 20 cada 5 minutos alcanzan para conversar y frenan un abuso. */
export const CHAT_LIMIT = { messages: 20, windowMs: 5 * 60_000 } as const;

function fail(res: Response, error: unknown, context: string, fallback: string): void {
  if (error instanceof ChatError) { res.status(error.status).json({ error: error.message }); return; }
  console.error(`[Chat] Error en ${context}:`, error);
  res.status(500).json({ error: fallback });
}

const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Datos inválidos";

// -----------------------------------------------
// Cliente
// -----------------------------------------------
export const chatRouter = Router();
chatRouter.use(requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void);

/** Sólo clientes: el personal responde desde el panel. Rol vigente en la base. */
chatRouter.use(async (req, res, next) => {
  try {
    const [rows] = await db.query<RowDataPacket[]>("SELECT role FROM users WHERE id = ? LIMIT 1", [userId(req)]);
    const role = rows[0]?.role;
    if (!role) { res.status(401).json({ error: "La sesión ya no es válida. Iniciá sesión de nuevo." }); return; }
    if (role !== "customer") { res.status(403).json({ error: "El personal responde los mensajes desde el panel (Mensajes)." }); return; }
    next();
  } catch (error) {
    fail(res, error, "verificación de rol", "No se pudo verificar tu sesión. Intentá de nuevo.");
  }
});

chatRouter.get("/", async (req, res) => {
  const q = readQuery.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: firstIssue(q.error) }); return; }
  try {
    res.json({ data: await customerConversation(userId(req), q.data) });
  } catch (error) {
    fail(res, error, "GET /chat", "No se pudieron cargar los mensajes");
  }
});

chatRouter.get("/unread", async (req, res) => {
  try {
    res.json({ data: { unread: await customerUnread(userId(req)) } });
  } catch (error) {
    fail(res, error, "GET /chat/unread", "No se pudieron consultar los mensajes");
  }
});

chatRouter.post("/messages", async (req, res) => {
  const body = messageInput.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: firstIssue(body.error) }); return; }
  const wait = takeQuota(`chat:${userId(req)}`, CHAT_LIMIT.messages, CHAT_LIMIT.windowMs);
  if (wait !== null) {
    res.setHeader("Retry-After", String(wait));
    res.status(429).json({ error: `Enviaste muchos mensajes seguidos. Esperá ${Math.ceil(wait / 60)} min y volvé a intentar.` });
    return;
  }
  try {
    const sent = await sendCustomerMessage(userId(req), body.data.body, body.data.product_id);
    if (sent.notify) dispatch(`chat al personal ${sent.conversationId}`, () => notifyChatToStaff(sent.conversationId, sent.customerId, sent.message.body));
    res.status(201).json({ data: sent.message });
  } catch (error) {
    fail(res, error, "POST /chat/messages", "No se pudo enviar el mensaje");
  }
});

chatRouter.post("/read", async (req, res) => {
  const body = readBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: firstIssue(body.error) }); return; }
  try {
    await markCustomerRead(userId(req), body.data.up_to);
    res.json({ success: true });
  } catch (error) {
    fail(res, error, "POST /chat/read", "No se pudo actualizar la conversación");
  }
});

// -----------------------------------------------
// Personal (se monta dentro de adminRouter)
// -----------------------------------------------
export const adminChatRouter = Router();

adminChatRouter.get("/unread", async (_req, res) => {
  try {
    res.json({ data: await staffUnread() });
  } catch (error) {
    fail(res, error, "GET /admin/chat/unread", "No se pudieron consultar los mensajes");
  }
});

adminChatRouter.get("/conversations", async (req, res) => {
  const q = listQuery.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: firstIssue(q.error) }); return; }
  try {
    res.json({ data: await staffConversations(q.data) });
  } catch (error) {
    fail(res, error, "GET /admin/chat/conversations", "No se pudieron cargar las conversaciones");
  }
});

adminChatRouter.get("/conversations/:id", async (req, res) => {
  const q = readQuery.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: firstIssue(q.error) }); return; }
  try {
    res.json({ data: await staffConversation(req.params.id, q.data) });
  } catch (error) {
    fail(res, error, "GET /admin/chat/conversations/:id", "No se pudo cargar la conversación");
  }
});

adminChatRouter.post("/conversations/:id/messages", async (req, res) => {
  const body = messageInput.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: firstIssue(body.error) }); return; }
  try {
    const sent = await sendStaffMessage(userId(req), req.params.id, body.data.body, body.data.product_id);
    if (sent.notify) dispatch(`chat al cliente ${sent.conversationId}`, () => notifyChatToCustomer(sent.customerId, sent.message.sender_name, sent.message.body));
    res.status(201).json({ data: sent.message });
  } catch (error) {
    fail(res, error, "POST /admin/chat/conversations/:id/messages", "No se pudo enviar la respuesta");
  }
});

adminChatRouter.post("/conversations/:id/read", async (req, res) => {
  const body = readBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: firstIssue(body.error) }); return; }
  try {
    await markStaffRead(req.params.id, body.data.up_to);
    res.json({ success: true });
  } catch (error) {
    fail(res, error, "POST /admin/chat/conversations/:id/read", "No se pudo actualizar la conversación");
  }
});

const statusBody = z.object({
  status: z.enum(["open", "closed"], { errorMap: () => ({ message: "El estado debe ser abierta o resuelta" }) }),
});

adminChatRouter.patch("/conversations/:id", async (req, res) => {
  const body = statusBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: firstIssue(body.error) }); return; }
  try {
    await setConversationStatus(req.params.id, body.data.status);
    res.json({ success: true });
  } catch (error) {
    fail(res, error, "PATCH /admin/chat/conversations/:id", "No se pudo cambiar el estado");
  }
});
