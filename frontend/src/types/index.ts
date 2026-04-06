// =============================================
// TIPOS DE DOMINIO - TELE IMPORT S.A.
// Estos tipos reflejan las entidades del sistema
// y mapean con la API REST del backend (SQLite).
// =============================================

// -----------------------------------------------
// USUARIOS Y AUTENTICACIÓN
// -----------------------------------------------

export type UserRole = "admin" | "customer" | "readonly";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires: number;
}

// -----------------------------------------------
// CATEGORÍAS
// -----------------------------------------------

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;        // URL directa de la imagen (sin Directus)
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
}

// -----------------------------------------------
// PRODUCTOS
// -----------------------------------------------

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  sku: string;
  price: number;
  compare_price?: number;       // Precio antes del descuento (para mostrar tachado)
  category_id: string;
  category_name?: string;       // Nombre de la categoría (JOIN desde la API)
  category_slug?: string;       // Slug de la categoría (JOIN desde la API)
  images: ProductImage[];
  tags: ProductTag[];
  brand?: string;               // Marca del producto
  model?: string;               // Modelo del producto
  stock_quantity: number;       // Stock disponible
  is_active: boolean;
  is_featured: boolean;
  weight?: number;              // En gramos, para cálculo de envío
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;         // URL directa de la imagen (sin Directus)
  sort_order: number;
  alt_text?: string;
}

export interface ProductTag {
  id: string;
  name: string;
  slug: string;
}

// -----------------------------------------------
// STOCK
// -----------------------------------------------

export type StockMovementType = "ingreso" | "egreso" | "ajuste" | "venta" | "devolucion";

export interface StockMovement {
  id: string;
  product_id: string | Product;
  type: StockMovementType;
  quantity: number;         // Positivo = ingreso, Negativo = egreso
  previous_quantity: number;
  new_quantity: number;
  reason?: string;
  reference_id?: string;   // ID de pedido si aplica
  user_id: string | User;
  created_at: string;
}

// -----------------------------------------------
// CARRITO (estado cliente, guardado en Zustand)
// -----------------------------------------------

export interface CartItem {
  product_id: string;
  product: Pick<Product, "id" | "name" | "slug" | "price" | "images" | "sku" | "stock_quantity" | "brand">;
  quantity: number;
  unit_price: number;
}

export interface Cart {
  items: CartItem[];
  coupon_code?: string;
  discount_amount: number;
}

// -----------------------------------------------
// DIRECCIONES
// -----------------------------------------------

export interface Address {
  id: string;
  user_id: string;
  street: string;
  number: string;
  floor?: string;
  apartment?: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

// -----------------------------------------------
// PEDIDOS
// -----------------------------------------------

export type OrderStatus =
  | "pending"          // Esperando pago
  | "paid"             // Pago confirmado
  | "processing"       // En preparación
  | "ready_to_ship"    // Listo para envío/retiro
  | "shipped"          // Enviado
  | "delivered"        // Entregado
  | "cancelled"        // Cancelado
  | "refunded";        // Reembolsado

export type DeliveryMethod = "pickup" | "shipping";

export interface Order {
  id: string;
  order_number: string;    // Número legible: TI-2024-00001
  user_id: string | User;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  delivery_method: DeliveryMethod;
  shipping_address?: Address;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// -----------------------------------------------
// PAGOS
// -----------------------------------------------

export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled" | "refunded";

export interface Payment {
  id: string;
  order_id: string | Order;
  mp_payment_id?: string;       // ID del pago en Mercado Pago
  mp_preference_id?: string;    // ID de preferencia de MP
  status: PaymentStatus;
  amount: number;
  currency: string;
  payment_method?: string;
  raw_response?: Record<string, unknown>; // Respuesta cruda de MP para auditoría
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------
// PROMOCIONES Y DESCUENTOS
// -----------------------------------------------

export type PromotionType = "percentage" | "fixed_amount" | "free_shipping";

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: PromotionType;
  value: number;
  min_order_amount?: number;
  max_uses?: number;
  current_uses: number;
  is_active: boolean;
  valid_from: string;
  valid_until?: string;
}

// -----------------------------------------------
// RESEÑAS Y COMENTARIOS
// -----------------------------------------------

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string | User;
  rating: number;             // 1 a 5
  title?: string;
  body: string;
  is_approved: boolean;
  created_at: string;
}

// -----------------------------------------------
// AUDITORÍA
// -----------------------------------------------

export type AuditAction =
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "stock.ingreso"
  | "stock.egreso"
  | "stock.ajuste"
  | "order.created"
  | "order.status_changed"
  | "user.created"
  | "user.updated"
  | "promotion.created"
  | "promotion.applied"
  | "payment.approved"
  | "payment.rejected";

export interface AuditLog {
  id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  user_id?: string | User;
  previous_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

// -----------------------------------------------
// NOTIFICACIONES
// -----------------------------------------------

export type NotificationType = "order_new" | "order_status" | "stock_low" | "review_new";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

// -----------------------------------------------
// RESPUESTAS PAGINADAS DE LA API
// -----------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total_count: number;
    filter_count: number;
  };
}

// -----------------------------------------------
// FILTROS DE CATÁLOGO
// -----------------------------------------------

export interface CatalogFilters {
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  tags?: string[];
  sort?: "price_asc" | "price_desc" | "name_asc" | "newest";
  page?: number;
  limit?: number;
  featured?: boolean;
}
