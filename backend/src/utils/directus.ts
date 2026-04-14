// =============================================
// UTILIDAD: OPERACIONES DE BASE DE DATOS
// Anteriormente este módulo se comunicaba con Directus via REST API.
// Migrado a MySQL: todas las operaciones ahora van directo al pool.
//
// Se mantiene la misma interfaz pública para no romper los módulos
// que importan estas funciones (notifications.ts, etc.).
// =============================================

import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import pool from "../db/database";

// -----------------------------------------------
// OPERACIONES SOBRE PEDIDOS
// -----------------------------------------------

/**
 * Actualiza el estado de un pedido.
 */
export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<void> {
  await pool.query(
    "UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?",
    [status, orderId]
  );
}

/**
 * Obtiene un pedido por su ID.
 */
export async function getOrder(orderId: string): Promise<{
  id: string;
  order_number: string;
  status: string;
  total: number;
  user_id: string;
}> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, order_number, status, total, user_id FROM orders WHERE id = ?",
    [orderId]
  );
  const row = rows[0];
  if (!row) throw new Error(`Pedido no encontrado: ${orderId}`);
  return row as { id: string; order_number: string; status: string; total: number; user_id: string };
}

// -----------------------------------------------
// OPERACIONES SOBRE PAGOS
// -----------------------------------------------

/**
 * Registra un nuevo pago en la base de datos.
 */
export async function upsertPayment(data: {
  order_id: string;
  mp_payment_id: string;
  mp_preference_id?: string;
  status: string;
  amount: number;
  currency?: string;
  payment_method?: string;
  raw_response?: Record<string, unknown>;
}): Promise<void> {
  const paymentId = randomUUID();
  await pool.query(
    `INSERT INTO payments
       (id, order_id, mp_payment_id, mp_preference_id, status, amount, currency, payment_method, raw_response)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      paymentId,
      data.order_id,
      data.mp_payment_id,
      data.mp_preference_id ?? null,
      data.status,
      data.amount,
      data.currency ?? "ARS",
      data.payment_method ?? null,
      data.raw_response ? JSON.stringify(data.raw_response) : null,
    ]
  );
}

// -----------------------------------------------
// OPERACIONES DE AUDITORÍA
// -----------------------------------------------

/**
 * Registra una entrada en el log de auditoría.
 */
export async function logAuditEvent(data: {
  action: string;
  entity_type: string;
  entity_id: string;
  user_id?: string;
  previous_value?: unknown;
  new_value?: unknown;
  ip_address?: string;
}): Promise<void> {
  try {
    const auditId = randomUUID();
    await pool.query(
      `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, user_id, previous_value, new_value, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditId,
        data.action,
        data.entity_type,
        data.entity_id,
        data.user_id ?? null,
        data.previous_value !== undefined ? JSON.stringify(data.previous_value) : null,
        data.new_value !== undefined ? JSON.stringify(data.new_value) : null,
        data.ip_address ?? null,
      ]
    );
  } catch (err) {
    // No interrumpir el flujo si falla la auditoría
    console.error("[Audit] Error al registrar evento:", err);
  }
}

// -----------------------------------------------
// OPERACIONES DE NOTIFICACIONES
// -----------------------------------------------

/**
 * Crea una notificación para un usuario.
 */
export async function createNotification(data: {
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  const notificationId = randomUUID();
  await pool.query(
    `INSERT INTO notifications (id, user_id, type, title, message, is_read, link)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [
      notificationId,
      data.user_id,
      data.type,
      data.title,
      data.message,
      data.link ?? null,
    ]
  );
}
