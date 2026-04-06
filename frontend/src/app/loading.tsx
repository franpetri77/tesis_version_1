// =============================================
// LOADING: HOME
// Skeleton animado mientras carga la página principal.
// =============================================

export default function HomeLoading() {
  return (
    <>
      {/* Hero carousel skeleton */}
      <div className="h-[380px] md:h-[480px] lg:h-[520px] bg-slate-900 animate-pulse relative overflow-hidden">
        <div className="container-main h-full flex items-center">
          <div className="max-w-2xl space-y-4">
            <div className="h-6 w-28 bg-slate-700 rounded-full" />
            <div className="h-12 w-full bg-slate-700 rounded-xl" />
            <div className="h-12 w-3/4 bg-slate-700 rounded-xl" />
            <div className="h-5 w-full bg-slate-800 rounded-lg" />
            <div className="h-5 w-2/3 bg-slate-800 rounded-lg" />
            <div className="h-11 w-40 bg-slate-700 rounded-xl mt-3" />
          </div>
        </div>
        {/* Dots skeleton */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-2 rounded-full bg-white/30 ${i === 1 ? "w-6" : "w-2"}`} />
          ))}
        </div>
      </div>

      {/* Beneficios skeleton */}
      <section className="bg-white border-b border-slate-100">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex-shrink-0" />
                <div className="space-y-2">
                  <div className="h-3 w-28 bg-slate-100 rounded" />
                  <div className="h-2.5 w-20 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secciones departamentos skeleton */}
      <section className="py-14 bg-slate-950">
        <div className="container-main">
          <div className="flex items-center justify-between mb-8 animate-pulse">
            <div className="space-y-2">
              <div className="h-6 w-56 bg-slate-700 rounded-lg" />
              <div className="h-3.5 w-72 bg-slate-800 rounded" />
            </div>
            <div className="h-4 w-16 bg-slate-700 rounded" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl h-28 bg-slate-800 animate-pulse"
                style={{ animationDelay: `${i * 40}ms` }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Productos destacados skeleton */}
      <section className="py-14 bg-slate-50">
        <div className="container-main">
          <div className="flex items-center justify-between mb-7 animate-pulse">
            <div className="space-y-2">
              <div className="h-6 w-52 bg-slate-200 rounded-lg" />
              <div className="h-3.5 w-64 bg-slate-200 rounded" />
            </div>
            <div className="h-4 w-20 bg-slate-200 rounded" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl border border-slate-100 overflow-hidden animate-pulse"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="aspect-square bg-slate-100" />
                <div className="px-4 pt-3.5 pb-4 space-y-2">
                  <div className="h-2.5 w-20 bg-slate-100 rounded" />
                  <div className="h-3.5 w-full bg-slate-100 rounded" />
                  <div className="h-3.5 w-3/4 bg-slate-100 rounded" />
                  <div className="h-5 w-1/2 bg-slate-100 rounded mt-3" />
                  <div className="h-9 w-full bg-slate-100 rounded-2xl mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
