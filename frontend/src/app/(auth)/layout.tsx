// =============================================
// LAYOUT DE AUTENTICACIÓN
// Panel dividido: branding a la izquierda, formulario a la derecha.
// Sin header/footer para experiencia enfocada.
// =============================================

import Link from "next/link";
import { Zap, ShieldCheck, Truck, Tag } from "lucide-react";

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

        {/* Contenido del formulario */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
