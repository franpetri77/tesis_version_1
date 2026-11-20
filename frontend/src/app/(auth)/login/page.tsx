"use client";

// =============================================
// PÁGINA: LOGIN
// Contenedor de página del formulario compartido de ingreso.
// Tras el login vuelve a ?redirect= (si es una ruta interna)
// o al inicio, y abre el modal de bienvenida.
// =============================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useModalStore } from "@/stores/modalStore";
import { LoginForm } from "@/components/auth/AuthForms";

/** Solo rutas internas: evita redirecciones abiertas a otros sitios. */
function safeRedirect(): string {
  const target = new URLSearchParams(window.location.search).get("redirect");
  return target && target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const openModal = useModalStore((s) => s.openModal);

  return (
    <div className="w-full max-w-sm animate-fade-in motion-reduce:animate-none">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="titulo-display text-[1.75rem]">
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
        <LoginForm
          onSuccess={(me) => {
            const target = safeRedirect();
            router.push(target);
            if (target === "/") openModal("login-success", { firstName: me.first_name });
          }}
          forgotAction={
            <button
              type="button"
              onClick={() => openModal("auth", { authTab: "forgot" })}
              className="text-xs text-brand-600 hover:text-brand-700 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          }
        />
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
