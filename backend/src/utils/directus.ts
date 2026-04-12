// =============================================
// UTILIDAD: CLIENTE HTTP HACIA DIRECTUS
// El backend Node.js se comunica con Directus via REST
// usando el service token para operaciones administrativas.
// =============================================

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const TOKEN = process.env.DIRECTUS_SERVICE_TOKEN ?? "";

const baseHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${TOKEN}`,
};

/**
 * Wrapper genérico para llamadas a la API de Directus.
 * Lanza un error si la respuesta no es exitosa.
 */
async function directusFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${DIRECTUS_URL}${endpoint}`, {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Directus error ${res.status}: ${errorBody}`);
  }

  return res.json() as Promise<T>;
}

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
  await directusFetch(`/items/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
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
  const res = await directusFetch<{
    data: { id: string; order_number: string; status: string; total: number; user_id: string };
  }>(`/items/orders/${orderId}?fields=id,order_number,status,total,user_id`);
  return res.data;
}

// -----------------------------------------------
// OPERACIONES SOBRE PAGOS
// -----------------------------------------------

/**
 * Registra o actualiza un pago en la base de datos.
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
  await directusFetch("/items/payments", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      currency: data.currency ?? "ARS",
    }),
  });
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
    await directusFetch("/items/audit_logs", {
      method: "POST",
      body: JSON.stringify(data),
    });
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
  await directusFetch("/items/notifications", {
    method: "POST",
    body: JSON.stringify({ ...data, is_read: false }),
  });
}
