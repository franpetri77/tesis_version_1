// =============================================
// CLIENTE HTTP PARA EL BACKEND DE TELE IMPORT
// Envuelve fetch con manejo de errores, autenticación
// y la URL base del backend Express.
// =============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// -----------------------------------------------
// Tipos de respuesta de la API
// -----------------------------------------------
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total_count: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface ApiError {
  error: string;
}

// -----------------------------------------------
// Helper principal de fetch
// Soporta autenticación con Bearer token y manejo centralizado de errores
// -----------------------------------------------
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<ApiResponse<T>> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({ error: "Error desconocido" }))) as ApiError;
    throw new Error(errorBody.error ?? `Error ${response.status}`);
  }

  return response.json() as Promise<ApiResponse<T>>;
}

// -----------------------------------------------
// Métodos de conveniencia
// -----------------------------------------------
export const apiGet = <T>(path: string, token?: string) =>
  apiFetch<T>(path, { method: "GET", token });

export const apiPost = <T>(path: string, body: unknown, token?: string) =>
  apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
