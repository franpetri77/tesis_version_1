"use client";

// =============================================
// COMPONENTE: HEADER — navbar unificada
// Una sola barra sticky con dos filas internas:
//   1. Fila principal (h-14): logo + búsqueda + cuenta + carrito
//   2. Nav strip (h-9, solo desktop): categorías de acceso directo
//
// Desktop autenticado: dropdown de usuario (perfil · pedidos · salir)
// Desktop visitante:   botón "Ingresar"
// Mobile: carrito visible + menú hamburguesa con búsqueda, categorías y cuenta
// =============================================

import Link from "next/link";
import {
  ShoppingCart, User, Search, Menu, X, Zap,
  LogOut, ShoppingBag, ChevronDown,
} from "lucide-react";
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

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen,   setIsUserMenuOpen]   = useState(false);
  const [searchQuery,      setSearchQuery]      = useState("");

  const userMenuRef = useRef<HTMLDivElement>(null);
  const totalItems  = useCartStore((s) => s.total_items);
  const { user, isAuthenticated } = useAuthStore();
  const openModal = useModalStore((s) => s.openModal);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
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
    <header className="bg-white sticky top-0 z-50 shadow-header">

      {/* ── Fila principal ── */}
      <div className="container-main">
        <div className="flex items-center gap-3 h-14">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center transition-transform group-hover:scale-105">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-bold text-slate-900 tracking-tight whitespace-nowrap">
              Tele Import
              <span className="text-slate-400 font-normal text-xs ml-0.5">S.A.</span>
            </span>
          </Link>

          {/* Buscador — desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 min-w-0">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos, marcas o modelos..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50
                           text-sm text-slate-900 placeholder:text-slate-400
                           transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/30
                           focus:border-brand-400 focus:bg-white"
              />
            </div>
          </form>

          {/* Acciones — desktop */}
          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">

            {/* Cuenta */}
            {isAuthenticated && user ? (
              /* ── Dropdown de usuario ── */
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                             text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold leading-none">
                      {user.first_name?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                  <span className="max-w-[80px] truncate">{user.first_name}</span>
                  <ChevronDown className={cn(
                    "w-3 h-3 text-slate-400 transition-transform duration-200",
                    isUserMenuOpen && "rotate-180"
                  )} />
                </button>

                {/* Panel del dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl
                                  border border-slate-200 shadow-lg shadow-slate-900/10 py-1 z-50">
                    <Link
                      href="/perfil"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-slate-700
                                 hover:bg-slate-50 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      Mi perfil
                    </Link>
                    <Link
                      href="/perfil/pedidos"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-slate-700
                                 hover:bg-slate-50 transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      Mis pedidos
                    </Link>
                    <div className="h-px bg-slate-100 my-1 mx-2" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-red-600
                                 hover:bg-red-50 transition-colors w-full text-left"
                    >
                      <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                           text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Ingresar</span>
              </Link>
            )}

            {/* Divisor */}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {/* Carrito */}
            <Link
              href="/carrito"
              aria-label={`Carrito${totalItems > 0 ? ` — ${totalItems} productos` : ""}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold",
                "transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                totalItems > 0
                  ? "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              <ShoppingCart className="w-4 h-4" strokeWidth={1.75} />
              <span>Carrito</span>
              {totalItems > 0 && (
                <span className={cn(
                  "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold",
                  "flex items-center justify-center animate-pop-in bg-white/25 text-white"
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
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all",
                totalItems > 0
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <ShoppingCart className="w-5 h-5" strokeWidth={1.75} />
              {totalItems > 0 && (
                <span className="min-w-[16px] h-4 px-0.5 rounded-full bg-white/25 text-white text-[9px] font-bold flex items-center justify-center">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>
            <button
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Nav strip — categorías (solo desktop) ── */}
      <div className="hidden md:block border-t border-slate-100">
        <div className="container-main">
          <nav className="flex items-center gap-0.5 h-9 overflow-x-auto scrollbar-none">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="whitespace-nowrap px-2.5 py-1 text-[12px] font-medium
                           text-slate-500 hover:text-brand-600 hover:bg-brand-50
                           rounded-md transition-all flex-shrink-0"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Menú mobile desplegable ── */}
      <div className={cn(
        "md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-slate-100",
        isMobileMenuOpen ? "max-h-[440px] pb-4" : "max-h-0"
      )}>

        {/* Búsqueda */}
        <form onSubmit={handleSearch} className="px-4 pt-3 mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50
                         text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white"
            />
          </div>
        </form>

        {/* Categorías rápidas */}
        <div className="px-4 pb-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 mb-1.5">
            Categorías
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {NAV_LINKS.slice(0, 6).map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="px-2 py-2 rounded-xl text-center text-[11.5px] font-medium
                           text-slate-600 hover:text-brand-600 bg-slate-50 hover:bg-brand-50
                           transition-colors leading-tight"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-100 mx-4 my-2" />

        {/* Auth mobile */}
        <nav className="px-4 flex flex-col gap-0.5">
          {isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1">
                <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">
                    {user.first_name?.[0]?.toUpperCase() ?? "U"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user.first_name} {user.last_name}</p>
                  <p className="text-[11px] text-slate-400">{user.email}</p>
                </div>
              </div>
              <Link
                href="/perfil"
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="w-4 h-4 text-slate-400" />
                Mi cuenta
              </Link>
              <Link
                href="/perfil/pedidos"
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ShoppingBag className="w-4 h-4 text-slate-400" />
                Mis pedidos
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                Ingresar
              </Link>
              <Link
                href="/registro"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Crear cuenta gratis
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
