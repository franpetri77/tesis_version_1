import type { Metadata } from "next";
import Link from "next/link";
import { Clock3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Pago pendiente",
  robots: { index: false, follow: false },
};

export default function CheckoutPendingPage() {
  return (
    <div className="min-h-[calc(100svh-6rem)] bg-paper-50">
      <div className="container-main py-16 sm:py-20">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <Clock3 className="mb-6 h-10 w-10 text-slate-600" strokeWidth={1.5} aria-hidden="true" />
          <h1 className="titulo-display mb-4 text-3xl sm:text-4xl">Tu pago está pendiente</h1>
          <p className="text-sm leading-relaxed text-slate-600">
            Mercado Pago todavía no confirmó el pago. Podés consultar el estado de tu pedido en Mis pedidos.
          </p>

          <div className="my-8 w-full border-y border-paper-300 py-5 text-left">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">¿Qué sigue?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Esperá la confirmación antes de intentar otro pago. Si el pedido se cancela, lo vas a ver en Mis pedidos.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Link href="/perfil/pedidos" className="flex-1 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50">
              Ver mis pedidos
            </Link>
            <Link href="/" className="flex-1 rounded-lg border border-paper-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-paper-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
