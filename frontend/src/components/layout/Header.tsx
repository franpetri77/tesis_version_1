"use client";

// =============================================
// COMPONENTE: HEADER
// Estructura en tres capas:
//   1. Topbar (no sticky): saludo contextual + acceso rápido
//   2. Main header (sticky): logo + búsqueda + carrito
//   3. Nav strip (sticky): categorías de acceso directo
// =============================================

import Link from "next/link";
import {
  ShoppingCart, User, Search, Menu, X, Zap,
  MapPin, LogOut, ShoppingBag, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils/cn";

// ── Categorías para el nav strip (hardcoded por rendimiento) ──
const NAV_LINKS = [
  { label: "Todo el catálogo",  href: "/catalogo" },
  { label: "Gaming",            href: "/catalogo?categoria=componentes" },
  { label: "Electrónica",       href: "/catalogo?categoria=procesadores" },
  { label: "Audio",             href: "/catalogo?categoria=audio" },
  { label: "Monitores",         href: "/catalogo?categoria=monitores" },
  { label: "Periféricos",       href: "/catalogo?categoria=perifericos" },
  { label: "Redes",             href: "/catalogo?categoria=redes" },
  { label: "Almacenamiento",    href: "/catalogo?categoria=almacenamiento" },
  { label: "Cables",            href: "/catalogo?categoria=cables" },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery]           = useState("");

  const router                                  = useRouter();
  const totalItems                              = useCartStore((s) => s.total_items);
  const { user, isAuthenticated, clearUser }    = useAuthStore();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/catalogo?buscar=${encodeURIComponent(searchQuery.trim())}`;
    }
  }

  function handleSignOut() {
    localStorage.removeItem("tele_import_token");
    clearUser();
    router.push("/");
    setIsMobileMenuOpen(false);
  }

  return (
    <>
      {/* ════════════════════════════════════════════
          TOPBAR — saludo + acceso rápido (no sticky)
      ════════════════════════════════════════════ */}
      <div className="bg-slate-950 border-b border-slate-800/60">
        <div className="container-main">
          <div className="flex items-center justify-between h-9 text-[11.5px]">

            {/* Izquierda: ubicación y horario */}
            <div className="hidden sm:flex items-center gap-1.5 text-slate-500 font-medium">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span>Buenos Aires, Argentina</span>
              <span className="text-slate-700">·</span>
              <span>Lunes a Viernes  9 – 18 hs</span>
            </div>

            {/* Derecha: auth contextual */}
            <div className="flex items-center gap-3 ml-auto text-slate-400">
              {isAuthenticated && user ? (
                /* ── Usuario autenticado ── */
                <>
                  <span className="hidden sm:inline">
                    Hola,{" "}
                    <span className="text-slate-100 font-semibold">{user.first_name}</span>
                  </span>
                  <span className="hidden sm:block w-px h-3.5 bg-slate-800" />
                  <Link
                    href="/perfil/pedidos"
                    className="flex items-center gap-1 hover:text-slate-100 transition-colors"
                  >
                    <ShoppingBag className="w-3 h-3" />
                    <span>Mis pedidos</span>
                  </Link>
                  <span className="w-px h-3.5 bg-slate-800" />
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1 hover:text-slate-100 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Salir</span>
                  </button>
                </>
              ) : (
                /* ── Visitante ── */
                <>
                  <span className="hidden md:block text-slate-600">
                    ¿Primera vez aquí?
                  </span>
                  <Link
                    href="/registro"
                    className="hover:text-slate-100 transition-colors font-medium"
                  >
                    Crear cuenta
                  </Link>
                  <span className="w-px h-3.5 bg-slate-800" />
                  <Link
                    href="/login"
                    className="flex items-center gap-0.5 text-brand-400 hover:text-brand-300 font-semibold transition-colors"
                  >
                    Ingresar
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          STICKY HEADER — main + nav strip
      ════════════════════════════════════════════ */}
      <header className="bg-white sticky top-0 z-50 shadow-header">

        {/* ── Fila principal ── */}
        <div className="container-main">
          <div className="flex items-center gap-4 h-16">

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
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar productos, marcas o modelos..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50
                             text-sm text-slate-900 placeholder:text-slate-400
                             transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/30
                             focus:border-brand-400 focus:bg-white"
                />
              </div>
            </form>

            {/* Acciones — desktop */}
            <nav className="hidden md:flex items-center gap-2 ml-auto">

              {/* Cuenta */}
              {isAuthenticated && user ? (
                <Link
                  href="/perfil"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                             text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold leading-none">
                      {user.first_name?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                  <span className="max-w-[80px] truncate">{user.first_name}</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                             text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Ingresar
                </Link>
              )}

              {/* Divisor */}
              <div className="w-px h-5 bg-slate-200" />

              {/* ── CARRITO — elemento más prominente ── */}
              <Link
                href="/carrito"
                aria-label={`Carrito${totalItems > 0 ? ` — ${totalItems} productos` : ""}`}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold",
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
                    "min-w-[20px] h-5 px-1 rounded-full text-[11px] font-extrabold",
                    "flex items-center justify-center animate-pop-in",
                    "bg-white/25 text-white"
                  )}>
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </Link>
            </nav>

            {/* ── Mobile: carrito + hamburguesa ── */}
            <div className="md:hidden ml-auto flex items-center gap-1.5">
              <Link
                href="/carrito"
                aria-label="Carrito"
                className={cn(
                  "relative flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all",
                  totalItems > 0
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <ShoppingCart className="w-5 h-5" strokeWidth={1.75} />
                {totalItems > 0 && (
                  <span className="min-w-[18px] h-[18px] px-0.5 rounded-full bg-white/25 text-white text-[10px] font-bold flex items-center justify-center">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </Link>
              <button
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── NAV STRIP — Categorías (solo desktop) ── */}
        <div className="hidden md:block border-t border-slate-100/80">
          <div className="container-main">
            <nav className="flex items-center gap-0.5 h-10 overflow-x-auto scrollbar-none">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="whitespace-nowrap px-3 py-1.5 text-[12.5px] font-medium
                             text-slate-600 hover:text-brand-600 hover:bg-brand-50
                             rounded-lg transition-all flex-shrink-0"
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
          {/* Search mobile */}
          <form onSubmit={handleSearch} className="px-4 pt-3 mb-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50
                           text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white"
              />
            </div>
          </form>

          {/* Categorías rápidas (grid) */}
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

          {/* Divisor */}
          <div className="h-px bg-slate-100 mx-4 my-2" />

          {/* Auth mobile */}
          <nav className="px-4 flex flex-col gap-0.5">
            {isAuthenticated && user ? (
              <>
                {/* Resumen de usuario */}
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
    </>
  );
}
