// =============================================
// API CLIENT: CUENTA DE USUARIO
// Funciones para interactuar con los endpoints
// protegidos de la cuenta (pedidos, direcciones).
// =============================================

import { apiFetch } from "./client";
import type { Order, Address } from "@/types";

// Helper para obtener el token del localStorage
function getToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem("tele_import_token") ?? undefined;
}

// -----------------------------------------------
// PEDIDOS
// -----------------------------------------------

// Obtiene el historial completo de pedidos del usuario autenticado
export async function getMyOrders(): Promise<Order[]> {
  const res = await apiFetch<Order[]>("/auth/orders", { token: getToken() });
  return res.data;
}

// Obtiene el detalle completo de un pedido por su ID
export async function getMyOrder(id: string): Promise<Order> {
  const res = await apiFetch<Order>(`/auth/orders/${id}`, { token: getToken() });
  return res.data;
}

// -----------------------------------------------
// DIRECCIONES
// -----------------------------------------------

// Obtiene la lista de direcciones guardadas del usuario
export async function getMyAddresses(): Promise<Address[]> {
  const res = await apiFetch<Address[]>("/auth/addresses", { token: getToken() });
  return res.data;
}

// Crea una nueva dirección para el usuario autenticado
export async function createAddress(
  data: Omit<Address, "id" | "user_id">
): Promise<Address> {
  const res = await apiFetch<Address>("/auth/addresses", {
    method: "POST",
    body: JSON.stringify(data),
    token: getToken(),
  });
  return res.data;
}

// Actualiza los datos de una dirección existente
export async function updateAddress(
  id: string,
  data: Omit<Address, "id" | "user_id">
): Promise<Address> {
  const res = await apiFetch<Address>(`/auth/addresses/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    token: getToken(),
  });
  return res.data;
}

// Elimina una dirección por su ID
export async function deleteAddress(id: string): Promise<void> {
  await apiFetch(`/auth/addresses/${id}`, {
    method: "DELETE",
    token: getToken(),
  });
}

// Marca una dirección como predeterminada (desactiva el resto)
export async function setDefaultAddress(id: string): Promise<Address[]> {
  const res = await apiFetch<Address[]>(`/auth/addresses/${id}/default`, {
    method: "PATCH",
    token: getToken(),
  });
  return res.data;
}
