"use client";

// =============================================
// COMPONENTE: USER WELCOME BAR
// Banda personalizada en la home, debajo del hero.
// - Autenticados: saludo con nombre y email
// - Visitantes: propuesta de valor de la tienda
// Los accesos rápidos (pedidos, carrito, login) viven en el header.
// =============================================

import { useAuthStore } from "@/stores/authStore";

export function UserWelcomeBar() {
  const { user, isAuthenticated } = useAuthStore();

  /* ── Usuario autenticado ── */
  if (isAuthenticated && user) {
    return (
      <div className="bg-brand-50 border-b border-brand-100/60">
        <div className="container-main py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white text-sm font-bold leading-none">
                {user.first_name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-slate-900 leading-tight">
                ¡Bienvenido/a de vuelta, {user.first_name}!
              </p>
              <p className="text-[11.5px] text-slate-500 mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Visitante no autenticado ── */
  return (
    <div className="bg-slate-900 border-b border-slate-800">
      <div className="container-main py-3.5">
        <p className="text-[13px] text-slate-400 leading-snug">
          <span className="text-white font-semibold">Tele Import S.A.</span>
          {" "}— Insumos electrónicos y de computación con envío a todo el país. Garantía oficial en todos los productos.
        </p>
      </div>
    </div>
  );
}
