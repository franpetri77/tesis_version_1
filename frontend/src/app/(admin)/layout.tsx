"use client";

// =============================================
// LAYOUT DEL PANEL DE ADMINISTRACIÓN
// Accesible para "admin" (completo) y "readonly" (sólo consulta, T7).
// Sidebar con active link detection.
// En pantallas chicas (< lg) el sidebar es un panel que se abre con el
// botón de menú del top bar: aria-expanded, foco dentro del panel, Escape
// y clic en el fondo lo cierran.
// =============================================

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Zap, LayoutDashboard, Package, ShoppingBag, Warehouse, BarChart3, Users, Tag, MessageSquare, ClipboardList, FileText, ArrowLeft, ShieldAlert, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getMe } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useCanEdit } from "@/hooks/usePanelRole";

const adminNavLinks = [
  { href: "/admin",              label: "Dashboard",   icon: LayoutDashboard },
  { href: "/admin/productos",    label: "Productos",   icon: Package },
  { href: "/admin/pedidos",      label: "Pedidos",     icon: ShoppingBag },
  { href: "/admin/stock",        label: "Stock",       icon: Warehouse },
  { href: "/admin/reportes",     label: "Reportes",    icon: BarChart3 },
  { href: "/admin/usuarios",     label: "Usuarios",    icon: Users },
  { href: "/admin/promociones",  label: "Promociones", icon: Tag },
  { href: "/admin/resenas",      label: "Reseñas",     icon: MessageSquare },
  { href: "/admin/presupuestos", label: "Presupuestos", icon: FileText },
  { href: "/admin/auditoria",    label: "Auditoría",   icon: ClipboardList },
];

// Mismo corte que el prefijo lg: de Tailwind.
const DESKTOP_QUERY = "(min-width: 1024px)";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const canEdit = useCanEdit();

  // ---- Menú lateral en pantallas chicas ----
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Al cerrar con Escape, la X o el fondo, el foco vuelve al botón de menú.
  // Al elegir un enlace no: el foco sigue la navegación.
  const closeMenu = useCallback((returnFocus = true) => {
    setIsMenuOpen(false);
    if (returnFocus) menuButtonRef.current?.focus();
  }, []);

  // Al abrir, el foco entra al panel.
  useEffect(() => {
    if (isMenuOpen) closeButtonRef.current?.focus();
  }, [isMenuOpen]);

  // Cambio de ruta: el panel se cierra.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Escape cierra el panel esté donde esté el foco.
  useEffect(() => {
    if (!isMenuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen, closeMenu]);

  // Si la ventana pasa a escritorio con el panel abierto, se cierra para no
  // dejar el fondo encima ni el foco atrapado.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    function onChange(e: MediaQueryListEvent) {
      if (e.matches) setIsMenuOpen(false);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Con el panel abierto como superposición, Tab circula dentro de él.
  function handleSidebarKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (!isMenuOpen || e.key !== "Tab" || !sidebarRef.current) return;
    if (window.matchMedia(DESKTOP_QUERY).matches) return;
    const focusables = sidebarRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

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
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <ShieldAlert className="w-5 h-5 text-brand-600" />
          Validando acceso administrativo...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-100">
      {/* ---- FONDO DEL PANEL (solo < lg) ---- */}
      {isMenuOpen && (
        <div
          aria-hidden="true"
          onClick={() => closeMenu()}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      )}

      {/* ---- SIDEBAR ----
          lg+: columna fija de 240 px, como siempre.
          < lg: panel que entra desde la izquierda; cerrado queda invisible,
          así sus enlaces no reciben foco. */}
      <aside
        id="admin-sidebar"
        ref={sidebarRef}
        onKeyDown={handleSidebarKeyDown}
        aria-label="Navegación del panel"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 bg-slate-900 text-white flex flex-col flex-shrink-0 overflow-y-auto",
          "duration-200 ease-out motion-reduce:transition-none",
          "lg:static lg:z-auto lg:translate-x-0 lg:visible",
          // visibility se anima solo al cerrar (el panel sale deslizando y
          // después se oculta). Al abrir cambia de inmediato: si no, el panel
          // sigue oculto cuando se le pasa el foco y focus() no hace nada.
          isMenuOpen
            ? "translate-x-0 visible transition-transform"
            : "-translate-x-full invisible transition-[transform,visibility]"
        )}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-700/60">
          <div className="flex items-center justify-between gap-2">
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
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => closeMenu()}
              aria-label="Cerrar menú"
              className="lg:hidden -mr-2 p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
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
                aria-current={isActive ? "page" : undefined}
                onClick={() => closeMenu(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                  isActive
                    ? "bg-brand-600 text-white font-semibold"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer del sidebar */}
        <div className="px-3 pb-5 border-t border-slate-700/60 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            Ver tienda
          </Link>
        </div>
      </aside>

      {/* ---- CONTENIDO ---- */}
      {/* flex-col + min-h-0: el topbar queda fijo arriba sin necesitar sticky.
          min-w-0: sin esto la columna crece hasta el ancho de la tabla más
          ancha y los contenedores overflow-x-auto nunca desplazan. */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Top bar — sin sticky: siempre al tope del flex column */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2 lg:py-3.5 flex items-center justify-between gap-3 z-10 shadow-header flex-shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-expanded={isMenuOpen}
              aria-controls="admin-sidebar"
              aria-label="Menú del panel"
              className="lg:hidden -ml-2 p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <span className="min-w-0 text-xs font-medium text-slate-400 uppercase tracking-widest">
              <span className="hidden sm:inline">Panel de administración</span>
              <span className="sm:hidden">Panel</span>
              {!canEdit && (
                <span className="ml-2 sm:ml-3 normal-case tracking-normal text-slate-600">
                  · Solo lectura<span className="hidden md:inline">: podés consultar, no modificar</span>
                </span>
              )}
            </span>
          </div>
          <Link
            href="/catalogo"
            className="flex-shrink-0 text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors motion-reduce:transition-none"
          >
            Ver catálogo →
          </Link>
        </div>
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
