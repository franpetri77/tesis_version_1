// =============================================
// COMPONENTE: SKELETON
// Placeholder animado para estados de carga.
// Reutilizable con clases personalizadas de tamaño.
// =============================================

import { cn } from "@/lib/utils/cn";

interface SkeletonProps {
  className?: string;
}

// Skeleton genérico — se usa con clases de tamaño
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-slate-100",
        className
      )}
    />
  );
}

// Skeleton para una fila de pedido en la lista
export function OrderRowSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-3 w-64" />
      <div className="mt-4 flex justify-between items-center">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

// Skeleton para el detalle completo de un pedido
export function OrderDetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Encabezado */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>
      {/* Ítems */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
        <Skeleton className="h-4 w-24 mb-2" />
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-14 h-14 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      {/* Resumen */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}

// Skeleton para una tarjeta de dirección
export function AddressCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-56 mb-1.5" />
      <Skeleton className="h-3 w-32" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-7 w-16 rounded-lg" />
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  );
}
