"use client";

// =============================================
// BOTÓN: CONSULTAR POR ESTE PRODUCTO (T9)
// Abre el chat de la tienda con el producto adjunto al próximo mensaje.
// Al personal no se le muestra: responde desde el panel.
// =============================================

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";

export function AskAboutProduct({ product }: { product: { id: string; name: string; price: number } }) {
  const role = useAuthStore((s) => (s.isAuthenticated ? s.user?.role : null));
  const openChat = useChatStore((s) => s.openChat);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || (role && role !== "customer")) return null;

  return (
    <button
      type="button"
      onClick={() => openChat({ id: product.id, name: product.name, price: Number(product.price) })}
      className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 rounded-md"
    >
      <MessageCircle className="h-4 w-4" aria-hidden />
      ¿Tenés una duda? Consultanos por este producto
    </button>
  );
}
