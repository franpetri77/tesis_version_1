// =============================================
// LOADING: PERFIL
// Skeleton animado mientras carga la página de perfil.
// =============================================

export default function ProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Encabezado */}
      <div className="space-y-1.5">
        <div className="h-6 w-28 bg-slate-200 rounded-lg" />
        <div className="h-4 w-48 bg-slate-100 rounded" />
      </div>

      {/* Card formulario */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 max-w-md">
        {/* Nombre y apellido */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="h-3.5 w-16 bg-slate-100 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-16 bg-slate-100 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-12 bg-slate-100 rounded" />
          <div className="h-10 w-full bg-slate-100 rounded-lg" />
          <div className="h-3 w-56 bg-slate-100 rounded" />
        </div>

        {/* Botón */}
        <div className="h-10 w-36 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}
