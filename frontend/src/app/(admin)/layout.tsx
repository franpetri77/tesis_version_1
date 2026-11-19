"use client";

// =============================================
// LAYOUT DEL PANEL DE ADMINISTRACIÓN
// Accesible para "admin" (completo) y "readonly" (sólo consulta, T7).
// Sidebar con active link detection.
// =============================================

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Zap, LayoutDashboard, Package, ShoppingBag, Warehouse, BarChart3, Users, Tag, MessageSquare, MessagesSquare, ClipboardList, FileText, ArrowLeft, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { staffChatApi } from "@/lib/api/chat";
import { cn } from "@/lib/utils/cn";
import { getMe } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useCanEdit } from "@/hooks/usePanelRole";

const adminNavLinks = [
  { href: "/admin",              label: "Dashboard",   icon: LayoutDashboard },
  { href: "/admin/productos",    label: "Productos",   icon: Package },
  { href: "/admin/pedidos",      label: "Pedidos",     icon: ShoppingBag },
  { href: "/admin/mensajes",     label: "Mensajes",    icon: MessagesSquare },
  { href: "/admin/stock",        label: "Stock",       icon: Warehouse },
  { href: "/admin/reportes",     label: "Reportes",    icon: BarChart3 },
  { href: "/admin/usuarios",     label: "Usuarios",    icon: Users },
  { href: "/admin/promociones",  label: "Promociones", icon: Tag },
  { href: "/admin/resenas",      label: "Reseñas",     icon: MessageSquare },
  { href: "/admin/presupuestos", label: "Presupuestos", icon: FileText },
  { href: "/admin/auditoria",    label: "Auditoría",   icon: ClipboardList },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const canEdit = useCanEdit();
  // T9: conversaciones con mensajes sin leer, para el contador del menú
  const { data: chatUnread } = useQuery({
    queryKey: ["staff-chat", "unread"],
    queryFn: staffChatApi.unread,
    enabled: !isCheckingAccess,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    let isMounted = true;

    async function validateAdminAccess() {
      const token = localStorage.getItem("tele_import_token");

      if (!token) {
        clearUser();
        router.replace("/login");
        return;
      }

      try {
        const me = await getMe(token);

        // admin: acceso completo; readonly: consulta (T7). Los demás, afuera.
        if (me.role !== "admin" && me.role !== "readonly") {
          router.replace("/");
          return;
        }

        setUser(me);
        if (isMounted) setIsCheckingAccess(false);
      } catch {
        localStorage.removeItem("tele_import_token");
        clearUser();
        router.replace("/login");
      }
    }

    validateAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [clearUser, router, setUser]);

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <ShieldAlert className="w-5 h-5 text-brand-600" />
          Validando acceso administrativo...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-100">
      {/* ---- SIDEBAR ---- */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col flex-shrink-0 overflow-y-auto">
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
                {href === "/admin/mensajes" && (chatUnread?.conversations ?? 0) > 0 && (
                  <span
                    className={cn(
                      "ml-auto min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none",
                      isActive ? "bg-white text-brand-700" : "bg-brand-600 text-white"
                    )}
                    aria-label={`${chatUnread?.conversations} con mensajes sin leer`}
                  >
                    {chatUnread!.conversations > 99 ? "99+" : chatUnread!.conversations}
                  </span>
                )}
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
      {/* flex-col + min-h-0: el topbar queda fijo arriba sin necesitar sticky */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top bar — sin sticky: siempre al tope del flex column */}
        <div className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between z-10 shadow-header flex-shrink-0">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
            Panel de administración
            {!canEdit && <span className="ml-3 normal-case tracking-normal text-slate-600">· Solo lectura: podés consultar, no modificar</span>}
          </span>
          <Link
            href="/catalogo"
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors"
          >
            Ver catálogo →
          </Link>
        </div>
        <main className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
