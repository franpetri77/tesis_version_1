// =============================================
// SERVICIO: AUDITORÍA (T5)
// Registra quién hizo qué cambio administrativo, con el valor anterior y
// el nuevo. Con una conexión de transacción, el registro forma parte de la
// operación (si falla, se revierte todo); sin ella, un fallo de auditoría
// se registra en el log y no interrumpe la operación ya hecha.
// =============================================

import { randomUUID } from "crypto";
import type { PoolConnection } from "mysql2/promise";
import db from "../db/database";

export interface AuditEntry {
  action: string;
  entityType: "product" | "user" | "order" | "review" | "promotion" | "stock";
  entityId: string;
  userId: string | null;
  previous?: unknown;
  next?: unknown;
  ip?: string | null;
}

const SQL = `INSERT INTO audit_logs (id, action, entity_type, entity_id, user_id, previous_value, new_value, ip_address, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

function params(e: AuditEntry) {
  return [
    randomUUID(), e.action, e.entityType, e.entityId, e.userId,
    e.previous === undefined ? null : JSON.stringify(e.previous),
    e.next === undefined ? null : JSON.stringify(e.next),
    e.ip ?? null,
  ];
}

export async function logAudit(entry: AuditEntry, conn?: PoolConnection): Promise<void> {
  if (conn) {
    await conn.query(SQL, params(entry));
    return;
  }
  try {
    await db.query(SQL, params(entry));
  } catch (error) {
    console.error("[Audit] No se pudo registrar el evento:", entry.action, entry.entityId, error);
  }
}

/** Sólo los campos que cambiaron, para no guardar copias completas. */
export function diffFields<T extends Record<string, unknown>>(before: T, after: Partial<T>): { previous: Partial<T>; next: Partial<T> } | null {
  const previous: Partial<T> = {};
  const next: Partial<T> = {};
  for (const key of Object.keys(after) as Array<keyof T>) {
    const a = after[key];
    if (a === undefined) continue;
    const b = before[key];
    const norm = (v: unknown) => (typeof v === "number" || typeof v === "string" ? String(v) : JSON.stringify(v ?? null));
    if (norm(a) !== norm(b)) { previous[key] = b; next[key] = a; }
  }
  return Object.keys(next).length ? { previous, next } : null;
}
