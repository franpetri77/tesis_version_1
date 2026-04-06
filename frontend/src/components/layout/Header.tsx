"use client";

// =============================================
// COMPONENTE: HEADER
// Barra de navegación principal de la tienda.
// Incluye logo, búsqueda, acceso a cuenta y carrito.
// =============================================

import Link from "next/link";
import { ShoppingCart, User, Search, Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils/cn";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const totalItems = useCartStore((state) => state.total_items);
  const { user, isAuthenticated } = useAuthStore();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/catalogo?buscar=${encodeURIComponent(searchQuery.trim())}`;
    }
  }

  return (
    <header className="bg-white shadow-header sticky top-0 z-50">
      <div className="container-main">
        <div className="flex items-center gap-6 h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-bold text-slate-900 tracking-tight">
              Tele Import
              <span className="text-slate-400 font-normal text-xs ml-0.5">S.A.</span>
            </span>
          </Link>

          {/* Buscador (escritorio) */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-2xl"
          >
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos, marcas o modelos..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-white"
              />
            </div>
          </form>

          {/* Acciones (escritorio) */}
          <nav className="hidden md:flex items-center gap-1 ml-auto">
            <Link
              href="/catalogo"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Catálogo
            </Link>

            {isAuthenticated ? (
              <Link
                href="/perfil"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>{user?.first_name}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Ingresar
              </Link>
            )}

            {/* Separador visual */}
            <div className="w-px h-5 bg-slate-200 mx-1" />

            {/* Carrito */}
            <Link
              href="/carrito"
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label={`Carrito con ${totalItems} productos`}
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-brand-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center animate-pop-in">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>
          </nav>

          {/* Botón menú mobile */}
          <button
            className="md:hidden ml-auto p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menú"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Menú mobile */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
            isMobileMenuOpen ? "max-h-80 pb-4" : "max-h-0"
          )}
        >
          {/* Buscador mobile */}
          <form onSubmit={handleSearch} className="mb-3 pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </form>

          {/* Links mobile */}
          <nav className="flex flex-col gap-1">
            <Link
              href="/catalogo"
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Catálogo
            </Link>
            <Link
              href="/carrito"
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>Carrito</span>
              {totalItems > 0 && (
                <span className="bg-brand-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>
            {isAuthenticated ? (
              <Link
                href="/perfil"
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Mi cuenta
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Ingresar
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
