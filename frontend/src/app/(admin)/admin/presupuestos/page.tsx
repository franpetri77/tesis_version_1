"use client";

// =============================================
// PÁGINA ADMIN: SOLICITUDES DE PRESUPUESTO
// Lista las consultas mayoristas recibidas desde el formulario
// público y permite seguir su tratamiento con un estado.
// =============================================

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Mail, Phone, Building2, Hash, Package } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  getQuoteRequests, updateQuoteStatus,
  type QuoteRequest, type QuoteStatus,
} from "@/lib/api/quotes";

function getToken(): string {
  return (typeof window !== "undefined" ? localStorage.getItem("tele_import_token") : null) ?? "";
}

// Etiquetas y color de cada estado del circuito de atención.
const ESTADOS: Record<QuoteStatus, { etiqueta: string; clase: string }> = {
  pending:   { etiqueta: "Pendiente",  clase: "bg-amber-50 text-amber-700 ring-amber-200" },
  in_review: { etiqueta: "En revisión", clase: "bg-blue-50 text-blue-700 ring-blue-200" },
  quoted:    { etiqueta: "Cotizada",   clase: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  closed:    { etiqueta: "Cerrada",    clase: "bg-slate-100 text-slate-600 ring-slate-200" },
};

const FILTROS: { valor: QuoteStatus | "todas"; etiqueta: string }[] = [
  { valor: "todas",     etiqueta: "Todas" },
  { valor: "pending",   etiqueta: "Pendientes" },
  { valor: "in_review", etiqueta: "En revisión" },
  { valor: "quoted",    etiqueta: "Cotizadas" },
  { valor: "closed",    etiqueta: "Cerradas" },
];

export default function AdminPresupuestosPage() {
  const [filtro, setFiltro] = useState<QuoteStatus | "todas">("todas");
  const qc = useQueryClient();

  const { data: solicitudes = [], isLoading, isError } = useQuery({
    queryKey: ["admin-quotes", filtro],
    queryFn: () => getQuoteRequests(getToken(), filtro === "todas" ? undefined : filtro),
    staleTime: 15_000,
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      updateQuoteStatus(getToken(), id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quotes"] }),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-600" strokeWidth={1.8} />
          Solicitudes de presupuesto
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Consultas mayoristas recibidas desde el formulario público.
        </p>
      </header>

      {/* Filtros por estado */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-150",
              filtro === f.valor
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            )}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando solicitudes…</p>}
      {isError && (
        <p className="text-sm text-red-600">
          No se pudieron cargar las solicitudes. Verificá tu sesión de administrador.
        </p>
      )}

      {!isLoading && !isError && solicitudes.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <Package className="w-9 h-9 text-slate-300 mx-auto mb-3" strokeWidth={1.4} />
          <p className="text-slate-500 text-sm">Todavía no hay solicitudes en esta categoría.</p>
        </div>
      )}

      <div className="space-y-4">
        {solicitudes.map((s) => (
          <TarjetaSolicitud
            key={s.id}
            solicitud={s}
            onCambiarEstado={(status) => cambiarEstado.mutate({ id: s.id, status })}
            actualizando={cambiarEstado.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function TarjetaSolicitud({
  solicitud, onCambiarEstado, actualizando,
}: {
  solicitud: QuoteRequest;
  onCambiarEstado: (s: QuoteStatus) => void;
  actualizando: boolean;
}) {
  const estado = ESTADOS[solicitud.status];

  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-slate-900">{solicitud.contact_name}</h2>
            <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1", estado.clase)}>
              {estado.etiqueta}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{formatDate(solicitud.created_at)}</p>
        </div>

        <select
          value={solicitud.status}
          disabled={actualizando}
          onChange={(e) => onCambiarEstado(e.target.value as QuoteStatus)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50"
          aria-label="Cambiar estado de la solicitud"
        >
          {Object.entries(ESTADOS).map(([valor, { etiqueta }]) => (
            <option key={valor} value={valor}>{etiqueta}</option>
          ))}
        </select>
      </div>

      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
        <Dato icono={Mail} etiqueta="Correo" valor={solicitud.email} />
        {solicitud.company  && <Dato icono={Building2} etiqueta="Empresa"  valor={solicitud.company} />}
        {solicitud.phone    && <Dato icono={Phone}     etiqueta="Teléfono" valor={solicitud.phone} />}
        {solicitud.tax_id   && <Dato icono={Hash}      etiqueta="CUIT"     valor={solicitud.tax_id} />}
        {solicitud.estimated_qty !== null && (
          <Dato icono={Package} etiqueta="Cantidad estimada" valor={`${solicitud.estimated_qty} u.`} />
        )}
      </dl>

      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
            Productos solicitados
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
            {solicitud.products}
          </p>
        </div>
        {solicitud.message && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Comentarios
            </p>
            <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
              {solicitud.message}
            </p>
          </div>
        )}
      </div>

      <a
        href={`mailto:${solicitud.email}?subject=Presupuesto Tele Import S.A.`}
        className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors duration-150"
      >
        <Mail className="w-4 h-4" />
        Responder por correo
      </a>
    </article>
  );
}

function Dato({
  icono: Icono, etiqueta, valor,
}: {
  icono: typeof Mail;
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icono className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" strokeWidth={1.6} />
      <div className="min-w-0">
        <dt className="sr-only">{etiqueta}</dt>
        <dd className="text-slate-700 break-words">{valor}</dd>
      </div>
    </div>
  );
}
