"use client";

// =============================================
// COMPONENTE: PROMO BANNER — Mini carrusel de catálogo
// Banner compacto horizontal con 3 slides promocionales.
// Rotación automática cada 4s. Indicadores discretos.
// Diseño premium tech con gradientes y detalles glassmorphism.
// =============================================

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Truck,
  Sparkles,
} from "lucide-react";

interface PromoSlide {
  id: number;
  icon: React.ReactNode;
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  /** Clases Tailwind para el gradiente de fondo del slide */
  gradient: string;
  /** Clase de color del acento (pill, dots, barra) */
  accent: string;
  /** Esferas decorativas flotantes */
  orbs: { size: string; pos: string; color: string }[];
}

const slides: PromoSlide[] = [
  {
    id: 1,
    icon: <Zap className="w-4 h-4" />,
    tag: "Ofertas de la semana",
    title: "Los mejores precios en tecnología",
    subtitle: "Hasta 30 % OFF en productos seleccionados · Solo por tiempo limitado",
    cta: "Ver ofertas",
    href: "/catalogo?destacados=true",
    gradient:
      "from-[#0f172a] via-[#1e3a5f] to-[#0f172a]",
    accent: "brand",
    orbs: [
      { size: "w-32 h-32", pos: "-top-10 -right-6",  color: "bg-blue-500/15" },
      { size: "w-20 h-20", pos: "bottom-0 right-24", color: "bg-brand-400/10" },
    ],
  },
  {
    id: 2,
    icon: <Truck className="w-4 h-4" />,
    tag: "Financiación disponible",
    title: "Hasta 12 cuotas sin interés",
    subtitle: "Envío rápido a todo el país · Medios de pago seguros y convenientes",
    cta: "Más información",
    href: "/catalogo",
    gradient:
      "from-[#0c1f15] via-[#0f3d28] to-[#0c1f15]",
    accent: "emerald",
    orbs: [
      { size: "w-36 h-36", pos: "-top-14 right-10",  color: "bg-emerald-500/15" },
      { size: "w-16 h-16", pos: "bottom-2 right-36", color: "bg-teal-400/12"   },
    ],
  },
  {
    id: 3,
    icon: <Sparkles className="w-4 h-4" />,
    tag: "Nuevos ingresos",
    title: "Lo último en tecnología llegó",
    subtitle: "Smart TVs, laptops ultradelgadas y accesorios · Beneficios exclusivos online",
    cta: "Explorar novedades",
    href: "/catalogo",
    gradient:
      "from-[#1a1030] via-[#2d1a54] to-[#1a1030]",
    accent: "violet",
    orbs: [
      { size: "w-40 h-40", pos: "-top-16 right-4",   color: "bg-violet-500/15" },
      { size: "w-24 h-24", pos: "bottom-0 right-32", color: "bg-purple-400/10" },
    ],
  },
];

// Mapa de colores de acento para pill y dots
const accentMap: Record<string, { pill: string; dot: string; bar: string }> = {
  brand:   { pill: "bg-blue-500/20 border-blue-400/30 text-blue-200",   dot: "bg-blue-400",   bar: "bg-blue-400"   },
  emerald: { pill: "bg-emerald-500/20 border-emerald-400/30 text-emerald-200", dot: "bg-emerald-400", bar: "bg-emerald-400" },
  violet:  { pill: "bg-violet-500/20 border-violet-400/30 text-violet-200",  dot: "bg-violet-400", bar: "bg-violet-400"  },
};

const INTERVAL_MS = 4000;

