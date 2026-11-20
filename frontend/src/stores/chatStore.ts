// =============================================
// STORE: CHAT DE LA TIENDA (T9 / T10)
// Si el panel del chat está abierto, qué vista muestra (asistente de
// preguntas frecuentes o conversación con una persona) y qué producto se
// adjunta al próximo mensaje (botón "Consultar por este producto").
// =============================================

import { create } from "zustand";

export interface ChatAttachment { id: string; name: string; price: number }
export type ChatMode = "bot" | "human";

interface ChatState {
  open: boolean;
  mode: ChatMode;
  attachment: ChatAttachment | null;
  /**
   * Abre el panel. Con un producto adjunto va directo a la conversación con
   * una persona; si no, a la vista indicada (por defecto, el asistente).
   */
  openChat: (attachment?: ChatAttachment | null, mode?: ChatMode) => void;
  setMode: (mode: ChatMode) => void;
  closeChat: () => void;
  clearAttachment: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  open: false,
  mode: "bot",
  attachment: null,
  openChat: (attachment, mode) => set((s) => {
    const nextAttachment = attachment === undefined ? s.attachment : attachment;
    return { open: true, attachment: nextAttachment, mode: attachment ? "human" : mode ?? "bot" };
  }),
  setMode: (mode) => set({ mode }),
  closeChat: () => set({ open: false }),
  clearAttachment: () => set({ attachment: null }),
}));
