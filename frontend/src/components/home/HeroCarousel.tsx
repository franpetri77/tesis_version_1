"use client";

// =============================================
// COMPONENTE: HERO CAROUSEL
// Portada editorial: fotografía enmarcada, titular en papel y folio.
// Avanza sola: la foto activa se acerca lentamente y el texto entra
// escalonado. Se detiene mientras el puntero o el foco están encima
// (para poder leer y usar el CTA) y no se mueve si el usuario pidió
// reducir el movimiento; en ese caso quedan las flechas.
// =============================================

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Fotos de Unsplash (licencia Unsplash: uso comercial libre, sin atribución
// obligatoria), descargadas a /public/img/hero/ y servidas como assets.
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
    image:    "/img/hero/escritorio.jpg",
    imagePos: "50% 55%",
    tag:       "Bienvenido a Tele Import",
    title:     "Tecnología para tu hogar y oficina",
    subtitle:  "TV, laptops, smartphones y más. Envío a todo el país con garantía oficial.",
    cta:       "Ver catálogo",
    href:      "/catalogo",
  },
  {
    id:       2,
    image:    "/img/hero/smartphones.jpg",
    imagePos: "45% 50%",
    tag:       "Top ventas",
    title:     "Smartphones y Celulares",
    subtitle:  "Samsung, Motorola, Apple y más. Las últimas novedades con envío a todo el país.",
    cta:       "Ver smartphones",
    href:      "/catalogo?categoria=smartphones",
  },
  {
    id:       3,
    image:    "/img/hero/monitor.jpg",
    imagePos: "50% 45%",
    tag:       "Destacados",
    title:     "Productos Seleccionados",
    subtitle:  "Nuestra selección curada del mejor stock disponible con los mejores precios.",
    cta:       "Ver destacados",
    href:      "/catalogo?destacados=true",
  },
  {
    id:       4,
    image:    "/img/hero/auriculares.jpg",
    imagePos: "50% 50%",
    tag:       "Audio y video",
    title:     "Sonido que se siente",
    subtitle:  "Auriculares, parlantes y soundbars para disfrutar en casa o en movimiento.",
    cta:       "Ver audio y video",
    href:      "/catalogo?categoria=audio-video",
  },
];

