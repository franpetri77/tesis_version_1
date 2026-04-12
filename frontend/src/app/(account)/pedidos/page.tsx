"use client";

// Redirige a la nueva ubicación de "Mis pedidos"
// Este archivo se mantiene para compatibilidad con bookmarks o links viejos.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OldOrdersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/perfil/pedidos");
  }, [router]);
  return null;
}
