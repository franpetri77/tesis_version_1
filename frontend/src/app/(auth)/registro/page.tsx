"use client";

// =============================================
// PÁGINA: REGISTRO DE USUARIO
// Contenedor de página del formulario compartido de registro.
// Tras registrarse, vuelve al inicio con el modal de bienvenida.
// =============================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useModalStore } from "@/stores/modalStore";
import { RegisterForm } from "@/components/auth/AuthForms";

export default function RegisterPage() {
  const router    = useRouter();
  const openModal = useModalStore((s) => s.openModal);

  return (
    <div className="w-full max-w-sm animate-fade-in motion-reduce:animate-none">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="titulo-display text-[1.75rem]">
          Creá tu cuenta
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="text-brand-600 hover:text-brand-700 font-semibold transition-colors"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>

      {/* Card del formulario */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-7">
        <RegisterForm
          onSuccess={(me) => {
            router.push("/");
            openModal("register-success", { firstName: me.first_name, email: me.email });
          }}
          onEmailTaken={() => router.push("/login")}
        />
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Al registrarte aceptás nuestros{" "}
        <Link href="#" className="underline hover:text-slate-600 transition-colors">
          términos y condiciones
        </Link>
      </p>
    </div>
  );
}
