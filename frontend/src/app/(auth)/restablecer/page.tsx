// =============================================
// PÁGINA: RESTABLECER CONTRASEÑA
// Se accede desde el enlace del email: /restablecer?token=...
// Componente server que extrae el token y delega en el form client.
// =============================================

import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

interface PageProps {
  searchParams: { token?: string };
}

export default function ResetPasswordPage({ searchParams }: PageProps) {
  const token = searchParams.token ?? "";

  if (!token) {
    return (
      <div className="w-full max-w-sm animate-fade-in text-center">
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1.5">Enlace inválido</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Falta el token de recuperación. Solicitá un nuevo enlace desde la pantalla de inicio de
            sesión.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nueva contraseña</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Elegí una contraseña nueva para tu cuenta.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-7">
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
