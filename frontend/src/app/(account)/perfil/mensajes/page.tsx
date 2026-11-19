"use client";

// =============================================
// PÁGINA: MIS MENSAJES (T9)
// La conversación del cliente con la tienda, a página completa.
// El mismo hilo que el botón de chat de la tienda.
// =============================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { CustomerChat } from "@/components/chat/CustomerChat";

export default function MensajesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !isAuthenticated) router.push("/login"); }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated || !user) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Mensajes</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Tu conversación con Tele Import. Te avisamos en la campana y por correo cuando respondemos.
        </p>
      </div>
      {user.role === "customer" ? (
        <div className="flex h-[min(36rem,calc(100vh-14rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <CustomerChat userId={user.id} active className="flex-1" autoFocus />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600">
          Las consultas de los clientes se responden desde el panel.{" "}
          <Link href="/admin/mensajes" className="font-semibold text-brand-600 hover:underline">Ir a Mensajes del panel</Link>
        </div>
      )}
    </div>
  );
}
