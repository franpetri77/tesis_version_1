"use client";

// =============================================
// PROVIDERS GLOBALES
// Envuelve la app con React Query y otros providers de contexto.
// Separado en archivo propio para no contaminar el layout con "use client".
// =============================================

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { AuthModals } from "@/components/auth/AuthModals";

export function Providers({ children }: { children: React.ReactNode }) {
  // Crear el QueryClient por componente para evitar compartir estado entre requests en SSR
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto antes de refetch
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Modales de autenticación — siempre montados, controlados por modalStore */}
      <AuthModals />
      {/* Solo visible en desarrollo */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
