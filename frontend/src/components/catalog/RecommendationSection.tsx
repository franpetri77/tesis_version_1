"use client";

import { useEffect, useId, useState } from "react";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useAuthStore } from "@/stores/authStore";
import type { Product } from "@/types";

type Props =
  | { placement: "home" }
  | { placement: "product"; productId: string }
  | { placement: "checkout"; orderId: string };

interface Recommendations {
  products: Product[];
  matched: boolean;
}

export function RecommendationSection(props: Props) {
  const userId = useAuthStore((state) => state.isAuthenticated ? state.user?.id : undefined);
  const titleId = useId();
  const [result, setResult] = useState<{ key: string; data: Recommendations } | null>(null);
  const params = new URLSearchParams({ limit: "4" });
  if (props.placement === "product") params.set("product_id", props.productId);
  else params.set("scope", "personal");
  if (props.placement === "checkout") params.set("order_id", props.orderId);
  const query = params.toString();
  const publicSection = props.placement === "product";
  const waitingForOrder = props.placement === "checkout";
  const key = publicSection ? query : userId ? `${userId}:${query}` : null;

  useEffect(() => {
    if (!key) return;
    const token = publicSection ? null : localStorage.getItem("tele_import_token");
    if (!publicSection && !token) return;
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;

    async function load(attempt = 0) {
      try {
        const response = await fetch(`/api/recomendaciones?${query}`, {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data: Recommendations = await response.json();
        if (controller.signal.aborted || !key) return;
        if (waitingForOrder && data.products.length === 0 && attempt < 4) {
          // El regreso a la tienda puede ocurrir antes de que llegue el webhook.
          retry = setTimeout(() => void load(attempt + 1), 2000);
          return;
        }
        setResult({ key, data });
      } catch {
        // El contenido principal sigue disponible si falla esta consulta.
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(retry);
      setResult(null);
    };
  }, [key, publicSection, query, waitingForOrder]);

  const data = key && result?.key === key ? result.data : null;
  if (!data?.products.length) return null;

  const title = props.placement === "product" ? "Productos relacionados"
    : props.placement === "checkout" && data.matched ? "También te puede interesar"
    : data.matched ? "Recomendados para vos"
    : "Descubrí más productos";

  return (
    <section className="border-t border-paper-300 py-10 text-left sm:py-12" aria-labelledby={titleId}>
      <h2 id={titleId} className="titulo-display mb-6 text-2xl text-slate-900 sm:mb-8 sm:text-3xl">{title}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {data.products.map((product) => (
          <li key={product.id} className="min-w-0"><ProductCard product={product} /></li>
        ))}
      </ul>
    </section>
  );
}
