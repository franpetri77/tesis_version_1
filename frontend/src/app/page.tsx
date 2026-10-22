// =============================================
// PÁGINA DE INICIO (HOME)
// Hero carousel + secciones por departamento + productos.
// Incluye Header, Footer y UserWelcomeBar directamente
// ya que esta página está fuera del route group (public).
// =============================================

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Truck, Store, CreditCard, ShieldCheck } from "lucide-react";
import { getFeaturedProducts, getPublicProducts } from "@/lib/api/catalog";
import { ProductCard } from "@/components/catalog/ProductCard";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Inicio — Insumos Electrónicos y de Computación",
  description:
    "Tele Import S.A. — Distribuidor de componentes electrónicos, periféricos y accesorios de computación. Envío a todo el país.",
};

export const dynamic = "force-dynamic";

// -----------------------------------------------
// Secciones por departamento — slugs alineados con la tabla `categories` de la DB.
// Slugs válidos: televisores | smartphones | laptops-pcs | audio-video |
//                gaming | linea-blanca | pequenos-electro | accesorios
// -----------------------------------------------
const SHOP_SECTIONS = [
  {
    label: "Televisores",
    desc: "Smart TV, 4K, OLED y QLED",
    href: "/catalogo?categoria=televisores",
  },
  {
    label: "Smartphones",
    desc: "Celulares de todas las marcas",
    href: "/catalogo?categoria=smartphones",
  },
  {
    label: "Laptops y PCs",
    desc: "Computadoras portátiles y de escritorio",
    href: "/catalogo?categoria=laptops-pcs",
  },
  {
    label: "Audio y Video",
    desc: "Auriculares, parlantes y soundbars",
    href: "/catalogo?categoria=audio-video",
  },
  {
    label: "Gaming",
    desc: "Consolas, videojuegos y accesorios gamer",
    href: "/catalogo?categoria=gaming",
  },
  {
    label: "Línea Blanca",
    desc: "Heladeras, lavarropas y cocinas",
    href: "/catalogo?categoria=linea-blanca",
  },
  {
    label: "Pequeños Electro",
    desc: "Licuadoras, cafeteras y planchas",
    href: "/catalogo?categoria=pequenos-electro",
  },
  {
    label: "Accesorios",
    desc: "Mouse, teclados, monitores y más",
    href: "/catalogo?categoria=accesorios",
  },
];