const AUTOPLAY_MS = 6000;
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50";
const CONTROL_STYLE = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-paper-300 bg-paper-50 text-slate-700 hover:bg-paper-100 hover:text-slate-900 motion-safe:transition-colors motion-safe:duration-200";
// Entrada escalonada del texto del slide activo (sólo con movimiento permitido)
const RISE = "motion-safe:animate-hero-rise";

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  // El slide que se está desvaneciendo conserva el acercamiento de su foto
  // durante el fundido, para que no salte a su tamaño original.
  const [previous, setPrevious] = useState<number | null>(null);
  // Cuántas veces se activó cada slide: al reactivarse se remonta la foto y
  // el acercamiento vuelve a empezar desde cero.
  const [runs, setRuns] = useState<number[]>(() => slides.map(() => 0));
  // Motivos de pausa. Arranca "reduced" hasta leer matchMedia para no
  // mover nada antes de conocer la preferencia del usuario.
  const [pauseReasons, setPauseReasons] = useState({
    reduced: true,
    pointer: false,
    focus: false,
  });
  const isPaused = pauseReasons.reduced || pauseReasons.pointer || pauseReasons.focus;
  const clock = useRef({ slide: 0, remaining: AUTOPLAY_MS });

  function goTo(index: number) {
    const to = (index + slides.length) % slides.length;
    if (to === current) return;
    setPrevious(current);
    setRuns((r) => r.map((n, i) => (i === to ? n + 1 : n)));
    setCurrent(to);
  }
  // El temporizador llama siempre a la versión actual de goTo.
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPauseReasons((reasons) => ({ ...reasons, reduced: preference.matches }));

    function onMotionPreferenceChange(event: MediaQueryListEvent) {
      setPauseReasons((reasons) => ({ ...reasons, reduced: event.matches }));
    }

    preference.addEventListener("change", onMotionPreferenceChange);
    return () => preference.removeEventListener("change", onMotionPreferenceChange);
  }, []);

  // Un único reloj: al pausar guarda lo que faltaba y al reanudar sigue
  // desde ahí, igual que la barra de progreso (que usa el mismo período).
  useEffect(() => {
    if (clock.current.slide !== current) {
      clock.current = { slide: current, remaining: AUTOPLAY_MS };
    }
    if (isPaused) return;

    const startedAt = performance.now();
    const timer = window.setTimeout(() => goToRef.current(current + 1), clock.current.remaining);

    return () => {
      window.clearTimeout(timer);
      clock.current.remaining = Math.max(
        0,
        clock.current.remaining - (performance.now() - startedAt)
      );
    };
  }, [current, isPaused]);

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados de Tele Import"
      className="border-b border-paper-300 bg-paper-50 lg:flex lg:min-h-[min(calc(100svh-6.125rem),56rem)] lg:items-center"
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
        goTo(current + (backwards ? -1 : 1));
      }}
    >
      <div className="container-main py-6 md:py-8 lg:w-full xl:py-10">
        {/* Las slides comparten una celda: la más alta reserva el espacio y
            evita saltos de layout. */}
        <div className="grid">
          {slides.map((s, i) => {
            const isActive = i === current;
            const isLeaving = i === previous;
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
                  "col-start-1 row-start-1 grid min-w-0 items-center gap-6 md:grid-cols-2 md:gap-8 lg:gap-12 xl:gap-16 2xl:grid-cols-[5fr_7fr]",
                  "motion-safe:transition-opacity motion-safe:duration-700 motion-safe:ease-out",
                  isActive ? "relative z-10 opacity-100" : "pointer-events-none opacity-0"
                )}
              >
                <div className="min-w-0">
                  <p
                    className={cn("text-xs font-semibold uppercase leading-normal tracking-wider text-brand-600", isActive && RISE)}
                  >
                    {s.tag}
                  </p>
                  <Heading
                    className={cn(
                      "titulo-display mt-3 max-w-lg text-balance text-4xl sm:text-5xl lg:max-w-[14ch] lg:text-6xl 2xl:text-7xl 3xl:text-8xl",
                      isActive && RISE
                    )}
                    style={isActive ? { animationDelay: "90ms" } : undefined}
                  >
                    {s.title}
                  </Heading>
                  <p
                    className={cn("mt-4 max-w-md text-base leading-relaxed text-slate-600 lg:text-lg 2xl:max-w-lg 2xl:text-xl", isActive && RISE)}
                    style={isActive ? { animationDelay: "180ms" } : undefined}
                  >
                    {s.subtitle}
                  </p>
                  <div className={cn(isActive && RISE)} style={isActive ? { animationDelay: "270ms" } : undefined}>
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
                </div>

                <div className="relative order-first aspect-[16/10] min-w-0 overflow-hidden rounded-2xl border border-paper-300 bg-slate-900 shadow-card md:order-last md:aspect-[5/4]">
                  {/* La foto se acerca mientras el slide está activo; el que
                      sale conserva su encuadre durante el fundido. */}
                  <div
                    key={runs[i]}
                    className={cn(
                      "absolute inset-0 will-change-transform",
                      (isActive || isLeaving) && "motion-safe:animate-hero-zoom"
                    )}
                    style={{ animationPlayState: isActive && isPaused ? "paused" : "running" }}
                  >
                    <Image
                      src={s.image}
                      alt=""
                      fill
                      className="object-cover"
                      style={{ objectPosition: s.imagePos }}
                      priority={i === 0}
                      sizes="(min-width: 1536px) 58vw, (min-width: 768px) 50vw, 100vw"
                      quality={80}
                    />
                  </div>
                  {/* Viñeta suave para dar profundidad sin tapar la foto */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent" aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Sin anuncios durante el avance automático; con hover/foco o
            movimiento reducido se anuncian los cambios pedidos por el usuario. */}
        <p className="sr-only" aria-live={isPaused ? "polite" : "off"} aria-atomic="true">
          {current + 1} de {slides.length}: {slides[current].title}
        </p>

        <div className="mt-6 flex items-center gap-4 border-t border-paper-300 pt-4 md:gap-6 lg:w-[calc((100%_-_3rem)/2)] xl:w-[calc((100%_-_4rem)/2)] 2xl:w-[calc((100%_-_4rem)*5/12)]">
          <p className="shrink-0 text-xs font-medium uppercase tracking-wider text-slate-600 tabular-nums">
            {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </p>

          {/* Un segmento por slide: los ya vistos llenos, el activo avanza
              con el mismo período que el reloj y se congela al pausar. */}
          <div className="flex min-w-12 flex-1 items-center gap-1.5" aria-hidden="true">
            {slides.map((s, i) => (
              <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-paper-300">
                {(i < current || (i === current && pauseReasons.reduced)) && <div className="h-full bg-slate-900" />}
                {i === current && !pauseReasons.reduced && (
                  <div
                    key={`${current}-${runs[i]}`}
                    className="animate-promo-progress h-full origin-left bg-slate-900"
                    style={{
                      animationDuration: `${AUTOPLAY_MS}ms`,
                      animationPlayState: isPaused ? "paused" : "running",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => goTo(current - 1)} aria-label="Anterior" className={cn(CONTROL_STYLE, FOCUS_RING)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => goTo(current + 1)} aria-label="Siguiente" className={cn(CONTROL_STYLE, FOCUS_RING)}>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
