"use client";

// =============================================
// PÁGINA: PAGO EXITOSO
// Se muestra cuando Mercado Pago redirige tras un pago aprobado.
// Mercado Pago agrega ?payment_id=...&order=... a la URL.
// =============================================

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const paymentId    = searchParams.get("payment_id");

  return (
    <div className="container-main py-16 flex flex-col items-center text-center max-w-md mx-auto animate-fade-in">
      {/* Ícono con acento verde */}
      <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />
      </div>

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
        ¡Pago recibido!
      </h1>
      <p className="text-slate-500 text-sm mb-1">
        Tu pedido fue confirmado y está siendo procesado.
      </p>
      {paymentId && (
        <p className="text-xs text-slate-400 mb-7">
          Ref. de pago:{" "}
          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{paymentId}</span>
        </p>
      )}

      {/* Card de próximos pasos */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 w-full mb-8 text-left">
        <p className="text-sm font-semibold text-emerald-800 mb-3">¿Qué sigue?</p>
        <ul className="space-y-2">
          {[
            "Recibirás un email con la confirmación del pedido",
            "El encargado recibirá una notificación para prepararlo",
            "Podés seguir el estado en \"Mis pedidos\"",
          ].map((text) => (
            <li key={text} className="flex items-start gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Link href="/perfil/pedidos" className="flex-1">
          <Button variant="primary" fullWidth className="gap-2">
            <ShoppingBag className="w-4 h-4" />
            Ver mis pedidos
          </Button>
        </Link>
        <Link href="/" className="flex-1">
          <Button variant="outline" fullWidth className="gap-2">
            Volver al inicio
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
