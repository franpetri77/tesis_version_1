// =============================================
// CLIENTE DE AUTENTICACIÓN
// Funciones para login, registro y obtención del perfil
// usando el backend Express + JWT.
// =============================================

import { apiGet, apiPost } from "./client";
import type { User, AuthTokens } from "@/types";

interface LoginResponse {
  user: User;
  access_token: string;
}

/**
 * Inicia sesión con email y contraseña.
 * Devuelve el usuario y el token JWT.
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiPost<LoginResponse>("/auth/login", { email, password });
  return res.data;
}

/**
 * Registra un nuevo cliente.
 */
export async function register(data: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}): Promise<LoginResponse> {
  const res = await apiPost<LoginResponse>("/auth/register", data);
  return res.data;
}

/**
 * Obtiene los datos del usuario autenticado usando el token JWT.
 */
export async function getMe(token: string): Promise<User> {
  const res = await apiGet<User>("/auth/me", token);
  return res.data;
}

/**
 * Solicita el email de recuperación de contraseña.
 * Responde igual exista o no la cuenta (no revela emails registrados).
 */
export async function forgotPassword(email: string): Promise<void> {
  await apiPost("/auth/forgot-password", { email });
}

/**
 * Restablece la contraseña usando el token recibido por email.
 */
export async function resetPassword(token: string, password: string): Promise<void> {
  await apiPost("/auth/reset-password", { token, password });
}

/**
 * Reenvía el email de verificación de cuenta.
 */
export async function resendVerification(email: string): Promise<void> {
  await apiPost("/auth/resend-verification", { email });
}
