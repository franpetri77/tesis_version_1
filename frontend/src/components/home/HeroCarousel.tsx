"use client";

// =============================================
// COMPONENTE: HERO CAROUSEL
// Portada editorial: fotografía enmarcada, titular en papel y folio.
// Un único reloj sincroniza autoavance y progreso, incluso al pausar.
// =============================================

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ArrowRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Las imágenes viven en /public/img/ y se sirven como assets estáticos
interface Slide {
  id:        number;
  image:     string;
  imagePos:  string;           // object-position CSS (e.g. "50% 40%")
  tag:       string;
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
    tag:       "Bienvenido a Tele Import",
    title:     "Tecnología para tu hogar y oficina",
    subtitle:  "TV, laptops, smartphones y más. Envío a todo el país con garantía oficial.",
    cta:       "Ver catálogo",
    href:      "/catalogo",
  },
  {
    id:       2,
    image:    "/img/banner-smartphones.jpg",
    imagePos: "50% 50%",
    tag:       "Top ventas",
    title:     "Smartphones y Celulares",
    subtitle:  "Samsung, Motorola, Apple y más. Las últimas novedades con envío a todo el país.",
    cta:       "Ver smartphones",
    href:      "/catalogo?categoria=smartphones",
  },
  {
    id:       3,
    image:    "/img/banner-destacados.jpg",
    imagePos: "50% 50%",
    tag:       "Destacados",
    title:     "Productos Seleccionados",
    subtitle:  "Nuestra selección curada del mejor stock disponible con los mejores precios.",
    cta:       "Ver destacados",
    href:      "/catalogo?destacados=true",
  },
];

