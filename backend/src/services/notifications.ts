// =============================================
// SERVICIO: NOTIFICACIONES
// Centraliza la lógica de creación de notificaciones
// para los distintos eventos del sistema.
// =============================================

import { createNotification } from "../utils/directus";

/**
 * Notifica al administrador cuando llega un nuevo pedido.
 * Se llama desde el webhook de Mercado Pago cuando el pago es aprobado.
 */
export async function notifyNewOrder(data: {
  adminUserId: string;
  orderNumber: string;
  customerName: string;
  total: number;
  orderId: string;
}): Promise<void> {
  await createNotification({
    user_id: data.adminUserId,
    type: "order_new",
    title: `Nuevo pedido: ${data.orderNumber}`,
    message: `${data.customerName} realizó un pedido por $${data.total.toLocaleString("es-AR")}`,
    link: `/admin/pedidos/${data.orderId}`,
  });
}

/**
 * Notifica al cliente cuando cambia el estado de su pedido.
 */
export async function notifyOrderStatusChange(data: {
  userId: string;
  orderNumber: string;
  newStatus: string;
  orderId: string;
}): Promise<void> {
  const statusMessages: Record<string, string> = {
    paid: "Tu pago fue confirmado. Estamos preparando tu pedido.",
    processing: "Tu pedido está siendo preparado.",
    ready_to_ship: "Tu pedido está listo para ser despachado.",
    shipped: "Tu pedido fue enviado. Pronto lo recibirás.",
    delivered: "Tu pedido fue entregado. ¡Gracias por tu compra!",
    cancelled: "Tu pedido fue cancelado.",
    refunded: "El reembolso de tu pedido fue procesado.",
  };

  const message = statusMessages[data.newStatus] ?? `Estado actualizado: ${data.newStatus}`;

  await createNotification({
    user_id: data.userId,
    type: "order_status",
    title: `Pedido ${data.orderNumber} — actualización`,
    message,
    link: `/perfil/pedidos`,
  });
}

/**
 * Notifica al admin cuando un producto tiene stock bajo (≤5 unidades).
 */
export async function notifyLowStock(data: {
  adminUserId: string;
  productName: string;
  productId: string;
  currentStock: number;
}): Promise<void> {
  await createNotification({
    user_id: data.adminUserId,
    type: "stock_low",
    title: `Stock bajo: ${data.productName}`,
    message: `Quedan solo ${data.currentStock} unidades disponibles.`,
    link: `/admin/stock`,
  });
}
