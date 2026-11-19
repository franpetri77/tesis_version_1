// =============================================
// STORE: CHAT DE LA TIENDA (T9)
// Si el panel del chat está abierto y qué producto se adjunta al próximo
// mensaje (botón "Consultar por este producto" de la ficha).
// =============================================

import { create } from "zustand";

export interface ChatAttachment { id: string; name: string; price: number }

interface ChatState {
  open: boolean;
  attachment: ChatAttachment | null;
  openChat: (attachment?: ChatAttachment | null) => void;
  closeChat: () => void;
  clearAttachment: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  open: false,
  attachment: null,
  openChat: (attachment) => set((s) => ({ open: true, attachment: attachment === undefined ? s.attachment : attachment })),
  closeChat: () => set({ open: false }),
  clearAttachment: () => set({ attachment: null }),
}));
