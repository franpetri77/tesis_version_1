"use client";

// =============================================
// COMPONENTE: HERO CAROUSEL
// Banners con imágenes reales, overlay oscuro para legibilidad,
// texto a la izquierda estilo e-commerce profesional.
// Auto-avance cada 5s. Navegación con flechas y dots.
// =============================================

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

// Las imágenes viven en /public/img/ y se sirven como assets estáticos
interface Slide {
  id:        number;
  image:     string;
  imagePos:  string;           // object-position CSS (e.g. "50% 40%")
  overlay:   string;           // clases del degradado de superposición
  tag:       string;
  pillClass: string;
  title:     string;
  subtitle:  string;
  cta:       string;
  href:      string;
}

const slides: Slide[] = [
  {
    id:       1,
    image:    "/img/banner.jpg",
    imagePos: "50% 50%",
    overlay:  "bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-transparent",
    tag:       "Bienvenido a Tele Import",
    pillClass: "bg-brand-500/25 border border-brand-400/40 text-brand-200",
    title:     "Tecnología para tu hogar y oficina",
    subtitle:  "TV, laptops, smartphones y más. Envío a todo el país con garantía oficial.",
    cta:       "Ver catálogo",
    href:      "/catalogo",
  },
  {
    id:       2,
    image:    "/img/banner-smartphones.jpg",
    imagePos: "50% 50%",
    overlay:  "bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-transparent",
    tag:       "Top ventas",
    pillClass: "bg-blue-500/25 border border-blue-400/40 text-blue-200",
    title:     "Smartphones y Celulares",
    subtitle:  "Samsung, Motorola, Apple y más. Las últimas novedades con envío a todo el país.",
    cta:       "Ver smartphones",
    href:      "/catalogo?categoria=smartphones",
  },
  {
    id:       3,
    image:    "/img/banner-destacados.jpg",
    imagePos: "50% 50%",
    overlay:  "bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-transparent",
    tag:       "Destacados",
    pillClass: "bg-amber-500/25 border border-amber-400/40 text-amber-200",
    title:     "Productos Seleccionados",
    subtitle:  "Nuestra selección curada del mejor stock disponible con los mejores precios.",
    cta:       "Ver destacados",
    href:      "/catalogo?destacados=true",
  },
];

export function HeroCarousel() {
  const [current,        setCurrent]        = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 400);
  }, [isTransitioning]);

  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo]);
  const next = useCallback(() => goTo((current + 1) % slides.length),                 [current, goTo]);

  // Auto-avance
  useEffect(() => {
    const timer = setTimeout(next, 5000);
    return () => clearTimeout(timer);
  }, [current, next]);

  return (
    <section className="relative overflow-hidden select-none">

      {/* ── Slides ── */}
      <div className="relative h-[360px] sm:h-[440px] md:h-[500px] lg:h-[560px]">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out
              ${i === current ? "opacity-100 z-10" : "opacity-0 z-0"}`}
          >
            {/* Imagen de fondo */}
            <Image
              src={s.image}
              alt={s.title}
              fill
              className="object-cover"
              style={{ objectPosition: s.imagePos }}
              priority={i === 0}
              sizes="100vw"
              quality={90}
            />

            {/* Overlay: degradado izquierda → derecha para legibilidad del texto */}
            <div className={`absolute inset-0 ${s.overlay}`} />

            {/* Tratamiento de laterales: blur + viñeta progresiva para que el recorte se vea intencional */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-y-0 left-0 w-14 sm:w-20 md:w-28 lg:w-32 bg-gradient-to-r from-slate-950/65 via-slate-950/20 to-transparent backdrop-blur-md" />
              <div className="absolute inset-y-0 right-0 w-14 sm:w-20 md:w-28 lg:w-32 bg-gradient-to-l from-slate-950/65 via-slate-950/20 to-transparent backdrop-blur-md" />
            </div>

            {/* Capa extra: oscurece la franja inferior (dots/barra de progreso) */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent" />

            {/* Contenido */}
            <div className="relative z-10 container-main h-full flex items-center">
              <div className="max-w-md sm:max-w-lg">
                {/* Placa glass para separar texto de fondo y evitar solapamientos visuales */}
                <div className="inline-block rounded-2xl border border-white/10 bg-slate-950/25 backdrop-blur-md shadow-card-xl px-5 py-6 sm:px-7 sm:py-7 md:px-8 md:py-8">

                {/* Pill tag */}
                <div className={`inline-flex items-center gap-2 ${s.pillClass}
                                 text-[11px] font-semibold px-3 py-1.5 rounded-full mb-4 backdrop-blur-sm shadow-card`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {s.tag}
                </div>

                {/* Título */}
                <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white
                               leading-tight tracking-tight mb-3 drop-shadow-xl">
                  {s.title}
                </h1>

                {/* Subtítulo */}
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed mb-6
                              max-w-sm drop-shadow">
                  {s.subtitle}
                </p>

                {/* CTA */}
                <Link
                  href={s.href}
                  className="inline-flex items-center gap-2 bg-white/95 text-slate-900
                             font-bold px-5 py-2.5 rounded-xl
                             hover:bg-white transition-colors shadow-card-hover text-sm
                             ring-1 ring-white/20"
                >
                  {s.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Flecha izquierda ── */}
      <button
        onClick={prev}
        aria-label="Anterior"
        className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20
                   w-9 h-9 md:w-10 md:h-10 rounded-full
                   bg-black/30 hover:bg-black/50 border border-white/20
                   backdrop-blur-sm flex items-center justify-center
                   text-white transition-all hover:scale-105 shadow-card"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* ── Flecha derecha ── */}
      <button
        onClick={next}
        aria-label="Siguiente"
        className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20
                   w-9 h-9 md:w-10 md:h-10 rounded-full
                   bg-black/30 hover:bg-black/50 border border-white/20
                   backdrop-blur-sm flex items-center justify-center
                   text-white transition-all hover:scale-105 shadow-card"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* ── Dots de navegación ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/35 backdrop-blur-sm px-3 py-2 shadow-card">
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
      </div>

      {/* ── Barra de progreso ── */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-20">
        <div key={current} className="h-full bg-white/50 animate-shrink" />
      </div>
    </section>
  );
}
