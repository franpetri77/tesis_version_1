"use client";

// =============================================
// COMPONENTE: HERO CAROUSEL
// Portada: texto a la izquierda y fotografía a la derecha (arriba en
// celulares). Avanza sola: la foto activa se acerca lentamente y el texto
// entra escalonado. Los controles (indicadores y flechas) van sobre la
// foto, como en la mayoría de las tiendas, para no sumar una fila aparte.
// Se detiene mientras el puntero o el foco están encima y no se mueve si
// el usuario pidió reducir el movimiento. En pantallas táctiles se desliza.
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
    tag:       "Tele Import S.A.",
    title:     "Tecnología para el hogar y la oficina",
    subtitle:  "Distribución mayorista y minorista de electrónica y computación, con garantía oficial y envío a todo el país.",
    cta:       "Ver catálogo",
    href:      "/catalogo",
  },
  {
    id:       2,
    image:    "/img/hero/smartphones.jpg",
    imagePos: "45% 50%",
    tag:       "Smartphones",
    title:     "Celulares de las principales marcas",
    subtitle:  "Samsung, Motorola, Apple y otras marcas, nuevos y con garantía oficial.",
    cta:       "Ver smartphones",
    href:      "/catalogo?categoria=smartphones",
  },
  {
    id:       3,
    image:    "/img/hero/monitor.jpg",
    imagePos: "50% 45%",
    tag:       "Computación",
    title:     "Computadoras, monitores y periféricos",
    subtitle:  "Equipos para trabajo, estudio y gaming, con asesoramiento para empresas.",
    cta:       "Ver laptops y PCs",
    href:      "/catalogo?categoria=laptops-pcs",
  },
  {
    id:       4,
    image:    "/img/hero/auriculares.jpg",
    imagePos: "50% 50%",
    tag:       "Audio y video",
    title:     "Auriculares, parlantes y sonido",
    subtitle:  "Audio inalámbrico, barras de sonido y accesorios de marcas reconocidas.",
    cta:       "Ver audio y video",
    href:      "/catalogo?categoria=audio-video",
  },
];

