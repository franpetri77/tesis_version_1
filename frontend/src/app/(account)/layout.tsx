"use client";

// =============================================
// LAYOUT DE CUENTA DE USUARIO
// Envuelve las páginas de perfil y mis pedidos.
// Incluye sidebar de navegación con estado activo.
// =============================================

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { User, ShoppingBag, MapPin, LogOut, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils/cn";

const accountNavLinks = [
  { href: "/perfil",              label: "Mi perfil",   icon: User,        exact: true  },
  { href: "/perfil/pedidos",      label: "Mis pedidos", icon: ShoppingBag, exact: false },
  { href: "/perfil/direcciones",  label: "Direcciones", icon: MapPin,      exact: false },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname   = usePathname();
  const router     = useRouter();
  const { user, clearUser } = useAuthStore();

  async function handleLogout() {
    localStorage.removeItem("tele_import_token");
    clearUser();
    router.push("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 bg-slate-50">
        <div className="container-main py-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* ---- SIDEBAR DE CUENTA ---- */}
            <aside className="w-full md:w-56 flex-shrink-0">
              {/* Resumen del usuario */}
              {user && (
                <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 mb-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                      {user.first_name?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Navegación */}
              <nav className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {accountNavLinks.map(({ href, label, icon: Icon, exact }) => {
                  // Comparación exacta para /perfil, startsWith para rutas anidadas
                  const isActive = exact
                    ? pathname === href
                    : pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 text-sm border-b border-slate-100 last:border-0 transition-colors",
                        isActive
                          ? "bg-brand-50 text-brand-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {label}
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-brand-400" />}
                    </Link>
                  );
                })}

                {/* Botón cerrar sesión */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  Cerrar sesión
                </button>
              </nav>
            </aside>

            {/* ---- CONTENIDO PRINCIPAL ---- */}
            <div className="flex-1 min-w-0 animate-fade-in">
              {children}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
