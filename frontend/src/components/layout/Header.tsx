"use client";

// =============================================
// COMPONENTE: HEADER — navbar unificada
// Una sola barra sticky con dos filas internas:
//   1. Fila principal (h-14): logo + búsqueda + cuenta + carrito
//   2. Índice editorial (h-10, solo desktop): categorías de acceso directo
//
// Desktop autenticado: dropdown de usuario (perfil · pedidos · salir)
// Desktop visitante:   botón "Ingresar"
// Mobile: carrito visible + menú hamburguesa con búsqueda, categorías y cuenta
// =============================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart, User, Search, Menu, X,
  LogOut, ShoppingBag, ChevronDown, ShieldCheck,
} from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useState, useRef, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { useModalStore } from "@/stores/modalStore";
import { cn } from "@/lib/utils/cn";

// Slugs alineados con la tabla `categories` de la DB
const NAV_LINKS = [
  { label: "Todo el catálogo",  href: "/catalogo" },
  { label: "Televisores",       href: "/catalogo?categoria=televisores" },
  { label: "Smartphones",       href: "/catalogo?categoria=smartphones" },
  { label: "Laptops y PCs",     href: "/catalogo?categoria=laptops-pcs" },
  { label: "Audio y Video",     href: "/catalogo?categoria=audio-video" },
  { label: "Gaming",            href: "/catalogo?categoria=gaming" },
  { label: "Periféricos",       href: "/catalogo?categoria=accesorios" },
  { label: "Línea Blanca",      href: "/catalogo?categoria=linea-blanca" },
  { label: "Pequeños Electro",  href: "/catalogo?categoria=pequenos-electro" },
];

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50";
const COLOR_TRANSITION = "motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-out";

