import { type NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const personal = params.get("scope") === "personal" || params.has("order_id");
  const authorization = request.headers.get("Authorization");
  if (personal && !authorization) {
    return NextResponse.json({ error: "Iniciá sesión para ver tus recomendaciones" }, { status: 401, headers });
  }

  const search = new URLSearchParams();
  for (const key of ["limit", personal ? "order_id" : "product_id"]) {
    for (const value of params.getAll(key)) search.append(key, value);
  }

  try {
    const endpoint = personal ? "/catalog/recommendations/personal" : "/catalog/recommendations";
    const response = await fetch(`${BACKEND_URL}${endpoint}?${search}`, {
      cache: "no-store",
      headers: personal && authorization ? { Authorization: authorization } : undefined,
      signal: request.signal,
    });
    if (!response.ok) {
      return NextResponse.json({ error: "No se pudieron obtener las recomendaciones" }, { status: response.status, headers });
    }
    const result = await response.json() as { data: unknown[]; matched: boolean };
    return NextResponse.json({ products: result.data, matched: result.matched }, { headers });
  } catch (error) {
    if (!request.signal.aborted) console.error("[API/recomendaciones] Error:", error);
    return NextResponse.json({ error: "Las recomendaciones no están disponibles" }, { status: 502, headers });
  }
}
