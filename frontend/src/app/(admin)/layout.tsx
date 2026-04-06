"use client";

// =============================================
// LAYOUT DEL PANEL DE ADMINISTRACIÓN
// Solo accesible para usuarios con rol "admin".
// Sidebar con active link detection.
// =============================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, LayoutDashboard, Package, ShoppingBag, Warehouse, BarChart3, Users, Tag, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const adminNavLinks = [
  { href: "/admin",             label: "Dashboard",   icon: LayoutDashboard },
  { href: "/admin/productos",   label: "Productos",   icon: Package },
  { href: "/admin/pedidos",     label: "Pedidos",     icon: ShoppingBag },
  { href: "/admin/stock",       label: "Stock",       icon: Warehouse },
  { href: "/admin/reportes",    label: "Reportes",    icon: BarChart3 },
  { href: "/admin/usuarios",    label: "Usuarios",    icon: Users },
  { href: "/admin/promociones", label: "Promociones", icon: Tag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* ---- SIDEBAR ---- */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" fill="currentColor" strokeWidth={0} />
            </div>
            <div>
              <span className="text-sm font-bold text-white leading-none block">
                Tele Import <span className="text-brand-400">S.A.</span>
              </span>
              <span className="text-[10px] text-slate-500 leading-none">Panel de admin</span>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {adminNavLinks.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-brand-600 text-white font-semibold"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer del sidebar */}
        <div className="px-3 pb-5 border-t border-slate-700/60 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            Ver tienda
          </Link>
        </div>
      </aside>

      {/* ---- CONTENIDO ---- */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-header">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
            Panel de administración
          </span>
          <Link
            href="/catalogo"
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors"
          >
            Ver catálogo →
          </Link>
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