export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen,   setIsUserMenuOpen]   = useState(false);
  const [searchQuery,      setSearchQuery]      = useState("");

  const userMenuRef = useRef<HTMLDivElement>(null);
  const totalItems  = useCartStore((s) => s.total_items);
  const { user, isAuthenticated } = useAuthStore();
  const openModal = useModalStore((s) => s.openModal);
  const isAdmin = isAuthenticated && user?.role === "admin";
  const showCategoryNav = pathname !== "/catalogo";

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const trigger = userMenuRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]');
      if (trigger) {
        setIsUserMenuOpen(false);
        trigger.focus();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/catalogo?buscar=${encodeURIComponent(searchQuery.trim())}`;
    }
  }

  function handleSignOut() {
    // Abre el modal de confirmación — el logout real ocurre en AuthModals
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    openModal("logout-confirm");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-paper-300 bg-paper-50">

      {/* ── Fila principal ── */}
      <div className="container-main">
        <div className="flex h-14 items-center gap-2 lg:gap-3">

          {/* Logo */}
          <Link href="/" className={cn("inline-flex shrink-0 items-baseline gap-2 rounded-sm", FOCUS_RING)}>
            <span className="whitespace-nowrap font-display text-2xl font-medium tracking-display text-slate-900 md:text-xl lg:text-2xl">
              Tele Import
            </span>
            <span className="font-sans text-xs font-medium uppercase tracking-widest text-slate-400">S.A.</span>
          </Link>

          {/* Buscador — desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 min-w-0">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar productos"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos, marcas o modelos..."
                className={cn("w-full rounded-lg border border-paper-300 bg-paper-100 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-brand-600/30", COLOR_TRANSITION, FOCUS_RING)}
              />
            </div>
          </form>

          {/* Acciones — desktop */}
          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
            {isAdmin && (
              <Link
                href="/admin"
                className={cn("flex items-center gap-1.5 rounded-lg border border-paper-300 px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Admin</span>
              </Link>
            )}

            {/* Cuenta */}
            {isAuthenticated && user ? (
              /* ── Dropdown de usuario ── */
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="header-user-menu"
                  className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-paper-200">
                    <span className="text-xs font-semibold leading-none text-slate-700">
                      {user.first_name?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                  <span className="max-w-14 truncate lg:max-w-[80px]">{user.first_name}</span>
                  <ChevronDown className={cn(
                    "h-3 w-3 text-slate-500 motion-safe:transition-transform motion-safe:duration-200",
                    isUserMenuOpen && "rotate-180"
                  )} aria-hidden="true" />
                </button>

                {/* Panel del dropdown */}
                {isUserMenuOpen && (
                  <div
                    id="header-user-menu"
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-paper-300 bg-paper-50 p-1.5 shadow-card motion-safe:animate-fade-in"
                  >
                    <Link
                      href="/perfil"
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={cn("flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-slate-700 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
                    >
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                      Mi perfil
                    </Link>
                    <Link
                      href="/perfil/pedidos"
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={cn("flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-slate-700 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                      Mis pedidos
                    </Link>
                    <div className="mx-3 my-1.5 h-px bg-paper-300" />
                    <button
                      role="menuitem"
                      onClick={handleSignOut}
                      className={cn("flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-paper-100 hover:text-red-700/80", COLOR_TRANSITION, FOCUS_RING)}
                    >
                      <LogOut className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openModal("auth", { authTab: "login" })}
                className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
              >
                <User className="w-4 h-4" aria-hidden="true" />
                <span>Ingresar</span>
              </button>
            )}

            {/* Notificaciones — solo usuarios autenticados */}
            {isAuthenticated && <NotificationBell />}

            {/* Divisor */}
            <div className="mx-1 h-5 w-px bg-paper-300" />

            {/* Carrito */}
            <Link
              href="/carrito"
              aria-label={`Carrito${totalItems > 0 ? ` — ${totalItems} productos` : ""}`}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-paper-300 bg-paper-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-paper-200 hover:text-slate-900",
                COLOR_TRANSITION, FOCUS_RING
              )}
            >
              <ShoppingCart className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Carrito</span>
              {totalItems > 0 && (
                <span className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-bold tabular-nums",
                  "bg-brand-600 text-paper-50 motion-safe:animate-pop-in"
                )}>
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile: carrito + hamburguesa */}
          <div className="md:hidden ml-auto flex items-center gap-1">
            <Link
              href="/carrito"
              aria-label="Carrito"
              className={cn(
                "flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 py-2 text-slate-700 hover:bg-paper-100 hover:text-slate-900",
                COLOR_TRANSITION, FOCUS_RING
              )}
            >
              <ShoppingCart className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
              {totalItems > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded bg-brand-600 px-1 text-[10px] font-bold tabular-nums text-paper-50 motion-safe:animate-pop-in">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>
            <button
              className={cn("rounded-lg p-2.5 text-slate-600 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="header-mobile-menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Nav strip — categorías (solo desktop) ── */}
      {showCategoryNav && (
        <div className="hidden border-t border-paper-300 md:block">
          <div className="container-main">
            <nav className="scrollbar-none flex h-10 items-center gap-6 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn("inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-sm text-xs font-medium uppercase tracking-wider text-slate-500 decoration-1 underline-offset-4 hover:text-slate-900 hover:underline", COLOR_TRANSITION, FOCUS_RING)}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ── Menú mobile desplegable ── */}
      {isMobileMenuOpen && (
        <div id="header-mobile-menu" className="border-t border-paper-300 bg-paper-50 pb-4 md:hidden motion-safe:animate-fade-in">

          {/* Búsqueda */}
          <form onSubmit={handleSearch} className="mb-4 px-4 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar productos"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                className={cn("w-full rounded-lg border border-paper-300 bg-paper-100 py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-brand-600/30", COLOR_TRANSITION, FOCUS_RING)}
              />
            </div>
          </form>

          {/* Categorías rápidas */}
          <div className="px-4 pb-1">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Categorías
            </p>
            <div className="grid grid-cols-3 gap-x-3 gap-y-1">
              {NAV_LINKS.slice(0, 6).map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn("flex min-h-11 items-center justify-center rounded-sm border-b border-paper-300 px-1 py-2.5 text-center text-xs font-medium leading-snug text-slate-600 decoration-1 underline-offset-4 hover:text-slate-900 hover:underline", COLOR_TRANSITION, FOCUS_RING)}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mx-4 my-4 h-px bg-paper-300" />

          {/* Auth mobile */}
          <nav className="flex flex-col gap-1 px-4">
            {isAuthenticated && user ? (
              <>
                <div className="mb-1 flex min-w-0 items-center gap-3 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-paper-200">
                    <span className="text-sm font-semibold text-slate-700">
                      {user.first_name?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">{user.first_name} {user.last_name}</p>
                    <p className="break-words text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <Link
                  href="/perfil"
                  className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  Mi cuenta
                </Link>
                <Link
                  href="/perfil/pedidos"
                  className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <ShoppingBag className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  Mis pedidos
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={cn("flex items-center gap-2.5 rounded-lg border border-paper-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    Panel admin
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-paper-100 hover:text-red-700/80", COLOR_TRANSITION, FOCUS_RING)}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  className={cn("flex items-center justify-center gap-2 rounded-lg border border-paper-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
                  onClick={() => { setIsMobileMenuOpen(false); openModal("auth", { authTab: "login" }); }}
                >
                  <User className="w-4 h-4" aria-hidden="true" />
                  Ingresar
                </button>
                <button
                  className={cn("flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-paper-50 hover:bg-brand-700", COLOR_TRANSITION, FOCUS_RING)}
                  onClick={() => { setIsMobileMenuOpen(false); openModal("auth", { authTab: "register" }); }}
                >
                  Crear cuenta gratis
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
