// =============================================
// LOADING: CHECKOUT
// Skeleton animado mientras carga la página de pago.
// =============================================

export default function CheckoutLoading() {
  return (
    <div className="container-main py-8 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-4 w-16 bg-slate-200 rounded" />
        <div className="h-3 w-2 bg-slate-200 rounded" />
        <div className="h-4 w-32 bg-slate-200 rounded" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda */}
        <div className="lg:col-span-2 space-y-5">
          {/* Sección método de entrega */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-100" />
              <div className="h-5 w-40 bg-slate-100 rounded" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-100" />
              ))}
            </div>
          </div>

          {/* Sección notas */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-100" />
              <div className="h-5 w-32 bg-slate-100 rounded" />
            </div>
            <div className="h-20 w-full bg-slate-100 rounded-xl" />
          </div>
        </div>

        {/* Resumen skeleton */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
            <div className="h-5 w-40 bg-slate-100 rounded" />

            {/* Productos */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-11 h-11 rounded-lg bg-slate-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-full bg-slate-100 rounded" />
                    <div className="h-3 w-2/3 bg-slate-100 rounded" />
                  </div>
                  <div className="h-3 w-14 bg-slate-100 rounded flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* Cupón */}
            <div className="space-y-2">
              <div className="h-3.5 w-28 bg-slate-100 rounded" />
              <div className="flex gap-2">
                <div className="flex-1 h-10 bg-slate-100 rounded-xl" />
                <div className="w-20 h-10 bg-slate-100 rounded-xl" />
              </div>
            </div>

            {/* Totales */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-16 bg-slate-100 rounded" />
                  <div className="h-4 w-20 bg-slate-100 rounded" />
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-100 pt-3">
                <div className="h-5 w-12 bg-slate-100 rounded" />
                <div className="h-6 w-28 bg-slate-100 rounded" />
              </div>
            </div>

            {/* Botón */}
            <div className="h-12 w-full bg-slate-100 rounded-2xl" />
            <div className="h-3 w-40 bg-slate-100 rounded mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
