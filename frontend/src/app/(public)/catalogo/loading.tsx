// =============================================
// LOADING: CATÁLOGO
// Skeleton animado mientras carga la página.
// Replica la estructura visual del catálogo:
// sidebar + grid de cards, con proporciones exactas.
// =============================================

export default function CatalogLoading() {
  return (
    <div className="container-main py-7">

      {/* ── Breadcrumb skeleton ── */}
      <div className="flex items-center gap-2 mb-4 animate-pulse">
        <div className="h-3 w-10 bg-slate-200 rounded" />
        <div className="h-3 w-1.5 bg-slate-100 rounded" />
        <div className="h-3 w-16 bg-slate-200 rounded" />
      </div>

      {/* ── Encabezado skeleton ── */}
      <div className="flex items-center gap-3 mb-7 animate-pulse">
        <div className="hidden sm:block w-1 h-8 bg-slate-200 rounded-full flex-shrink-0" />
        <div>
          <div className="h-6 bg-slate-200 rounded-lg w-48 mb-2" />
          <div className="h-3.5 bg-slate-100 rounded w-28" />
        </div>
      </div>

      <div className="flex gap-6 items-start">

        {/* ── Sidebar skeleton ── */}
        <aside className="hidden md:block w-[220px] lg:w-[240px] flex-shrink-0 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden
                          shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {/* Franja de acento */}
            <div className="h-[3px] bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
            <div className="p-4 pb-5 space-y-4 animate-pulse">
              {/* Header filtros */}
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-slate-100" />
                <div className="h-3.5 w-14 bg-slate-200 rounded" />
              </div>
              {/* Sección categorías */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center px-1">
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                  <div className="w-3.5 h-3.5 bg-slate-100 rounded" />
                </div>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-8 bg-slate-50 rounded-lg mx-0.5" />
                ))}
              </div>
              {/* Sección precio */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center px-1">
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                  <div className="w-3.5 h-3.5 bg-slate-100 rounded" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-9 bg-slate-50 rounded-lg border border-slate-100" />
                  <div className="h-9 bg-slate-50 rounded-lg border border-slate-100" />
                </div>
                <div className="h-8 bg-slate-100 rounded-lg" />
              </div>
            </div>
          </div>
        </aside>

        {/* ── Grid skeleton ── */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 lg:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse
                           shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Imagen placeholder */}
                <div className="aspect-square bg-gradient-to-b from-slate-100 to-slate-50" />
                {/* Info placeholder */}
                <div className="px-4 pt-3 pb-3.5 space-y-2">
                  <div className="h-2.5 w-20 bg-slate-100 rounded" />
                  <div className="h-3.5 w-full bg-slate-100 rounded" />
                  <div className="h-3.5 w-3/4 bg-slate-100 rounded" />
                  <div className="h-5 w-1/2 bg-slate-200 rounded mt-2" />
                  <div className="h-9 w-full bg-slate-100 rounded-xl mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
