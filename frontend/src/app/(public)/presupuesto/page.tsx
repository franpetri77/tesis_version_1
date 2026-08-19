"use client";

// =============================================
// PÁGINA: SOLICITUD DE PRESUPUESTO
// Formulario para empresas y revendedores que consultan por
// compras al por mayor. No exige cuenta: pedir registro previo
// desalentaría la consulta, que es justamente lo que se busca captar.
//
// Registro visual: serif de contraste para los títulos sobre fondo
// cálido, en lugar del blanco puro del resto del catálogo, para
// separar la pieza comercial de la navegación de productos.
// =============================================

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, CheckCircle2, AlertCircle,
  Building2, Truck, Percent, Headset,
} from "lucide-react";
import { createQuoteRequest, type QuoteRequestInput } from "@/lib/api/quotes";
import { Footer } from "@/components/layout/Footer";

// -----------------------------------------------
// Estado del formulario
// -----------------------------------------------
const formularioVacio: QuoteRequestInput = {
  company: "",
  contact_name: "",
  email: "",
  phone: "",
  tax_id: "",
  products: "",
  estimated_qty: undefined,
  message: "",
};

type Errores = Partial<Record<keyof QuoteRequestInput, string>>;

/** Valida en cliente para dar respuesta inmediata; el backend revalida igual. */
function validar(datos: QuoteRequestInput): Errores {
  const e: Errores = {};
  if (datos.contact_name.trim().length < 2) e.contact_name = "Ingresá tu nombre";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) e.email = "Correo electrónico inválido";
  if (datos.products.trim().length < 5) e.products = "Contanos qué productos necesitás";
  if (datos.estimated_qty !== undefined && datos.estimated_qty <= 0) {
    e.estimated_qty = "La cantidad debe ser mayor a cero";
  }
  return e;
}

const BENEFICIOS = [
  { icono: Percent,   titulo: "Precios por volumen",  detalle: "Escalas de descuento según cantidad." },
  { icono: Truck,     titulo: "Envíos a todo el país", detalle: "Coordinamos la logística del pedido." },
  { icono: Building2, titulo: "Facturación A",         detalle: "Comprobantes para tu empresa." },
  { icono: Headset,   titulo: "Asesor asignado",       detalle: "Un contacto directo para tu cuenta." },
];

