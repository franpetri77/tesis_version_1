"use client";

// =============================================
// COMPONENTE: CHAT DEL CLIENTE (T9)
// Conversación del cliente con la tienda. Se usa en el panel flotante y
// en /perfil/mensajes. Adjunta el producto elegido en la ficha, si hay uno.
// =============================================

import { useMemo } from "react";
import { MessageCircle } from "lucide-react";
import { chatApi } from "@/lib/api/chat";
import { useChatThread } from "@/hooks/useChatThread";
import { useChatStore } from "@/stores/chatStore";
import { ChatThread } from "./ChatThread";

export function CustomerChat({ userId, active, className, autoFocus }: { userId: string; active: boolean; className?: string; autoFocus?: boolean }) {
  const attachment = useChatStore((s) => s.attachment);
  const clearAttachment = useChatStore((s) => s.clearAttachment);
  const source = useMemo(() => ({
    key: `customer:${userId}`,
    load: chatApi.thread,
    send: chatApi.send,
    read: chatApi.read,
    canMarkRead: true,
  }), [userId]);
  const t = useChatThread(source, active);

  async function onSend(body: string) {
    const ok = await t.send(body, attachment?.id ?? null);
    if (ok) clearAttachment();
    return ok;
  }

  return (
    <ChatThread
      viewer="customer"
      className={className}
      messages={t.messages}
      conversation={t.conversation}
      loading={t.loading}
      error={t.error}
      hasMore={t.hasMore}
      onLoadOlder={t.loadOlder}
      onSend={onSend}
      onRetry={t.initFailed ? () => void t.retry() : undefined}
      sending={t.sending}
      sendError={t.sendError}
      canWrite
      autoFocus={autoFocus}
      attachment={attachment ? { product: attachment, onRemove: clearAttachment } : null}
      placeholder={attachment ? "¿Qué querés saber del producto?" : "Escribí tu consulta"}
      empty={
        <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <MessageCircle className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-slate-900">¿En qué te podemos ayudar?</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Consultanos por stock, envíos, garantía o tu pedido. Te respondemos por acá y te avisamos en la campana y por correo.
          </p>
        </div>
      }
    />
  );
}
