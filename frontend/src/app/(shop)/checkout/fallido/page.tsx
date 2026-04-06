"use client";

// =============================================
// PÁGINA: PAGO FALLIDO / CANCELADO
// Se muestra cuando MP redirige tras un pago rechazado o cancelado.
// No borra el carrito para que el usuario pueda reintentar.
// =============================================

import Link from "next/link";
import { XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

const FAILURE_REASONS = [
  "Fondos insuficientes en la tarjeta",
  "Datos de la tarjeta incorrectos",
  "Pago cancelado manualmente",
  "Problema temporal con el procesador de pagos",
];

export default function CheckoutFailedPage() {
  return (
    <div className="container-main py-16 flex flex-col items-center text-center max-w-md mx-auto animate-fade-in">
      {/* Ícono con acento rojo */}
      <div className="w-20 h-20 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mb-6">
        <XCircle className="w-10 h-10 text-red-500" strokeWidth={1.5} />
      </div>

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
        El pago no se completó
      </h1>
      <p className="text-slate-500 text-sm mb-7">
        El pago fue rechazado o cancelado. No se realizó ningún cargo.
        Tu carrito sigue guardado.
      </p>

      {/* Card de posibles causas */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 w-full mb-8 text-left">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800">Posibles causas:</p>
        </div>
        <ul className="space-y-2">
          {FAILURE_REASONS.map((reason) => (
            <li key={reason} className="text-sm text-amber-700 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Link href="/checkout" className="flex-1">
          <Button variant="primary" fullWidth>
            Intentar de nuevo
          </Button>
        </Link>
        <Link href="/carrito" className="flex-1">
          <Button variant="outline" fullWidth className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver al carrito
          </Button>
        </Link>
      </div>
    </div>
  );
}
