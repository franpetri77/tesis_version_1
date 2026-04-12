// =============================================
// LOADING: CARRITO
// Skeleton animado mientras carga la página del carrito.
// =============================================

export default function CartLoading() {
  return (
    <div className="container-main py-8 animate-pulse">
      {/* Título */}
      <div className="h-8 w-56 bg-slate-200 rounded-lg mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de ítems skeleton */}
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 bg-white rounded-xl border border-slate-200 p-4"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-[72px] h-[72px] rounded-xl bg-slate-100 flex-shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-full bg-slate-100 rounded" />
                  <div className="h-3.5 w-2/3 bg-slate-100 rounded" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
                <div className="h-4 w-16 bg-slate-100 rounded mt-2" />
              </div>
              <div className="flex flex-col items-end justify-between flex-shrink-0">
                <div className="h-5 w-20 bg-slate-100 rounded" />
                <div className="flex items-center gap-2">
                  <div className="w-24 h-8 bg-slate-100 rounded-lg" />
                  <div className="w-8 h-8 bg-slate-100 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
          <div className="h-4 w-40 bg-slate-100 rounded mt-2" />
        </div>

        {/* Resumen skeleton */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="h-5 w-36 bg-slate-100 rounded" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-16 bg-slate-100 rounded" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-10 bg-slate-100 rounded" />
                <div className="h-3 w-40 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 flex justify-between">
              <div className="h-5 w-28 bg-slate-100 rounded" />
              <div className="h-6 w-24 bg-slate-100 rounded" />
            </div>
            <div className="h-12 w-full bg-slate-100 rounded-xl" />
            <div className="h-3 w-40 bg-slate-100 rounded mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
