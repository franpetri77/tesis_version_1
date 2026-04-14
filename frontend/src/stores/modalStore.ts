// =============================================
// STORE: MODAL SYSTEM
// Controla qué modal está abierto y su payload.
// Todos los modales de auth se manejan desde aquí.
// =============================================

import { create } from "zustand";

export type ModalType =
  | "login-success"
  | "logout-confirm"
  | "register-success"
  | "session-expired"
  | null;

interface ModalPayload {
  firstName?: string;
  email?: string;
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
