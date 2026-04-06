// =============================================
// CLIENTE DE MERCADO PAGO (Frontend)
// Utilidades para el SDK de MP en el lado cliente.
// El SDK de React de MP se inicializa con la clave pública.
// Las operaciones sensibles (crear preferencia, webhooks)
// se hacen en el backend, NUNCA aquí.
// =============================================

// Clave pública de Mercado Pago (segura para exponer al cliente)
export const MP_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";

// -----------------------------------------------
// Tipos de estado de pago que MP puede devolver
// en los parámetros de la URL de retorno
// -----------------------------------------------
export type MpPaymentStatus =
  | "approved"
  | "pending"
  | "in_process"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back";

// Mapeo de estado de MP a mensaje legible en español
export const MP_STATUS_MESSAGE: Record<MpPaymentStatus, string> = {
  approved: "Pago aprobado",
  pending: "Pago pendiente de acreditación",
  in_process: "Pago en revisión",
  rejected: "Pago rechazado",
  cancelled: "Pago cancelado",
  refunded: "Pago reembolsado",
  charged_back: "Contracargo iniciado",
};

// -----------------------------------------------
// Extrae los parámetros de retorno de Mercado Pago desde la URL
// MP agrega ?collection_id=...&collection_status=...&payment_id=...
// -----------------------------------------------
export interface MpReturnParams {
  collection_id?: string;
  collection_status?: MpPaymentStatus;
  payment_id?: string;
  status?: MpPaymentStatus;
  external_reference?: string; // Nuestro order_id
  payment_type?: string;
  merchant_order_id?: string;
  preference_id?: string;
  site_id?: string;
  processing_mode?: string;
  merchant_account_id?: string;
}

export function parseMpReturnParams(searchParams: URLSearchParams): MpReturnParams {
  return {
    collection_id: searchParams.get("collection_id") ?? undefined,
    collection_status: (searchParams.get("collection_status") as MpPaymentStatus) ?? undefined,
    payment_id: searchParams.get("payment_id") ?? undefined,
    status: (searchParams.get("status") as MpPaymentStatus) ?? undefined,
    external_reference: searchParams.get("external_reference") ?? undefined,
    payment_type: searchParams.get("payment_type") ?? undefined,
    merchant_order_id: searchParams.get("merchant_order_id") ?? undefined,
    preference_id: searchParams.get("preference_id") ?? undefined,
  };
}
