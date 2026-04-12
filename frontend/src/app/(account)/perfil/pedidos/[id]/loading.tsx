// =============================================
// LOADING: DETALLE DE PEDIDO
// Skeleton animado mientras carga el detalle del pedido.
// =============================================

export default function OrderDetailLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Link de regreso */}
      <div className="h-4 w-28 bg-slate-200 rounded" />

      {/* Encabezado del pedido */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-5 w-44 bg-slate-100 rounded" />
            <div className="h-3 w-48 bg-slate-100 rounded" />
          </div>
          <div className="h-7 w-28 bg-slate-100 rounded-full" />
        </div>
        {/* Barra de progreso */}
        <div className="mt-5 flex items-center gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-100 flex-shrink-0" />
              {i < 5 && <div className="h-0.5 flex-1 mx-1 bg-slate-100" />}
            </div>
          ))}
        </div>
      </div>

      {/* Ítems */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="h-4 w-20 bg-slate-100 rounded" />
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3 py-3 border-t border-slate-100 first:border-0 first:pt-0">
            <div className="w-14 h-14 rounded-lg bg-slate-100 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
              <div className="h-3 w-1/3 bg-slate-100 rounded" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
            <div className="h-4 w-16 bg-slate-100 rounded flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Resumen de montos */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="h-4 w-20 bg-slate-100 rounded" />
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-5 w-1/2 bg-slate-100 rounded" />
      </div>

      {/* Entrega */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="h-4 w-16 bg-slate-100 rounded" />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-36 bg-slate-100 rounded" />
            <div className="h-3 w-52 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
