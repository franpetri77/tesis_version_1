// =============================================
// CLIENTE DE SOLICITUDES DE PRESUPUESTO
// Alta pública desde el formulario y consulta desde el panel.
// =============================================

import { apiGet, apiPost, apiPatch } from "./client";

export type QuoteStatus = "pending" | "in_review" | "quoted" | "closed";

export interface QuoteRequestInput {
  company?: string;
  contact_name: string;
  email: string;
  phone?: string;
  tax_id?: string;
  products: string;
  estimated_qty?: number;
  message?: string;
}

export interface QuoteRequest {
  id: string;
  company: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  tax_id: string | null;
  products: string;
  estimated_qty: number | null;
  message: string | null;
  status: QuoteStatus;
  user_id: string | null;
  created_at: string;
}

/** Envía una solicitud de presupuesto. No requiere sesión. */
export async function createQuoteRequest(
  data: QuoteRequestInput
): Promise<{ id: string; mensaje: string }> {
  const res = await apiPost<{ id: string; mensaje: string }>("/quotes", data);
  return res.data;
}

/** Lista las solicitudes recibidas. Requiere rol admin. */
export async function getQuoteRequests(
  token: string,
  status?: QuoteStatus
): Promise<QuoteRequest[]> {
  const query = status ? `?status=${status}` : "";
  const res = await apiGet<QuoteRequest[]>(`/quotes${query}`, token);
  return res.data;
}

/** Cambia el estado de una solicitud. Requiere rol admin. */
export async function updateQuoteStatus(
  token: string,
  id: string,
  status: QuoteStatus
): Promise<void> {
  await apiPatch(`/quotes/${id}/status`, { status }, token);
}
