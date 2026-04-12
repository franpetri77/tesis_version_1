// =============================================
// LOADING: DETALLE DE PRODUCTO
// Skeleton animado mientras carga la página del producto.
// =============================================

export default function ProductLoading() {
  return (
    <div className="container-main py-8 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-3 w-10 bg-slate-100 rounded" />
        <div className="h-3 w-2 bg-slate-100 rounded" />
        <div className="h-3 w-16 bg-slate-100 rounded" />
        <div className="h-3 w-2 bg-slate-100 rounded" />
        <div className="h-3 w-32 bg-slate-100 rounded" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
        {/* Galería skeleton */}
        <div className="space-y-3">
          <div className="aspect-square w-full bg-slate-100 rounded-2xl" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-16 h-16 bg-slate-100 rounded-xl flex-shrink-0" />
            ))}
          </div>
        </div>

        {/* Información skeleton */}
        <div className="space-y-5">
          <div className="h-6 w-24 bg-slate-100 rounded-full" />
          <div className="space-y-2">
            <div className="h-8 w-full bg-slate-100 rounded-xl" />
            <div className="h-8 w-3/4 bg-slate-100 rounded-xl" />
          </div>
          <div className="h-3 w-24 bg-slate-100 rounded" />

          {/* Precio */}
          <div className="flex items-baseline gap-3 py-2">
            <div className="h-10 w-36 bg-slate-100 rounded-xl" />
            <div className="h-6 w-24 bg-slate-100 rounded" />
          </div>

          {/* Stock */}
          <div className="h-5 w-48 bg-slate-100 rounded" />

          {/* Descripción corta */}
          <div className="space-y-2 border-l-2 border-slate-100 pl-3">
            <div className="h-3.5 w-full bg-slate-100 rounded" />
            <div className="h-3.5 w-5/6 bg-slate-100 rounded" />
          </div>

          {/* Botón */}
          <div className="h-12 w-full bg-slate-100 rounded-2xl" />

          {/* Beneficios */}
          <div className="grid grid-cols-2 gap-3">
            <div className="h-4 w-32 bg-slate-100 rounded" />
            <div className="h-4 w-32 bg-slate-100 rounded" />
          </div>

          {/* Tags */}
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-16 bg-slate-100 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Descripción completa skeleton */}
      <div className="mt-14 pt-10 border-t border-slate-100 space-y-3">
        <div className="h-6 w-48 bg-slate-100 rounded-lg" />
        <div className="h-3.5 w-full bg-slate-100 rounded" />
        <div className="h-3.5 w-full bg-slate-100 rounded" />
        <div className="h-3.5 w-4/5 bg-slate-100 rounded" />
        <div className="h-3.5 w-full bg-slate-100 rounded" />
        <div className="h-3.5 w-2/3 bg-slate-100 rounded" />
      </div>
    </div>
  );
}
