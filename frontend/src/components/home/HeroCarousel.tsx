"use client";

// =============================================
// COMPONENTE: HERO CAROUSEL
// Carrusel de banners promocionales estilo Venex.
// Auto-avance cada 5s. Navegación con flechas y dots.
// =============================================

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

interface Slide {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  bg: string;
  accentColor: string;
  pillClass: string;
  highlightClass: string;
  icon: string;
}

const slides: Slide[] = [
  {
    id: 1,
    tag: "Setup Gamer",
    title: "PC Gaming & Componentes",
    subtitle: "Procesadores, placas de video y memorias de las mejores marcas. Armá tu setup ideal.",
    cta: "Ver componentes",
    href: "/catalogo?categoria=componentes",
    bg: "bg-gradient-to-br from-slate-950 via-slate-900 to-red-950",
    accentColor: "text-red-400",
    pillClass: "bg-red-500/20 border border-red-500/30 text-red-300",
    highlightClass: "text-red-400",
    icon: "🎮",
  },
  {
    id: 2,
    tag: "Top ventas",
    title: "Periféricos y Monitores",
    subtitle: "Teclados mecánicos, mouses gaming, auriculares y pantallas 4K en stock permanente.",
    cta: "Ver periféricos",
    href: "/catalogo?categoria=perifericos",
    bg: "bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900",
    accentColor: "text-blue-400",
    pillClass: "bg-blue-500/20 border border-blue-500/30 text-blue-300",
    highlightClass: "text-blue-400",
    icon: "🖥️",
  },
  {
    id: 3,
    tag: "Envío a todo el país",
    title: "Conectividad y Redes",
    subtitle: "Routers, switches, cables y accesorios para tu hogar o empresa. Stock inmediato.",
    cta: "Ver networking",
    href: "/catalogo?categoria=redes",
    bg: "bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950",
    accentColor: "text-indigo-300",
    pillClass: "bg-indigo-500/20 border border-indigo-500/30 text-indigo-300",
    highlightClass: "text-indigo-300",
    icon: "📡",
  },
  {
    id: 4,
    tag: "Destacados",
    title: "Productos Seleccionados",
    subtitle: "Nuestra selección curada del mejor stock disponible con los mejores precios del mercado.",
    cta: "Ver destacados",
    href: "/catalogo?destacados=true",
    bg: "bg-gradient-to-br from-slate-900 via-brand-950 to-slate-950",
    accentColor: "text-brand-300",
    pillClass: "bg-brand-500/20 border border-brand-500/30 text-brand-300",
    highlightClass: "text-brand-300",
    icon: "⭐",
  },
];

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 400);
  }, [isTransitioning]);

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length);
  }, [current, goTo]);

  const next = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, goTo]);

  // Auto-avance
  useEffect(() => {
    const timer = setTimeout(next, 5000);
    return () => clearTimeout(timer);
  }, [current, next]);

  const slide = slides[current];

  return (
    <section className="relative overflow-hidden select-none">
      {/* Slides */}
      <div className="relative h-[380px] md:h-[480px] lg:h-[520px]">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`
              absolute inset-0 ${s.bg}
              transition-opacity duration-500 ease-in-out
              ${i === current ? "opacity-100 z-10" : "opacity-0 z-0"}
            `}
          >
            {/* Patrón de puntos */}
            <div className="absolute inset-0 bg-dot-pattern opacity-30" />
            {/* Destellos decorativos */}
            <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />

            {/* Contenido */}
            <div className="relative z-10 container-main h-full flex items-center">
              <div className="max-w-2xl">
                {/* Pill tag */}
                <div className={`inline-flex items-center gap-2 ${s.pillClass} text-xs font-semibold px-3 py-1.5 rounded-full mb-5`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {s.tag}
                </div>

                {/* Título */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
                  {s.title}
                </h1>

                {/* Subtítulo */}
                <p className={`text-base md:text-lg leading-relaxed mb-7 max-w-xl ${s.accentColor === "text-red-400" ? "text-slate-300" : "text-slate-300"}`}>
                  {s.subtitle}
                </p>

                {/* CTA */}
                <Link
                  href={s.href}
                  className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-slate-100 transition-colors shadow-lg text-sm"
                >
                  {s.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Ícono decorativo — desktop */}
              <div className="hidden md:flex absolute right-12 lg:right-24 top-1/2 -translate-y-1/2 text-[120px] lg:text-[160px] leading-none opacity-20 select-none">
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Flecha izquierda */}
      <button
        onClick={prev}
        aria-label="Anterior"
        className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20
                   w-9 h-9 md:w-11 md:h-11 rounded-full
                   bg-white/10 hover:bg-white/20 border border-white/20
                   backdrop-blur-sm flex items-center justify-center
                   text-white transition-all hover:scale-105"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Flecha derecha */}
      <button
        onClick={next}
        aria-label="Siguiente"
        className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20
                   w-9 h-9 md:w-11 md:h-11 rounded-full
                   bg-white/10 hover:bg-white/20 border border-white/20
                   backdrop-blur-sm flex items-center justify-center
                   text-white transition-all hover:scale-105"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots de navegación */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Ir al slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 h-2 bg-white"
                : "w-2 h-2 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* Barra de progreso */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-20">
        <div
          key={current}
          className="h-full bg-white/60 animate-shrink"
        />
      </div>
    </section>
  );
}
