// =============================================
// LOADING: MIS PEDIDOS
// Skeleton animado mientras carga el historial de pedidos.
// =============================================

export default function OrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Encabezado */}
      <div className="space-y-1.5">
        <div className="h-6 w-32 bg-slate-200 rounded-lg" />
        <div className="h-4 w-52 bg-slate-100 rounded" />
      </div>

      {/* Filas de pedidos */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-slate-100 rounded" />
                <div className="h-3 w-52 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-24 bg-slate-100 rounded-full" />
            </div>
            <div className="h-3 w-64 bg-slate-100 rounded mt-3" />
            <div className="mt-4 flex justify-between items-center">
              <div className="h-5 w-24 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
