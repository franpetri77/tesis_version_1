// =============================================
// LOADING: CATÁLOGO
// Skeleton animado que se muestra mientras carga la página.
// =============================================

export default function CatalogLoading() {
  return (
    <div className="container-main py-8">
      {/* Encabezado skeleton */}
      <div className="h-8 bg-slate-100 rounded-lg w-48 mb-2 animate-pulse" />
      <div className="h-4 bg-slate-100 rounded w-32 mb-6 animate-pulse" />

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar skeleton */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="h-4 bg-slate-100 rounded w-20 animate-pulse" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 bg-slate-100 rounded w-full animate-pulse" />
            ))}
            <div className="h-px bg-slate-100" />
            <div className="h-4 bg-slate-100 rounded w-24 animate-pulse" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3 bg-slate-100 rounded w-full animate-pulse" />
            ))}
          </div>
        </aside>

        {/* Grid skeleton */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-100 overflow-hidden animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="aspect-square bg-slate-100" />
              <div className="p-3.5 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-5 bg-slate-100 rounded w-1/2 mt-3" />
                <div className="h-8 bg-slate-100 rounded-lg w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
