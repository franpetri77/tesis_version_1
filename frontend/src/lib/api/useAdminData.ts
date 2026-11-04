"use client";

// =============================================
// HOOK: useAdminData
// Lee datos de rutas administrativas (/reports/*) desde el navegador,
// enviando el JWT del administrador. Reemplaza los fetch que algunas
// páginas del panel hacían en el servidor sin token: desde que /reports
// exige rol admin, esas llamadas devolverían 401.
// =============================================

import { useEffect, useRef, useState } from "react";
import { getAdminToken } from "./admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface AdminDataState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export function useAdminData<T>(path: string, fallback: T): AdminDataState<T> {
  const fallbackRef = useRef(fallback);
  const [state, setState] = useState<AdminDataState<T>>({
    data: fallback,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const token = getAdminToken();
    fetch(`${API_URL}${path}`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 401 || res.status === 403
              ? "Se requiere una sesión de administrador."
              : "No se pudieron cargar los datos."
          );
        }
        const body = (await res.json()) as { data: T };
        if (active) setState({ data: body.data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setState({
          data: fallbackRef.current,
          loading: false,
          error: err instanceof Error ? err.message : "No se pudieron cargar los datos.",
        });
      });

    return () => {
      active = false;
    };
  }, [path]);

  return state;
}
