// =============================================
// API ROUTE: VALIDAR CUPÓN DE DESCUENTO
// Proxy al backend Express+SQLite.
//
// POST /api/pagos/validar-cupon
// Body: { code: string, subtotal: number }
// =============================================

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const validateSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().nonnegative(),
});

export async function POST(request: NextRequest) {
  try {
    const body = validateSchema.parse(await request.json());

    // Delegar la validación al backend Express
    const res = await fetch(`${API_URL}/payments/validate-coupon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ valid: false, error: "Datos inválidos" }, { status: 400 });
    }
    console.error("[API/validar-cupon] Error:", error);
    return NextResponse.json({ valid: false, error: "Error interno" }, { status: 500 });
  }
}
