// =============================================
// LAYOUT DE AUTENTICACIÓN
// Panel dividido: branding a la izquierda, formulario a la derecha.
// Sin header/footer para experiencia enfocada.
// =============================================

import Link from "next/link";
import { Zap, ShieldCheck, Truck, Tag, Star } from "lucide-react";

const benefits = [
  { icon: ShieldCheck, text: "Pago 100% seguro con Mercado Pago" },
  { icon: Truck,       text: "Envío a todo el país" },
  { icon: Tag,         text: "Precios competitivos y stock permanente" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* ---- PANEL IZQUIERDO — BRANDING ---- */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col bg-slate-900 relative overflow-hidden">
        {/* Patrón de fondo */}
        <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
        {/* Blob de acento */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-brand-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-brand-700/15 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col flex-1 p-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight">
              Tele Import
              <span className="text-slate-500 font-normal text-xs ml-0.5">S.A.</span>
            </span>
          </Link>

          {/* Tagline */}
          <div className="mt-auto mb-auto pt-16">
            <h2 className="text-3xl font-bold text-white leading-snug tracking-tight">
              Insumos electrónicos<br />
              <span className="text-brand-400">al mejor precio</span>
            </h2>
            <p className="text-slate-400 mt-4 text-sm leading-relaxed max-w-xs">
              Componentes, periféricos y accesorios para profesionales y entusiastas.
              Distribución mayorista y minorista en Argentina.
            </p>

            {/* Beneficios */}
            <ul className="mt-8 space-y-3.5">
              {benefits.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-brand-400" />
                  </div>
                  <span className="text-sm text-slate-400">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer del panel */}
          <p className="text-xs text-slate-600 mt-auto">
            © {new Date().getFullYear()} Tele Import S.A. · Buenos Aires, Argentina
          </p>
        </div>
      </div>

      {/* ---- PANEL DERECHO — FORMULARIO ---- */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Barra superior mínima (solo mobile) */}
        <nav className="lg:hidden bg-white border-b border-slate-200 h-14 flex items-center px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-slate-900">Tele Import S.A.</span>
          </Link>
        </nav>

        {/* ── Banner de marca — solo mobile/tablet (el panel lateral lo cubre en desktop) ── */}
        <div className="lg:hidden mx-5 mt-6 bg-slate-900 rounded-2xl px-5 py-5 relative overflow-hidden">
          {/* Destellos decorativos */}
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand-600/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-6 bottom-0 w-28 h-28 rounded-full bg-brand-700/10 blur-2xl pointer-events-none" />

          <div className="relative">
            <p className="text-white font-bold text-[15px] leading-snug mb-1">
              Insumos electrónicos<br />
              <span className="text-brand-400">al mejor precio</span>
            </p>
            <p className="text-slate-400 text-xs leading-relaxed mb-3 max-w-xs">
              TV, smartphones, laptops y más. Garantía oficial y envío a todo el país.
            </p>

            {/* Beneficios compactos */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {benefits.map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Icon className="w-3 h-3 text-brand-500 flex-shrink-0" />
                  {text}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Star className="w-3 h-3 text-brand-500 flex-shrink-0" />
                Distribuidor oficial
              </span>
            </div>
          </div>
        </div>

        {/* Contenido del formulario */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
