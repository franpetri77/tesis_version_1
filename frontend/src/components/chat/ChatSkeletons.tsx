import { LoadingState, Skeleton } from "@/components/ui/Skeleton";

/** Mantiene la escala del hilo sin dibujar mensajes ni estados de lectura ficticios. */
export function ChatThreadSkeleton() {
  return (
    <LoadingState label="Cargando mensajes…" className="py-2">
      <div className="mb-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-paper-300" />
        <Skeleton className="h-2 w-12" />
        <span className="h-px flex-1 bg-paper-300" />
      </div>
      <div className="space-y-5">
        {[false, true, false, true].map((own, i) => (
          <div key={i} className={`flex flex-col gap-2 ${own ? "items-end" : "items-start"}`}>
            <Skeleton className="h-2 w-16" />
            <Skeleton className={`h-16 rounded-xl ${i === 2 ? "w-4/5" : "w-3/5"}`} />
            <Skeleton className="h-1.5 w-9" />
          </div>
        ))}
      </div>
    </LoadingState>
  );
}

export function ChatInboxSkeleton() {
  return (
    <LoadingState label="Cargando conversaciones…">
      <div className="divide-y divide-paper-300">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2.5 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2 w-9" />
            </div>
            <Skeleton className="h-2.5 w-4/5" />
            <Skeleton className="h-2 w-1/2" />
          </div>
        ))}
      </div>
    </LoadingState>
  );
}

export function ChatCustomerSkeleton() {
  return (
    <LoadingState label="Cargando datos del cliente…" className="flex-shrink-0 border-t border-slate-200 px-4 py-4 lg:w-64 lg:border-l lg:border-t-0">
      <div className="space-y-3">
        <Skeleton className="h-2 w-16" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-2.5 w-44" />
        <Skeleton className="h-2.5 w-28" />
        <div className="border-t border-paper-300 pt-5">
          <Skeleton className="mb-4 h-2 w-24" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    </LoadingState>
  );
}
