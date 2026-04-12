// =============================================
// STORE DE AUTENTICACIÓN
// Gestiona el estado del usuario autenticado.
// El token real lo maneja Directus SDK con cookies,
// aquí solo guardamos el perfil del usuario para la UI.
// =============================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Acciones
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // Guarda el usuario en el store tras un login exitoso
      setUser: (user: User) => {
        set({ user, isAuthenticated: true, isLoading: false });
      },

      // Limpia el usuario del store tras logout
      clearUser: () => {
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: "tele-import-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
