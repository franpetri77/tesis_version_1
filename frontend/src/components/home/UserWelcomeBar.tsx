"use client";

// =============================================
// COMPONENTE: USER WELCOME BAR
// Sección personalizada en la home page.
// - Visitantes: bienvenida + CTA registro/login
// - Autenticados: saludo personalizado + accesos rápidos
// =============================================

import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { ShoppingBag, ArrowRight, ShoppingCart, User } from "lucide-react";

export function UserWelcomeBar() {
  const { user, isAuthenticated } = useAuthStore();

  /* ── Usuario autenticado ── */
  if (isAuthenticated && user) {
    return (
      <div className="bg-brand-50 border-b border-brand-100/60">
        <div className="container-main py-3.5">
          <div className="flex items-center justify-between gap-4 flex-wrap">

            {/* Saludo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-sm font-bold leading-none">
                  {user.first_name?.[0]?.toUpperCase() ?? "U"}
                </span>
              </div>
              <div>
                <p className="text-[14px] font-bold text-slate-900 leading-tight">
                  ¡Bienvenido/a de vuelta, {user.first_name}!
                </p>
                <p className="text-[11.5px] text-slate-500 mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Accesos rápidos */}
            <div className="flex items-center gap-2">
              <Link
                href="/perfil/pedidos"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                           bg-white border border-brand-200/80 text-brand-700
                           text-[12.5px] font-semibold
                           hover:bg-brand-600 hover:text-white hover:border-brand-600
                           transition-all duration-200 shadow-sm"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Mis pedidos
              </Link>
              <Link
                href="/carrito"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                           bg-brand-600 text-white
                           text-[12.5px] font-semibold
                           hover:bg-brand-700 transition-colors shadow-sm"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Mi carrito
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Visitante no autenticado ── */
  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#0d1b3e] border-b border-slate-800">
      {/* Resplandor decorativo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ position: "relative" }}
      >
        <div className="absolute right-0 top-0 w-64 h-full opacity-[0.06]"
          style={{ background: "radial-gradient(ellipse at right center, #3b82f6 0%, transparent 70%)" }}
        />
      </div>

      <div className="container-main py-5 relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

          {/* Propuesta de valor */}
          <div>
            <p className="text-[15px] font-bold text-white leading-tight">
              Bienvenido/a a Tele Import S.A.
            </p>
            <p className="text-[13px] text-slate-400 mt-1 max-w-sm leading-snug">
              Insumos electrónicos y de computación con envío a todo el país.
              Calidad garantizada con factura oficial.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl
                         border border-slate-700 text-slate-300
                         text-[13px] font-semibold
                         hover:bg-slate-800 hover:text-white hover:border-slate-600
                         transition-all"
            >
              <User className="w-3.5 h-3.5" />
              Ingresar
            </Link>
            <Link
              href="/registro"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl
                         bg-brand-600 hover:bg-brand-500 text-white
                         text-[13px] font-semibold
                         transition-all shadow-sm shadow-brand-600/30
                         hover:shadow-brand-500/40"
            >
              Crear cuenta gratis
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
