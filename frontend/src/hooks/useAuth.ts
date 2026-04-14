"use client";

// =============================================
// HOOK: useAuth
// Centraliza la lógica de autenticación:
// login, logout, y verificación del estado de sesión.
// Usa el backend Express + JWT (sin Directus).
// =============================================

import { useRouter } from "next/navigation";
import { login, getMe } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useModalStore } from "@/stores/modalStore";

const TOKEN_KEY = "tele_import_token";

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, setUser, clearUser, setLoading } = useAuthStore();
  const openModal = useModalStore((s) => s.openModal);

  /**
   * Inicia sesión con email y contraseña.
   * Guarda el token JWT en localStorage y el perfil en el store.
   */
  async function signIn(email: string, password: string): Promise<void> {
    setLoading(true);
    try {
      const { user: me, access_token } = await login(email, password);
      localStorage.setItem(TOKEN_KEY, access_token);
      setUser(me);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Cierra la sesión del usuario y limpia el store.
   */
  async function signOut(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
    clearUser();
    router.push("/");
  }

  /**
   * Verifica si hay una sesión activa al cargar la app.
   * Si el token expiró y había un usuario autenticado, muestra el modal.
   */
  async function checkSession(): Promise<void> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      clearUser();
      return;
    }
    try {
      const me = await getMe(token);
      setUser(me);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      // Solo mostramos el modal si había un usuario activo (sesión que expiró)
      const wasAuthenticated = useAuthStore.getState().isAuthenticated;
      clearUser();
      if (wasAuthenticated) {
        openModal("session-expired");
      }
    }
  }

  return {
    user,
    isAuthenticated,
    isAdmin: user?.role === "admin",
    signIn,
    signOut,
    checkSession,
  };
}
