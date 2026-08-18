"use client";

// =============================================
// FORM: RESTABLECER CONTRASEÑA
// Recibe el token del email y setea una nueva contraseña.
// Misma política de validación que registro (letra + número, 8–72).
// =============================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { resetPassword } from "@/lib/api/auth";
import { useModalStore } from "@/stores/modalStore";

function isPasswordValid(pw: string): boolean {
  return pw.length >= 8 && pw.length <= 72 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const openModal = useModalStore((s) => s.openModal);

  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState("");
  const [done, setDone]               = useState(false);
  const [isLoading, setIsLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isPasswordValid(password)) {
      setError("La contraseña debe tener 8–72 caracteres, con al menos una letra y un número.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "No se pudo restablecer la contraseña. Solicitá un nuevo enlace."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Pantalla de éxito
  if (done) {
    return (
      <div className="text-center py-2">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">¡Contraseña actualizada!</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Ya podés iniciar sesión con tu nueva contraseña.
        </p>
        <Button
          variant="primary"
          fullWidth
          size="lg"
          className="mt-6 gap-2"
          onClick={() => { router.push("/"); openModal("auth", { authTab: "login" }); }}
        >
          Iniciar sesión
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Nueva contraseña */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">Nueva contraseña</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres, letra y número"
            autoComplete="new-password"
            autoFocus
            className="w-full rounded-lg border border-slate-200 hover:border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirmar */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">Confirmar contraseña</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repetí tu contraseña"
            autoComplete="new-password"
            className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
              confirm && password === confirm
                ? "border-emerald-400"
                : "border-slate-200 hover:border-slate-300"
            }`}
          />
          {confirm && password === confirm && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" variant="primary" fullWidth size="lg" isLoading={isLoading} className="mt-1 gap-2">
        {!isLoading && "Cambiar contraseña"}
        {!isLoading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </form>
  );
}
