// =============================================
// PÁGINA: RESULTADO DE VERIFICACIÓN DE EMAIL
// El backend redirige acá tras procesar el token:
//   /verificar-email?status=ok | invalid | error
// =============================================

import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

interface PageProps {
  searchParams: { status?: string };
}

export default function VerifyEmailPage({ searchParams }: PageProps) {
  const status = searchParams.status ?? "invalid";
  const ok = status === "ok";

  return (
    <div className="w-full max-w-sm animate-fade-in text-center">
      <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8">
        <div
          className={`mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center ${
            ok ? "bg-emerald-100" : "bg-red-100"
          }`}
        >
          {ok ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          ) : (
            <XCircle className="w-8 h-8 text-red-600" />
          )}
        </div>

        {ok ? (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-1.5">¡Cuenta verificada!</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Tu dirección de correo fue confirmada correctamente. Ya podés disfrutar de todas las
              funciones de tu cuenta.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-1.5">Enlace inválido o vencido</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              El enlace de verificación no es válido o ya expiró. Podés solicitar uno nuevo desde tu
              perfil o volviendo a iniciar sesión.
            </p>
          </>
        )}

        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 w-full py-2.5 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transicion-ui shadow-sm hover:shadow-md"
        >
          Ir al inicio
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
