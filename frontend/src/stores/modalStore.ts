// =============================================
// STORE: MODAL SYSTEM
// Controla qué modal está abierto y su payload.
// Todos los modales de auth se manejan desde aquí.
// =============================================

import { create } from "zustand";

export type ModalType =
  | "auth"
  | "login-success"
  | "logout-confirm"
  | "logout-success"
  | "register-success"
  | "session-expired"
  | null;

interface ModalPayload {
  firstName?: string;
  email?: string;
  /**
   * Paso inicial del modal de autenticación. "intro" muestra primero el
   * aviso "Todavía no iniciaste sesión" con las opciones de ingresar o registrarse.
   */
  authTab?: "intro" | "login" | "register" | "forgot";
  /** Ruta interna a la que seguir al ingresar o registrarse (p. ej. /checkout) */
  redirectTo?: string;
}

interface ModalState {
  activeModal: ModalType;
  payload: ModalPayload;

  openModal: (modal: ModalType, payload?: ModalPayload) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>()((set) => ({
  activeModal: null,
  payload: {},

  openModal: (modal, payload = {}) =>
    set({ activeModal: modal, payload }),

  closeModal: () =>
    set({ activeModal: null, payload: {} }),
}));
