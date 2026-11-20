// =============================================
// STORE DE AUTENTICACIÓN
// Gestiona el estado del usuario autenticado.
// El token JWT lo gestionan los flujos de acceso; aquí se guarda el perfil
// y se sincroniza el dueño del carrito en todos los cambios de sesión.
// =============================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { useCartStore } from "./cartStore";

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
        useCartStore.getState().syncOwner(user.id);
        set({ user, isAuthenticated: true, isLoading: false });
      },

      // Limpia el usuario del store tras logout
      clearUser: () => {
        useCartStore.getState().syncOwner(null);
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
      // La hidratación no llama a setUser: también hay que comprobar aquí
      // que el carrito persistido corresponda a la sesión restaurada.
      onRehydrateStorage: () => (state) => {
        const owner = state?.isAuthenticated ? state.user?.id ?? null : null;
        useCartStore.getState().syncOwner(owner);
      },
    }
  )
);
