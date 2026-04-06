// =============================================
// API ROUTE: RECOMENDACIONES DE PRODUCTOS
// Delega al backend Node.js (Express + SQLite).
//
// GET /api/recomendaciones?product_id=xxx&limit=4
// GET /api/recomendaciones?user_id=xxx&limit=4
// =============================================

import { type NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("product_id");
  const limit = Math.min(Number(searchParams.get("limit") ?? 4), 12);

  try {
    // Proxy al backend: productos destacados del catálogo como recomendaciones
    const url = productId
      ? `${BACKEND_URL}/catalog/products?limit=${limit}&sort=newest`
      : `${BACKEND_URL}/catalog/products/featured?limit=${limit}`;

    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return NextResponse.json({ products: [] });
    const data = await res.json() as { data: unknown[] };
    return NextResponse.json({ products: data.data ?? [] });
  } catch (error) {
    console.error("[API/recomendaciones] Error:", error);
    return NextResponse.json({ products: [] }, { status: 200 });
  }
}
