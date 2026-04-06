// =============================================
// API ADMIN - TELE IMPORT S.A.
// Funciones para interactuar con las rutas protegidas
// del backend que requieren token JWT con rol 'admin'.
// =============================================

import { apiFetch } from "./client";
import type { User, Product } from "@/types";

// -----------------------------------------------
// Obtener el token JWT del localStorage
// Solo se ejecuta en el cliente
// -----------------------------------------------
export function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("tele_import_token") ?? "";
}

// -----------------------------------------------
// Tipos de respuesta específicos de admin
// -----------------------------------------------
export interface AdminMetrics {
  total_orders: number;
  total_revenue: number;
  total_products: number;
  total_users: number;
  orders_today: number;
  low_stock_count: number;
  out_of_stock_count: number;
  orders_by_status: Record<string, number>;
}

export interface SalesMetrics {
  period: { from: string; to: string };
  metrics: {
    total_revenue: number;
    total_orders: number;
    average_order_value: number;
  };
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  category_name: string | null;
  total_sold: number;
  total_revenue: number;
}

export interface OrderReport {
  id: string;
  order_number: string;
  status: string;
  total: number;
  delivery_method: string;
  created_at: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
}

export interface ProductInput {
  name: string;
  slug?: string;
  sku: string;
  price: number;
  compare_price?: number;
  category_id: string;
  stock_quantity?: number;
  brand?: string;
  model?: string;
  description?: string;
  short_description?: string;
  is_featured?: boolean;
  is_active?: boolean;
  images?: Array<{ url: string; alt?: string }>;
}

// =============================================
// FUNCIONES DE USUARIOS
// =============================================

/**
 * Obtiene todos los usuarios del sistema sin contraseña
 */
export async function getAdminUsers(): Promise<User[]> {
  const token = getAdminToken();
  const res = await apiFetch<User[]>("/admin/users", { token });
  return res.data;
}

/**
 * Actualiza el rol de un usuario
 */
export async function updateUserRole(
  id: string,
  role: "admin" | "customer" | "readonly"
): Promise<User> {
  const token = getAdminToken();
  const res = await apiFetch<User>(`/admin/users/${id}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
    token,
  });
  return res.data;
}

/**
 * Elimina un usuario por ID
 */
export async function deleteUser(id: string): Promise<void> {
  const token = getAdminToken();
  await apiFetch(`/admin/users/${id}`, { method: "DELETE", token });
}

// =============================================
// FUNCIONES DE PRODUCTOS
// =============================================

/**
 * Obtiene un producto por ID (con imágenes)
 */
export async function getAdminProduct(id: string): Promise<Product> {
  const token = getAdminToken();
  const res = await apiFetch<Product>(`/admin/products/${id}`, { token });
  return res.data;
}

/**
 * Crea un nuevo producto
 */
export async function createProduct(data: ProductInput): Promise<Product> {
  const token = getAdminToken();
  const res = await apiFetch<Product>("/admin/products", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
  return res.data;
}

/**
 * Actualiza un producto existente
 */
export async function updateProduct(
  id: string,
  data: Partial<ProductInput>
): Promise<Product> {
  const token = getAdminToken();
  const res = await apiFetch<Product>(`/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    token,
  });
  return res.data;
}

/**
 * Activa o desactiva un producto (toggle is_active)
 */
export async function toggleProduct(id: string): Promise<{ id: string; is_active: boolean }> {
  const token = getAdminToken();
  const res = await apiFetch<{ id: string; is_active: boolean }>(
    `/admin/products/${id}/toggle`,
    { method: "PATCH", token }
  );
  return res.data;
}

/**
 * Elimina un producto por ID
 */
export async function deleteProduct(id: string): Promise<void> {
  const token = getAdminToken();
  await apiFetch(`/admin/products/${id}`, { method: "DELETE", token });
}

// =============================================
// FUNCIONES DE REPORTES
// =============================================

/**
 * Reporte de ventas por período
 */
export async function getSalesReport(from: string, to: string): Promise<SalesMetrics> {
  const token = getAdminToken();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reports/sales?from=${from}&to=${to}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  if (!res.ok) throw new Error("Error al obtener el reporte de ventas");
  return res.json() as Promise<SalesMetrics>;
}

/**
 * Top de productos más vendidos
 */
export async function getTopProducts(limit = 10): Promise<TopProduct[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reports/top-products?limit=${limit}`
  );
  if (!res.ok) throw new Error("Error al obtener top productos");
  const data = await res.json() as { top_products: TopProduct[] };
  return data.top_products;
}

/**
 * Productos menos vendidos (peores)
 */
export async function getWorstProducts(limit = 10): Promise<TopProduct[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reports/worst-products?limit=${limit}`
  );
  if (!res.ok) throw new Error("Error al obtener worst productos");
  const data = await res.json() as { worst_products: TopProduct[] };
  return data.worst_products;
}

/**
 * Métricas globales del dashboard
 */
export async function getMetrics(): Promise<AdminMetrics> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reports/metrics`
  );
  if (!res.ok) throw new Error("Error al obtener métricas");
  const data = await res.json() as { data: AdminMetrics };
  return data.data;
}

/**
 * Lista de pedidos con datos de usuario
 */
export async function getOrders(limit = 50): Promise<OrderReport[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reports/orders?limit=${limit}`
  );
  if (!res.ok) throw new Error("Error al obtener pedidos");
  const data = await res.json() as { data: OrderReport[] };
  return data.data;
}
