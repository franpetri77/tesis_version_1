"use client";

// =============================================
// PÁGINA: LOGIN
// Formulario de inicio de sesión.
// Tras el login, abre el modal de bienvenida.
// =============================================

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import { login } from "@/lib/api/auth";
import { useModalStore } from "@/stores/modalStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const openModal = useModalStore((s) => s.openModal);
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [isLoading, setIsLoading]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Hacemos el login directamente para obtener el nombre antes de redirigir
      const TOKEN_KEY = "tele_import_token";
      const { user: me, access_token } = await login(email, password);
      localStorage.setItem(TOKEN_KEY, access_token);
      setUser(me);

      // Redirigir y mostrar el modal de bienvenida
      router.push("/");
      openModal("login-success", { firstName: me.first_name });
    } catch {
      setError("Email o contraseña incorrectos. Verificá tus datos.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Bienvenido de nuevo
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          ¿No tenés cuenta?{" "}
          <Link
            href="/registro"
            className="text-brand-600 hover:text-brand-700 font-semibold transition-colors"
          >
            Registrate gratis
          </Link>
        </p>
      </div>

      {/* Card del formulario */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-7">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            autoComplete="email"
            autoFocus
          />

          {/* Contraseña con toggle de visibilidad */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <Link
                href="#"
                className="text-xs text-brand-600 hover:text-brand-700 transition-colors"
                tabIndex={-1}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-200 hover:border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error de autenticación */}
          {error && (
            <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            isLoading={isLoading}
            className="mt-1 gap-2"
          >
            {!isLoading && "Ingresar"}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      </div>

      {/* Volver al inicio */}
      <p className="mt-6 text-center text-xs text-slate-400">
        <Link href="/" className="hover:text-slate-600 transition-colors">
          ← Volver al inicio
        </Link>
      </p>
    </div>
  );
}
