// =============================================
// PÁGINA DE INICIO (HOME)
// Hero carousel estilo Venex + secciones por departamento
// + productos destacados.
// Renderizada en servidor para SEO óptimo.
// =============================================

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Truck, Store, CreditCard, ShieldCheck } from "lucide-react";
import { getFeaturedProducts } from "@/lib/api/catalog";
import { ProductCard } from "@/components/catalog/ProductCard";
import { HeroCarousel } from "@/components/home/HeroCarousel";

export const metadata: Metadata = {
  title: "Inicio — Insumos Electrónicos y de Computación",
  description:
    "Tele Import S.A. — Distribuidor de componentes electrónicos, periféricos y accesorios de computación. Envío a todo el país.",
};

export const revalidate = 300;

// -----------------------------------------------
// Secciones principales de la tienda (estilo departamentos)
// -----------------------------------------------
const SHOP_SECTIONS = [
  {
    label: "Gaming",
    desc: "Componentes, periféricos y accesorios gamer",
    href: "/catalogo?categoria=componentes",
    icon: "🎮",
    from: "from-red-700",
    to: "to-red-900",
    ring: "ring-red-500/20",
  },
  {
    label: "Electrónica",
    desc: "Procesadores, memorias y almacenamiento",
    href: "/catalogo?categoria=procesadores",
    icon: "⚡",
    from: "from-blue-700",
    to: "to-blue-900",
    ring: "ring-blue-500/20",
  },
  {
    label: "Audio",
    desc: "Auriculares, parlantes y micrófonos",
    href: "/catalogo?categoria=audio",
    icon: "🎧",
    from: "from-violet-700",
    to: "to-violet-900",
    ring: "ring-violet-500/20",
  },
  {
    label: "Monitores",
    desc: "Pantallas Full HD, 4K y gaming",
    href: "/catalogo?categoria=monitores",
    icon: "🖥️",
    from: "from-emerald-700",
    to: "to-emerald-900",
    ring: "ring-emerald-500/20",
  },
  {
    label: "Networking",
    desc: "Routers, switches y conectividad",
    href: "/catalogo?categoria=redes",
    icon: "📡",
    from: "from-cyan-700",
    to: "to-cyan-900",
    ring: "ring-cyan-500/20",
  },
  {
    label: "Periféricos",
    desc: "Teclados, mouses y webcams",
    href: "/catalogo?categoria=perifericos",
    icon: "🖱️",
    from: "from-orange-600",
    to: "to-orange-800",
    ring: "ring-orange-500/20",
  },
  {
    label: "Cables",
    desc: "HDMI, USB, fibra óptica y más",
    href: "/catalogo?categoria=cables",
    icon: "🔌",
    from: "from-slate-600",
    to: "to-slate-800",
    ring: "ring-slate-500/20",
  },
  {
    label: "Almacenamiento",
    desc: "SSD, HDD y memorias USB",
    href: "/catalogo?categoria=almacenamiento",
    icon: "💾",
    from: "from-amber-600",
    to: "to-amber-800",
    ring: "ring-amber-500/20",
  },
];

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts(8);

  return (
    <>
      {/* ---- HERO CAROUSEL ---- */}
      <HeroCarousel />

      {/* ---- BENEFICIOS ---- */}
      <section className="bg-white border-b border-slate-100">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
            {[
              { icon: Truck,       title: "Envío a todo el país", desc: "Por correo y transporte" },
              { icon: Store,       title: "Retiro en sucursal",   desc: "Sin costo, listo en 24hs" },
              { icon: CreditCard,  title: "Pago seguro",          desc: "Tarjeta, débito y transferencia" },
              { icon: ShieldCheck, title: "Garantía oficial",     desc: "Productos con factura" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 px-6 py-5">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-brand-600" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">{title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- SECCIONES POR DEPARTAMENTO ---- */}
      <section className="py-14 bg-slate-950">
        <div className="container-main">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Explorá por departamento
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Todo lo que necesitás para tu hogar, oficina o setup
              </p>
            </div>
            <Link
              href="/catalogo"
              className="text-sm text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 transition-colors"
            >
              Ver todo
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {SHOP_SECTIONS.map((section) => (
              <Link
                key={section.label}
                href={section.href}
                className={`
                  group relative overflow-hidden rounded-2xl p-5
                  bg-gradient-to-br ${section.from} ${section.to}
                  ring-1 ${section.ring}
                  hover:scale-[1.02] hover:shadow-2xl
                  transition-all duration-300 ease-out
                `}
              >
                {/* Destello de fondo */}
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-2xl group-hover:scale-150 transition-transform duration-500" />

                <div className="relative z-10">
                  <span className="text-3xl leading-none block mb-3">{section.icon}</span>
                  <p className="font-bold text-white text-sm leading-tight">{section.label}</p>
                  <p className="text-white/60 text-[11px] mt-1 leading-snug line-clamp-2">
                    {section.desc}
                  </p>
                </div>

                {/* Flecha en hover */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <ArrowRight className="w-4 h-4 text-white/70" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- PRODUCTOS DESTACADOS ---- */}
      {featuredProducts.length > 0 && (
        <section className="py-14 bg-slate-50">
          <div className="container-main">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Productos destacados
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Selección curada del mejor stock disponible
                </p>
              </div>
              <Link
                href="/catalogo?destacados=true"
                className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 transition-colors"
              >
                Ver todos
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- BANNER CTA ---- */}
      <section className="py-16 bg-white">
        <div className="container-main">
          <div className="bg-slate-900 rounded-2xl px-8 md:px-12 py-10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />
            <div className="relative">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                ¿Necesitás una cotización para tu empresa?
              </h3>
              <p className="text-slate-400 text-sm">
                Precios especiales por volumen para revendedores y empresas.
              </p>
            </div>
            <Link
              href="/catalogo"
              className="relative flex-shrink-0 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Ver catálogo completo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