export default async function HomePage() {
  // Intenta productos destacados; si no hay, muestra los más recientes del catálogo
  const featuredProducts = await getFeaturedProducts(8);
  const isFeatured = featuredProducts.length > 0;
  const displayProducts = isFeatured
    ? featuredProducts
    : (await getPublicProducts({ limit: 8, sort: "newest" })).products;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">

      {/* ---- HERO CAROUSEL ---- */}
      <HeroCarousel />

      {/* ---- BENEFICIOS ---- */}
      <section className="border-y border-paper-300 bg-paper-50">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { icon: Truck,       title: "Envío a todo el país", desc: "Por correo y transporte" },
              { icon: Store,       title: "Retiro en sucursal",   desc: "Sin costo, listo en 24hs" },
              { icon: CreditCard,  title: "Pago seguro",          desc: "Tarjeta, débito y transferencia" },
              { icon: ShieldCheck, title: "Garantía oficial",     desc: "Productos con factura" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex min-w-0 items-start gap-3 border-paper-300 px-3 py-7 even:border-l sm:px-6 md:py-8 lg:py-10 [&:nth-child(n+3)]:border-t md:[&:nth-child(n+3)]:border-t-0 md:[&:nth-child(3)]:border-l">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                  <p className="mt-1 text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- SECCIONES POR DEPARTAMENTO ---- */}
      <section className="bg-paper-50 py-16 lg:py-20 2xl:py-24" aria-labelledby="departamentos-heading">
        <div className="container-main">
          <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between lg:mb-12">
            <div className="min-w-0">
              <h2 id="departamentos-heading" className="titulo-display max-w-[24ch] text-3xl lg:text-4xl 2xl:text-5xl">
                Explorá por departamento
              </h2>
              <p className="mt-4 max-w-[65ch] text-base font-normal leading-relaxed text-slate-600">
                Todo lo que necesitás para tu hogar, oficina o setup
              </p>
            </div>
            <Link
              href="/catalogo"
              className="group inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-sm text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 md:self-auto"
            >
              Ver todo
              <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>

          <ol className="grid grid-cols-1 border-t border-paper-300 md:grid-cols-2 xl:grid-cols-4">
            {SHOP_SECTIONS.map((section, index) => (
              <li key={section.label} className="min-w-0 border-b border-paper-300 md:odd:border-r xl:[&:nth-child(4n+2)]:border-r xl:[&:nth-child(4n+3)]:border-r">
                <Link
                  href={section.href}
                  className="group flex h-full min-h-36 flex-col px-5 py-6 hover:bg-paper-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 md:px-6 lg:px-7 lg:py-8"
                >
                  <div className="flex items-center justify-between gap-4 text-slate-500 group-hover:text-slate-600">
                    <span className="text-xs font-normal uppercase tracking-wider tabular-nums" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-base font-medium text-slate-900 underline-offset-4 group-hover:underline lg:text-lg">{section.label}</p>
                  <p className="mt-2 text-sm font-normal text-slate-500 group-hover:text-slate-600">{section.desc}</p>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- PRODUCTOS ---- */}
      {displayProducts.length > 0 && (
        <section className="border-y border-paper-300 bg-paper-100 py-16 lg:py-20 2xl:py-24" aria-labelledby="productos-heading">
          <div className="container-main">
            <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between lg:mb-12">
              <div className="min-w-0">
                <h2 id="productos-heading" className="titulo-display max-w-[24ch] text-3xl lg:text-4xl 2xl:text-5xl">
                  {isFeatured ? "Productos destacados" : "Productos disponibles"}
                </h2>
                <p className="mt-4 max-w-[65ch] text-base font-normal leading-relaxed text-slate-600">
                  {isFeatured
                    ? "Selección curada del mejor stock disponible"
                    : "Los últimos productos en stock — actualizados permanentemente"}
                </p>
              </div>
              <Link
                href={isFeatured ? "/catalogo?destacados=true" : "/catalogo"}
                className="group inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-sm text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 md:self-auto"
              >
                Ver todos
                <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
              {displayProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* CTA hacia el catálogo completo */}
            <div className="mt-10 flex justify-start lg:mt-12">
              <Link
                href="/catalogo"
                className="group inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-paper-50 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 motion-safe:transition-colors motion-safe:duration-200"
              >
                Ver catálogo completo
                <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ---- BANNER CTA ---- */}
      <section className="bg-paper-50 py-16 lg:py-20 2xl:py-24" aria-labelledby="cotizacion-heading">
        <div className="container-main">
          <div className="flex flex-col gap-8 border-t border-paper-300 pt-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:pt-12">
            <div className="min-w-0">
              <h2 id="cotizacion-heading" className="titulo-display max-w-[24ch] text-3xl lg:text-4xl 2xl:text-5xl">
                ¿Necesitás una cotización para tu empresa?
              </h2>
              <p className="mt-4 max-w-[65ch] text-base font-normal leading-relaxed text-slate-600">
                Precios especiales por volumen para revendedores y empresas.
              </p>
            </div>
            {/* Acción principal: la consulta mayorista. El acceso al catálogo
                queda como alternativa secundaria para no competir con ella. */}
            <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Link
                href="/presupuesto"
                className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-paper-50 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 motion-safe:transition-colors motion-safe:duration-200"
              >
                Solicitar presupuesto
                <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/catalogo"
                className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
              >
                Ver catálogo
              </Link>
            </div>
          </div>
        </div>
      </section>

      </main>
      <Footer />
    </div>
  );
}
