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

// Resultado guardado junto con la consulta que lo produjo. Si la consulta
// cambia (por ejemplo, otro filtro de estado), los datos anteriores dejan de
// ser válidos: no se muestran bajo el filtro nuevo mientras llega la respuesta.
interface StoredResult<T> {
  path: string;
  data: T;
  error: string | null;
}

export function useAdminData<T>(path: string, fallback: T): AdminDataState<T> {
  const fallbackRef = useRef(fallback);
  const [result, setResult] = useState<StoredResult<T> | null>(null);

  useEffect(() => {
    // `active` descarta respuestas de una consulta anterior que lleguen tarde.
    let active = true;

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
        if (active) setResult({ path, data: body.data, error: null });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setResult({
          path,
          data: fallbackRef.current,
          error: err instanceof Error ? err.message : "No se pudieron cargar los datos.",
        });
      });

    return () => {
      active = false;
    };
  }, [path]);

  // Solo vale el resultado de la consulta actual; cualquier otro es de un filtro anterior.
  if (!result || result.path !== path) {
    return { data: fallbackRef.current, loading: true, error: null };
  }
  return { data: result.data, loading: false, error: result.error };
}
