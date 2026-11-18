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

// Encabezado Authorization para las rutas /reports, que exigen rol admin.
function authHeaders(): HeadersInit {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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

export interface MostVisitedProduct {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  category_name: string | null;
  view_count: number;
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
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reports/top-products?limit=${limit}`,
    { headers: authHeaders() }
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
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reports/worst-products?limit=${limit}`,
    { headers: authHeaders() }
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
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reports/metrics`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error("Error al obtener métricas");
  const data = await res.json() as { data: AdminMetrics };
  return data.data;
}

// -----------------------------------------------
// R02 — Tendencias de compra
// -----------------------------------------------
export type TrendGroup = "day" | "week" | "month";

export interface TrendPeriod {
  start: string;
  end: string;
  label: string;
  partial: boolean;
  open: boolean;
  units: number;
  refunded_units: number;
  variation_pct: number | null;
}

export interface TrendBreakdownItem {
  id: string;
  name: string;
  units_current: number;
  units_previous: number;
  variation_pct: number | null;
}

export interface SalesTrend {
  period: { from: string; to: string; group: TrendGroup };
  as_of: { date: string; timezone: string };
  breakdown_by: "category" | "product";
  series: TrendPeriod[];
  comparison: { current: { start: string; end: string }; previous: { start: string; end: string } } | null;
  breakdown: TrendBreakdownItem[];
  notes: string[];
}

export async function getSalesTrend(params: {
  from: string;
  to: string;
  group: TrendGroup;
  by: "category" | "product";
  categoryId?: string;
}): Promise<SalesTrend> {
  const qs = new URLSearchParams({ from: params.from, to: params.to, group: params.group, by: params.by });
  if (params.categoryId) qs.set("category_id", params.categoryId);
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reports/sales-trend?${qs}`,
    { headers: authHeaders(), cache: "no-store" }
  );
  const body = (await res.json().catch(() => ({}))) as SalesTrend & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "No se pudo obtener el reporte de tendencias");
  return body;
}

// -----------------------------------------------
// T3 — Detalle y estados del pedido
// -----------------------------------------------
export interface AdminOrderDetail {
  id: string;
  order_number: string;
  status: string;
  status_label: string;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  delivery_method: "pickup" | "shipping";
  shipping_address: Record<string, string> | null;
  notes: string | null;
  created_at: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  user_phone: string | null;
  items: Array<{ id: string; product_name: string | null; sku: string | null; quantity: number; unit_price: number; total_price: number }>;
  payments: Array<{ id: string; mp_payment_id: string | null; status: string; amount: number | null; created_at: string }>;
  history: Array<{ id: string; from: string | null; to: string | null; note: string | null; by: string | null; at: string }>;
  allowed_transitions: Array<{ status: string; label: string }>;
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/admin/orders/${encodeURIComponent(id)}`, {
    headers: authHeaders(), cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { data?: AdminOrderDetail; error?: string };
  if (!res.ok || !body.data) throw new Error(body.error ?? "No se pudo obtener el pedido");
  return body.data;
}

export async function updateOrderStatus(id: string, status: string, note?: string): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/admin/orders/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status, note: note?.trim() || null }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "No se pudo cambiar el estado");
  }
}

/**
 * Productos más visitados (por visitas al detalle de producto)
 */
export async function getMostVisitedProducts(
  limit = 10,
  from?: string,
  to?: string
): Promise<MostVisitedProduct[]> {
  const token = getAdminToken();
  const params = new URLSearchParams({ limit: String(limit) });
  if (from) params.set("from", from);
  if (to)   params.set("to", to);
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reports/most-visited-products?${params}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!res.ok) throw new Error("Error al obtener productos más visitados");
  const data = await res.json() as { data: MostVisitedProduct[] };
  return data.data;
}

/**
 * Lista de pedidos con datos de usuario
 */
export async function getOrders(limit = 50): Promise<OrderReport[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reports/orders?limit=${limit}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error("Error al obtener pedidos");
  const data = await res.json() as { data: OrderReport[] };
  return data.data;
}
