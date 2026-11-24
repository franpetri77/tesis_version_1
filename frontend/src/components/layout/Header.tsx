"use client";

// =============================================
// COMPONENTE: HEADER — navbar unificada
// Una sola fila sticky (h-16): logo · menú "Categorías" · buscador · cuenta ·
// carrito. El buscador es el elemento principal; las categorías quedan en
// un desplegable en lugar de una tira fija debajo del header.
//
// Desktop autenticado: dropdown de usuario (perfil · pedidos · salir)
// Desktop visitante:   botón "Ingresar"
// Mobile: buscador siempre visible en una segunda fila; carrito y menú
//         hamburguesa con categorías y cuenta
// =============================================

import Link from "next/link";
import {
  ShoppingCart, User, Search, Menu, X,
  LogOut, ShoppingBag, ChevronDown, ShieldCheck, LayoutGrid, ArrowRight,
} from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useState, useRef, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { useModalStore } from "@/stores/modalStore";
import { STORE_CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils/cn";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50";
const COLOR_TRANSITION = "motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-out";

// ─── Buscador ─────────────────────────────────────────────────────────────────
// Elemento principal del header: campo amplio con botón de buscar.

function SearchForm({
  value, onChange, onSubmit, className, placeholder = "Buscar productos, marcas o modelos…",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <form onSubmit={onSubmit} role="search" className={cn("min-w-0", className)}>
      <div className="flex h-11 w-full items-stretch overflow-hidden rounded-xl border border-paper-300 bg-paper-50 shadow-sm focus-within:border-brand-600/60 focus-within:ring-2 focus-within:ring-brand-600/20">
        <label className="flex min-w-0 flex-1 items-center gap-2.5 pl-3.5">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Buscar productos</span>
          <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-full w-full min-w-0 bg-transparent pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
        <button
          type="submit"
          className={cn("shrink-0 bg-brand-600 px-4 text-sm font-semibold text-paper-50 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-paper-50", COLOR_TRANSITION)}
        >
          <span className="hidden lg:inline">Buscar</span>
          <Search className="h-4 w-4 lg:hidden" aria-hidden="true" />
          <span className="sr-only lg:hidden">Buscar</span>
        </button>
      </div>
    </form>
  );
}

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen,   setIsUserMenuOpen]   = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [searchQuery,      setSearchQuery]      = useState("");

  const userMenuRef   = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const totalItems  = useCartStore((s) => s.total_items);
  const { user, isAuthenticated } = useAuthStore();
  const openModal = useModalStore((s) => s.openModal);
  // El panel lo ven el administrador y el rol de solo lectura (T7)
  const canSeePanel = isAuthenticated && (user?.role === "admin" || user?.role === "readonly");

  // Cerrar desplegables al hacer click fuera o con Escape (el foco vuelve
  // al botón que los abrió)
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (categoriesRef.current && !categoriesRef.current.contains(target)) {
        setIsCategoriesOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      for (const [ref, close] of [
        [userMenuRef, () => setIsUserMenuOpen(false)],
        [categoriesRef, () => setIsCategoriesOpen(false)],
      ] as const) {
        const trigger = ref.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]');
        if (trigger) {
          close();
          trigger.focus();
        }
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
        <div className="flex h-14 items-center gap-2 md:h-16 lg:gap-4">

          {/* Logo */}
          <Link href="/" className={cn("inline-flex shrink-0 items-baseline gap-2 rounded-sm", FOCUS_RING)}>
            <span className="whitespace-nowrap font-display text-2xl font-medium tracking-display text-slate-900 md:text-xl lg:text-2xl">
              Tele Import
            </span>
            <span className="font-sans text-xs font-medium uppercase tracking-widest text-slate-400">S.A.</span>
          </Link>

          {/* Categorías — desktop: desplegable en lugar de la tira fija */}
          <div className="relative hidden shrink-0 md:block" ref={categoriesRef}>
            <button
              type="button"
              onClick={() => setIsCategoriesOpen((v) => !v)}
              aria-expanded={isCategoriesOpen}
              aria-controls="header-categories"
              className={cn("flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-700 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
            >
              <LayoutGrid className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Categorías</span>
              <ChevronDown className={cn("h-3 w-3 text-slate-500 motion-safe:transition-transform motion-safe:duration-200", isCategoriesOpen && "rotate-180")} aria-hidden="true" />
            </button>

            {isCategoriesOpen && (
              <nav
                id="header-categories"
                aria-label="Categorías"
                className="absolute left-0 top-full z-50 mt-2 w-[34rem] rounded-xl border border-paper-300 bg-paper-50 p-2 shadow-dropdown motion-safe:animate-fade-in"
              >
                <ul className="grid grid-cols-2 gap-0.5">
                  {STORE_CATEGORIES.map(({ label, desc, href, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setIsCategoriesOpen(false)}
                        className={cn("group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-paper-100", COLOR_TRANSITION, FOCUS_RING)}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 group-hover:text-slate-900" strokeWidth={1.75} aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-900">{label}</span>
                          <span className="block text-xs text-slate-500">{desc}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-1 border-t border-paper-300 px-1 pt-1">
                  <Link
                    href="/catalogo"
                    onClick={() => setIsCategoriesOpen(false)}
                    className={cn("flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
                  >
                    Ver todo el catálogo
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </nav>
            )}
          </div>

          {/* Buscador — desktop */}
          <SearchForm
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
            className="hidden flex-1 md:block lg:max-w-3xl"
          />

          {/* Acciones — desktop */}
          <div className="ml-auto hidden md:flex items-center gap-1.5 flex-shrink-0">
            {canSeePanel && (
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

      {/* ── Buscador — mobile: siempre visible bajo el logo ── */}
      <div className="container-main pb-3 md:hidden">
        <SearchForm value={searchQuery} onChange={setSearchQuery} onSubmit={handleSearch} placeholder="Buscar productos o marcas…" />
      </div>

      {/* ── Menú mobile desplegable ── */}
      {isMobileMenuOpen && (
        <div id="header-mobile-menu" className="border-t border-paper-300 bg-paper-50 pb-4 md:hidden motion-safe:animate-fade-in">

          {/* Categorías */}
          <nav aria-label="Categorías" className="px-4 pb-1 pt-4">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Categorías
            </p>
            <ul className="grid grid-cols-2 gap-x-2">
              {STORE_CATEGORIES.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn("flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/catalogo"
              className={cn("mt-1 flex min-h-11 items-center justify-between rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-paper-100 hover:text-slate-900", COLOR_TRANSITION, FOCUS_RING)}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Ver todo el catálogo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>

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
                {canSeePanel && (
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