export function PromoBanner() {
  const [current, setCurrent]             = useState(0);
  const [isTransitioning, setTransition]  = useState(false);
  const [progress, setProgress]           = useState(0);
  const progressRef                       = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRef                           = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animar la barra de progreso
  const startProgress = useCallback(() => {
    setProgress(0);
    const step   = 100 / (INTERVAL_MS / 50);
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + step, 100));
    }, 50);
  }, []);

  const stopProgress = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      stopProgress();
      if (autoRef.current) clearTimeout(autoRef.current);
      setTransition(true);
      setCurrent(index);
      setTimeout(() => {
        setTransition(false);
        startProgress();
      }, 420);
    },
    [isTransitioning, startProgress, stopProgress],
  );

  const next = useCallback(
    () => goTo((current + 1) % slides.length),
    [current, goTo],
  );

  // Auto-advance
  useEffect(() => {
    startProgress();
    autoRef.current = setTimeout(next, INTERVAL_MS);
    return () => {
      stopProgress();
      if (autoRef.current) clearTimeout(autoRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const slide  = slides[current];
  const colors = accentMap[slide.accent];

  return (
    <div className="relative w-full mb-7 overflow-hidden rounded-2xl select-none"
         style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10)" }}>

      {/* ── Slides ── */}
      <div className="relative h-[90px] sm:h-[88px]">
        {slides.map((s, i) => {
          const c = accentMap[s.accent];
          return (
            <div
              key={s.id}
              aria-hidden={i !== current}
              className={[
                "absolute inset-0 transition-opacity duration-[420ms] ease-in-out",
                "bg-gradient-to-r",
                s.gradient,
                i === current ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
              ].join(" ")}
            >
              {/* Esferas decorativas flotantes */}
              {s.orbs.map((orb, oi) => (
                <div
                  key={oi}
                  className={[
                    "absolute rounded-full blur-2xl pointer-events-none",
                    orb.size, orb.pos, orb.color,
                  ].join(" ")}
                />
              ))}

              {/* Líneas tech sutiles (SVG) */}
              <svg
                className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none"
                preserveAspectRatio="none"
                viewBox="0 0 400 90"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line x1="0" y1="30" x2="400" y2="30" stroke="white" strokeWidth="0.5" />
                <line x1="0" y1="60" x2="400" y2="60" stroke="white" strokeWidth="0.5" />
                <line x1="100" y1="0" x2="100" y2="90" stroke="white" strokeWidth="0.5" />
                <line x1="250" y1="0" x2="250" y2="90" stroke="white" strokeWidth="0.5" />
                <line x1="340" y1="0" x2="340" y2="90" stroke="white" strokeWidth="0.5" />
              </svg>

              {/* Contenido */}
              <div className="relative z-10 h-full flex items-center px-5 sm:px-7 gap-4">

                {/* Ícono circular */}
                <div className={[
                  "hidden sm:flex flex-shrink-0 w-9 h-9 rounded-full items-center justify-center",
                  "border border-white/15 bg-white/10 backdrop-blur-sm text-white",
                ].join(" ")}>
                  {s.icon}
                </div>

                {/* Texto */}
                <div className="flex-1 min-w-0">
                  {/* Pill tag */}
                  <div className={[
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border",
                    "text-[10px] font-semibold mb-1 backdrop-blur-sm",
                    c.pill,
                  ].join(" ")}>
                    <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                    {s.tag}
                  </div>

                  <p className="text-[14px] sm:text-[15px] font-bold text-white leading-tight tracking-tight truncate">
                    {s.title}
                  </p>
                  <p className="text-[11px] sm:text-[11.5px] text-white/55 leading-tight mt-0.5 truncate hidden xs:block">
                    {s.subtitle}
                  </p>
                </div>

                {/* CTA */}
                <Link
                  href={s.href}
                  className={[
                    "hidden sm:inline-flex flex-shrink-0 items-center gap-1.5",
                    "text-[11.5px] font-semibold text-white/90 hover:text-white",
                    "bg-white/10 hover:bg-white/18 border border-white/15",
                    "px-3.5 py-2 rounded-xl transition-all duration-200",
                    "backdrop-blur-sm whitespace-nowrap",
                  ].join(" ")}
                >
                  {s.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                {/* Dots nav */}
                <div className="flex-shrink-0 flex flex-col gap-1.5 items-center ml-2 sm:ml-3">
                  {slides.map((_, di) => (
                    <button
                      key={di}
                      onClick={() => goTo(di)}
                      aria-label={`Slide ${di + 1}`}
                      className={[
                        "rounded-full transition-all duration-300",
                        di === current
                          ? `w-1.5 h-4 ${c.dot}`
                          : "w-1.5 h-1.5 bg-white/25 hover:bg-white/50",
                      ].join(" ")}
                    />
                  ))}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* ── Barra de progreso ── */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/8 z-20">
        <div
          className={`h-full transition-none ${colors.bar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