const AUTOPLAY_MS = 6000;
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50";
const CONTROL_STYLE = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-paper-300 bg-paper-50 text-slate-700 hover:bg-paper-100 hover:text-slate-900 motion-safe:transition-colors motion-safe:duration-200";

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  // Un único estado de pausa conserva la decisión del usuario al salir del
  // hover/foco. Iniciar pausado evita autoplay antes de leer matchMedia.
  const [pauseReasons, setPauseReasons] = useState({
    user: true,
    pointer: false,
    focus: false,
  });
  const isPaused = pauseReasons.user || pauseReasons.pointer || pauseReasons.focus;
  const clock = useRef({ slide: 0, remaining: AUTOPLAY_MS });

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPauseReasons((reasons) => ({ ...reasons, user: preference.matches }));

    function onMotionPreferenceChange(event: MediaQueryListEvent) {
      // Reducir movimiento siempre pausa; volver a habilitarlo no revoca
      // una pausa que el usuario haya elegido explícitamente.
      if (event.matches) {
        setPauseReasons((reasons) => ({ ...reasons, user: true }));
      }
    }

    preference.addEventListener("change", onMotionPreferenceChange);
    return () => preference.removeEventListener("change", onMotionPreferenceChange);
  }, []);

  useEffect(() => {
    if (clock.current.slide !== current) {
      clock.current = { slide: current, remaining: AUTOPLAY_MS };
    }
    if (isPaused) return;

    const startedAt = performance.now();
    const timer = window.setTimeout(() => {
      setCurrent((index) => (index + 1) % slides.length);
    }, clock.current.remaining);

    return () => {
      window.clearTimeout(timer);
      clock.current.remaining = Math.max(
        0,
        clock.current.remaining - (performance.now() - startedAt)
      );
    };
  }, [current, isPaused]);

  function prev() {
    setCurrent((index) => (index - 1 + slides.length) % slides.length);
  }

  function next() {
    setCurrent((index) => (index + 1) % slides.length);
  }

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados de Tele Import"
      className="border-b border-paper-300 bg-paper-50"
      onMouseEnter={() => setPauseReasons((reasons) => ({ ...reasons, pointer: true }))}
      onMouseLeave={() => setPauseReasons((reasons) => ({ ...reasons, pointer: false }))}
      onFocusCapture={() => setPauseReasons((reasons) => ({ ...reasons, focus: true }))}
      onBlurCapture={(event) => {
        const nextFocus = event.relatedTarget;
        if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
          setPauseReasons((reasons) => ({ ...reasons, focus: false }));
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const backwards = event.key === "ArrowLeft";
        // Si el CTA va a quedar inert, mantener el foco en un control estable
        // del hero en vez de dejarlo caer al body al cambiar de slide.
        if (event.target instanceof Element && event.target.closest("a")) {
          event.currentTarget.querySelector<HTMLButtonElement>(
            `button[aria-label="${backwards ? "Anterior" : "Siguiente"}"]`
          )?.focus();
        }
        if (backwards) prev();
        else next();
      }}
    >
      <div className="container-main py-6 md:py-8 xl:py-10">
        {/* Las slides comparten una celda: la más alta reserva el espacio y
            evita saltos de layout. Solo se interpola la opacidad. */}
        <div className="grid">
          {slides.map((s, i) => {
            const isActive = i === current;
            const Heading = isActive ? "h1" : "h2";
            // React 18 necesita serializar inert como atributo HTML vacío.
            const inactiveAttributes: Record<string, string> = isActive ? {} : { inert: "" };

            return (
              <div
                key={s.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} de ${slides.length}`}
                aria-hidden={!isActive}
                {...inactiveAttributes}
                className={cn(
                  "col-start-1 row-start-1 grid min-w-0 items-center gap-6 md:grid-cols-2 md:gap-8 lg:gap-12 xl:gap-16",
                  "motion-safe:transition-opacity motion-safe:duration-500 motion-safe:ease-out",
                  isActive ? "relative z-10 opacity-100" : "pointer-events-none opacity-0"
                )}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase leading-normal tracking-wider text-slate-500">
                    {s.tag}
                  </p>
                  <Heading className="titulo-display mt-3 max-w-lg text-balance text-4xl sm:text-5xl lg:text-6xl">
                    {s.title}
                  </Heading>
                  <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600 lg:text-lg">
                    {s.subtitle}
                  </p>
                  <Link
                    href={s.href}
                    className={cn(
                      "group mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-paper-50 hover:bg-brand-700",
                      "motion-safe:transition-colors motion-safe:duration-200",
                      FOCUS_RING
                    )}
                  >
                    {s.cta}
                    <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </div>

                <div className="relative order-first aspect-[16/10] min-w-0 overflow-hidden rounded-2xl border border-paper-300 bg-paper-100 shadow-card md:order-last md:aspect-[5/4]">
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    className="object-cover"
                    style={{ objectPosition: s.imagePos }}
                    priority={i === 0}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    quality={80}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Sin anuncios durante autoplay; hover/foco o pausa explícita
            permiten anunciar los cambios solicitados por el usuario. */}
        <p className="sr-only" aria-live={isPaused ? "polite" : "off"} aria-atomic="true">
          {current + 1} de {slides.length}: {slides[current].title}
        </p>

        <div className="mt-6 flex items-center gap-4 border-t border-paper-300 pt-4 md:gap-6">
          <p className="shrink-0 text-xs font-medium uppercase tracking-wider text-slate-600 tabular-nums">
            {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </p>

          {/* CSS y timeout usan el mismo período y conservan su posición al
              pausar. Sin width animado ni actualizaciones de React por frame. */}
          <div className="h-px min-w-12 flex-1 overflow-hidden bg-paper-300" aria-hidden="true">
            <div
              key={current}
              className="animate-promo-progress h-full origin-left bg-slate-900"
              style={{
                animationDuration: `${AUTOPLAY_MS}ms`,
                animationPlayState: isPaused ? "paused" : "running",
              }}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={prev} aria-label="Anterior" className={cn(CONTROL_STYLE, FOCUS_RING)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPauseReasons((reasons) => ({ ...reasons, user: !reasons.user }))}
              aria-label={pauseReasons.user ? "Reanudar carrusel" : "Pausar carrusel"}
              className={cn(CONTROL_STYLE, FOCUS_RING)}
            >
              {pauseReasons.user ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button type="button" onClick={next} aria-label="Siguiente" className={cn(CONTROL_STYLE, FOCUS_RING)}>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