export default function PresupuestoPage() {
  const [datos, setDatos]       = useState<QuoteRequestInput>(formularioVacio);
  const [errores, setErrores]   = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado]   = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  function actualizar<K extends keyof QuoteRequestInput>(campo: K, valor: QuoteRequestInput[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    // Limpia el error del campo apenas el usuario lo corrige, en vez de
    // esperar al próximo envío.
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  async function manejarEnvio(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);

    const problemas = validar(datos);
    if (Object.keys(problemas).length > 0) {
      setErrores(problemas);
      return;
    }

    setEnviando(true);
    try {
      await createQuoteRequest(datos);
      setEnviado(true);
    } catch (err) {
      setErrorGeneral(
        err instanceof Error ? err.message : "No pudimos enviar la solicitud. Intentá de nuevo."
      );
    } finally {
      setEnviando(false);
    }
  }

  // -----------------------------------------------
  // Confirmación
  // -----------------------------------------------
  if (enviado) {
    return (
      <div className="min-h-screen bg-paper-100 flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4 py-24">
          <div className="max-w-md w-full text-center animate-[fade-in_.5s_cubic-bezier(.4,0,.2,1)]">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />
            </div>
            <h1 className="titulo-display text-4xl mb-4">
              Solicitud recibida
            </h1>
            <p className="text-slate-600 leading-relaxed mb-8">
              Un asesor va a comunicarse con vos a la brevedad al correo{" "}
              <span className="font-medium text-slate-900">{datos.email}</span> para
              armar la propuesta.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/catalogo"
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-6 py-3 rounded-full transition-colors duration-150"
              >
                Ver catálogo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => { setDatos(formularioVacio); setEnviado(false); }}
                className="inline-flex items-center justify-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-700 font-medium px-6 py-3 rounded-full transition-colors duration-150"
              >
                Enviar otra consulta
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // -----------------------------------------------
  // Formulario
  // -----------------------------------------------
  return (
    <div className="min-h-screen bg-paper-100 flex flex-col">
      <main className="flex-1">
        {/* ── Encabezado ─────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 pt-10 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-12">
          <div className="grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-start">

            {/* ── Columna editorial ──────────────── */}
            <div className="lg:sticky lg:top-24 animate-[fade-in_.5s_cubic-bezier(.4,0,.2,1)]">
              <span className="antetitulo mb-5">
                Ventas mayoristas
              </span>
              <h1 className="titulo-display text-[2.75rem] sm:text-5xl mb-5">
                Pedí un presupuesto para tu empresa
              </h1>
              <p className="text-[17px] text-slate-600 leading-[1.65] mb-10 max-w-md">
                Contanos qué necesitás y preparamos una propuesta a medida, con
                precios por volumen y condiciones pensadas para revendedores.
              </p>

              <ul className="space-y-5">
                {BENEFICIOS.map(({ icono: Icono, titulo, detalle }) => (
                  <li key={titulo} className="flex gap-3.5">
                    <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center">
                      <Icono className="w-[18px] h-[18px] text-slate-700" strokeWidth={1.6} />
                    </span>
                    <div>
                      <p className="font-medium text-slate-900 text-[15px] leading-snug">{titulo}</p>
                      <p className="text-sm text-slate-500 leading-relaxed">{detalle}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Formulario ─────────────────────── */}
            <form
              onSubmit={manejarEnvio}
              noValidate
              className="bg-white rounded-3xl border border-slate-200/70 p-6 sm:p-9 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
            >
              {errorGeneral && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-2xl px-4 py-3 mb-6 text-sm"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorGeneral}</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-5">
                <Campo
                  etiqueta="Nombre y apellido"
                  requerido
                  valor={datos.contact_name}
                  error={errores.contact_name}
                  onChange={(v) => actualizar("contact_name", v)}
                  autoComplete="name"
                />
                <Campo
                  etiqueta="Empresa"
                  valor={datos.company ?? ""}
                  onChange={(v) => actualizar("company", v)}
                  autoComplete="organization"
                />
                <Campo
                  etiqueta="Correo electrónico"
                  requerido
                  tipo="email"
                  valor={datos.email}
                  error={errores.email}
                  onChange={(v) => actualizar("email", v)}
                  autoComplete="email"
                />
                <Campo
                  etiqueta="Teléfono"
                  tipo="tel"
                  valor={datos.phone ?? ""}
                  onChange={(v) => actualizar("phone", v)}
                  autoComplete="tel"
                />
                <Campo
                  etiqueta="CUIT"
                  valor={datos.tax_id ?? ""}
                  onChange={(v) => actualizar("tax_id", v)}
                  ayuda="Opcional, para facturación A"
                />
                <Campo
                  etiqueta="Cantidad estimada"
                  tipo="number"
                  valor={datos.estimated_qty?.toString() ?? ""}
                  error={errores.estimated_qty}
                  onChange={(v) => actualizar("estimated_qty", v ? Number(v) : undefined)}
                  ayuda="Unidades aproximadas"
                />
              </div>

              <div className="mt-5">
                <AreaTexto
                  etiqueta="¿Qué productos necesitás?"
                  requerido
                  valor={datos.products}
                  error={errores.products}
                  onChange={(v) => actualizar("products", v)}
                  filas={4}
                  marcador="Ej.: 20 monitores 24″, 15 teclados mecánicos, cables HDMI…"
                />
              </div>

              <div className="mt-5">
                <AreaTexto
                  etiqueta="Comentarios adicionales"
                  valor={datos.message ?? ""}
                  onChange={(v) => actualizar("message", v)}
                  filas={3}
                  marcador="Plazos, forma de pago, lugar de entrega…"
                />
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-medium px-6 py-3.5 rounded-full transition-[background-color,transform] duration-150 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                {enviando ? "Enviando…" : "Enviar solicitud"}
                {!enviando && <ArrowRight className="w-4 h-4" />}
              </button>

              <p className="mt-4 text-xs text-slate-400 text-center leading-relaxed">
                Usamos tus datos únicamente para responder esta consulta.
              </p>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// -----------------------------------------------
// Campos del formulario
// Definidos acá porque su registro visual es propio de esta página
// y no se reutilizan en el resto del sitio.
// -----------------------------------------------
const CLASES_CAMPO =
  "w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-300 " +
  "transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-slate-900/10";

function Campo({
  etiqueta, valor, onChange, tipo = "text", error, ayuda, requerido, autoComplete,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  tipo?: string;
  error?: string;
  ayuda?: string;
  requerido?: boolean;
  autoComplete?: string;
}) {
  const id = `campo-${etiqueta.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700 mb-1.5">
        {etiqueta}
        {requerido && <span className="text-brand-600 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={tipo}
        value={valor}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CLASES_CAMPO} ${error ? "border-red-300" : "border-slate-200 focus:border-slate-400"}`}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : ayuda ? (
        <p className="mt-1.5 text-xs text-slate-400">{ayuda}</p>
      ) : null}
    </div>
  );
}

function AreaTexto({
  etiqueta, valor, onChange, filas = 3, error, requerido, marcador,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  filas?: number;
  error?: string;
  requerido?: boolean;
  marcador?: string;
}) {
  const id = `area-${etiqueta.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700 mb-1.5">
        {etiqueta}
        {requerido && <span className="text-brand-600 ml-0.5">*</span>}
      </label>
      <textarea
        id={id}
        rows={filas}
        value={valor}
        placeholder={marcador}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CLASES_CAMPO} resize-none leading-relaxed ${error ? "border-red-300" : "border-slate-200 focus:border-slate-400"}`}
      />
      {error && <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
