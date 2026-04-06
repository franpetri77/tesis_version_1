// =============================================
// API ROUTE: CREAR PREFERENCIA DE PAGO
// Endpoint interno de Next.js que orquesta el proceso de compra:
//   1. Valida datos del checkout
//   2. Lee el token JWT del header Authorization
//   3. Delega la creación del pedido al backend Express
//   4. Devuelve la URL de checkout de Mercado Pago al cliente
//
// POST /api/pagos/preferencia
// =============================================

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Schema de validación del body del checkout
const checkoutSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string(),
      quantity: z.number().int().positive(),
      unit_price: z.number().positive(),
      product: z.object({
        name: z.string(),
        sku: z.string(),
      }),
    })
  ).min(1),
  delivery_method: z.enum(["pickup", "shipping"]),
  shipping_address: z
    .object({
      street: z.string(),
      number: z.string(),
      floor: z.string().optional(),
      apartment: z.string().optional(),
      city: z.string(),
      province: z.string(),
      postal_code: z.string(),
      country: z.string(),
    })
    .nullable(),
  coupon_code: z.string().optional(),
  subtotal: z.number().nonnegative(),
  discount_amount: z.number().nonnegative(),
  shipping_cost: z.number().nonnegative(),
  total: z.number().positive(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Obtener el token JWT del cliente
    const authHeader = request.headers.get("authorization") ?? "";

    // Verificar autenticación con el backend
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: authHeader },
    });

    if (!meRes.ok) {
      return NextResponse.json(
        { error: "Debés iniciar sesión para completar la compra" },
        { status: 401 }
      );
    }

    // Validar el body del checkout
    const body = checkoutSchema.parse(await request.json());

    // Delegar la creación del pedido y pago al backend Express
    let orderRes: Response;
    try {
      orderRes = await fetch(`${API_URL}/payments/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      });
    } catch {
      return NextResponse.json(
        { error: "No se pudo conectar con el servicio de pagos. Verificá que el backend esté activo." },
        { status: 503 }
      );
    }

    const data = await orderRes.json() as {
      order_id?: string;
      order_number?: string;
      init_point?: string;
      sandbox_init_point?: string;
      error?: string;
    };

    if (!orderRes.ok) {
      return NextResponse.json(
        { error: data.error ?? "Error al procesar el pago" },
        { status: orderRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos del checkout inválidos", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[API/pagos/preferencia] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
