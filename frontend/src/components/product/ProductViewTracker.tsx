"use client";

// Registra una visita al detalle de producto en cuanto el componente se monta
// en el browser (fire-and-forget, sin UI visible).

import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ProductViewTrackerProps {
  productId: string;
}

export function ProductViewTracker({ productId }: ProductViewTrackerProps) {
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("tele_import_token")
        : null;

    fetch(`${API_URL}/catalog/products/${productId}/view`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => { /* noop — error silencioso, no afecta la UX */ });
  }, [productId]);

  return null;
}
