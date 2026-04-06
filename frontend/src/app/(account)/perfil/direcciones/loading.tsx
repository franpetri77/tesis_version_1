// =============================================
// LOADING: DIRECCIONES
// Skeleton animado mientras carga la página de direcciones.
// =============================================

export default function AddressesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-6 w-32 bg-slate-200 rounded-lg" />
          <div className="h-4 w-52 bg-slate-100 rounded" />
        </div>
        <div className="h-8 w-24 bg-slate-100 rounded-xl" />
      </div>

      {/* Cards de direcciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-4"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="h-4 w-44 bg-slate-100 rounded" />
              <div className="h-5 w-28 bg-slate-100 rounded-full" />
            </div>
            <div className="h-3 w-56 bg-slate-100 rounded mb-1.5" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
              <div className="h-7 w-28 bg-slate-100 rounded-lg" />
              <div className="h-7 w-16 bg-slate-100 rounded-lg" />
              <div className="h-7 w-20 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