const AUTOPLAY_MS = 6000;
const SWIPE_PX = 40;
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50";
const ON_PHOTO_FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper-50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";
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
  const swipeStart = useRef<number | null>(null);

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
  // desde ahí, igual que el indicador de progreso (mismo período).
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
        goTo(current + (backwards ? -1 : 1));
      }}
    >
      <div className="container-main py-6 md:py-8 lg:py-10">
        {/* La foto ocupa 7/12 desde lg: es lo primero que se ve de la tienda. */}
        <div className="grid items-center gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-[5fr_7fr] lg:gap-12 xl:gap-14">

          {/* ── Texto: los slides comparten una celda; el más alto reserva el
              espacio y evita saltos de layout ── */}
          <div className="grid min-w-0">
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
                    "col-start-1 row-start-1 min-w-0",
                    "motion-safe:transition-opacity motion-safe:duration-700 motion-safe:ease-out",
                    isActive ? "relative z-10 opacity-100" : "pointer-events-none opacity-0"
                  )}
                >
                  <p className={cn("text-xs font-semibold uppercase leading-normal tracking-wider text-slate-500", isActive && RISE)}>
                    {s.tag}
                  </p>
                  <Heading
                    className={cn(
                      "titulo-display mt-3 max-w-lg text-balance text-4xl sm:text-5xl lg:max-w-[15ch] xl:text-6xl 2xl:text-7xl",
                      isActive && RISE
                    )}
                    style={isActive ? { animationDelay: "90ms" } : undefined}
                  >
                    {s.title}
                  </Heading>
                  <p
                    className={cn("mt-4 max-w-md text-base leading-relaxed text-slate-600 lg:text-lg 2xl:max-w-lg", isActive && RISE)}
                    style={isActive ? { animationDelay: "180ms" } : undefined}
                  >
                    {s.subtitle}
                  </p>
                  <div className={cn(isActive && RISE)} style={isActive ? { animationDelay: "270ms" } : undefined}>
                    <Link
                      href={s.href}
                      className={cn(
                        "group mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-paper-50 hover:bg-brand-700",
                        "motion-safe:transition-colors motion-safe:duration-200",
                        FOCUS_RING
                      )}
                    >
                      {s.cta}
                      <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Foto con los controles encima ── */}
          <div
            className="relative order-first aspect-[16/10] min-w-0 touch-pan-y overflow-hidden rounded-2xl border border-paper-300 bg-slate-900 shadow-card-xl md:order-last md:aspect-[4/3] lg:aspect-[16/11]"
            onPointerDown={(e) => { if (e.pointerType !== "mouse") swipeStart.current = e.clientX; }}
            onPointerUp={(e) => {
              if (swipeStart.current === null) return;
              const dx = e.clientX - swipeStart.current;
              swipeStart.current = null;
              if (Math.abs(dx) >= SWIPE_PX) goTo(current + (dx < 0 ? 1 : -1));
            }}
            onPointerCancel={() => { swipeStart.current = null; }}
          >
            {slides.map((s, i) => {
              const isActive = i === current;
              const isLeaving = i === previous;
              return (
                <div
                  key={s.id}
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0",
                    "motion-safe:transition-opacity motion-safe:duration-700 motion-safe:ease-out",
                    isActive ? "z-10 opacity-100" : "opacity-0"
                  )}
                >
                  {/* La foto se acerca mientras el slide está activo; la que
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
                </div>
              );
            })}

            {/* Degradé inferior: da contraste a los controles sin tapar la foto */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-slate-900/55 to-transparent" aria-hidden="true" />

            <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 px-4 pb-3 sm:px-5 sm:pb-4">
              {/* Indicadores: uno por slide; el activo se llena con el mismo
                  período del reloj y se congela al pausar. */}
              <div className="flex items-center gap-1">
                {slides.map((s, i) => {
                  const isActive = i === current;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => goTo(i)}
                      aria-label={`Ir a ${i + 1} de ${slides.length}: ${s.title}`}
                      aria-current={isActive ? "true" : undefined}
                      className={cn("group/ind flex h-8 items-center rounded-sm px-1", ON_PHOTO_FOCUS)}
                    >
                      <span
                        className={cn(
                          "block h-[3px] overflow-hidden rounded-full bg-paper-50/40 motion-safe:transition-[width] motion-safe:duration-300",
                          isActive ? "w-10 sm:w-12" : "w-5 group-hover/ind:bg-paper-50/70"
                        )}
                      >
                        {isActive && (
                          pauseReasons.reduced ? (
                            <span className="block h-full bg-paper-50" />
                          ) : (
                            <span
                              key={`${current}-${runs[i]}`}
                              className="animate-promo-progress block h-full origin-left bg-paper-50"
                              style={{
                                animationDuration: `${AUTOPLAY_MS}ms`,
                                animationPlayState: isPaused ? "paused" : "running",
                              }}
                            />
                          )
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goTo(current - 1)}
                  aria-label="Anterior"
                  className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper-50/90 text-slate-800 shadow-sm hover:bg-paper-50 motion-safe:transition-colors", ON_PHOTO_FOCUS)}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => goTo(current + 1)}
                  aria-label="Siguiente"
                  className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper-50/90 text-slate-800 shadow-sm hover:bg-paper-50 motion-safe:transition-colors", ON_PHOTO_FOCUS)}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sin anuncios durante el avance automático; con hover/foco o
            movimiento reducido se anuncian los cambios pedidos por el usuario. */}
        <p className="sr-only" aria-live={isPaused ? "polite" : "off"} aria-atomic="true">
          {current + 1} de {slides.length}: {slides[current].title}
        </p>
      </div>
    </section>
  );
}
