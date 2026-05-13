"use client";

// =============================================
// COMPONENTE: RESEÑAS DE PRODUCTO
// Muestra calificaciones y comentarios aprobados.
// Permite a usuarios autenticados dejar su reseña.
// =============================================

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare, SendHorizonal } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ProductReview } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ReviewWithUser extends ProductReview {
  user_first_name: string;
  user_last_name: string;
}

interface ReviewsResponse {
  data: ReviewWithUser[];
  meta: { total: number; average_rating: number };
}

interface ProductReviewsProps {
  productId: string;
}

// ── Estrellas de visualización (solo lectura) ──────────────────────────────
function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5",
            s <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

// ── Selector interactivo de estrellas ──────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          aria-label={`${s} estrella${s > 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              "w-7 h-7 transition-colors",
              s <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-slate-200 text-slate-200 hover:fill-amber-200 hover:text-amber-200"
            )}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export function ProductReviews({ productId }: ProductReviewsProps) {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const [formRating,  setFormRating]  = useState(0);
  const [formTitle,   setFormTitle]   = useState("");
  const [formBody,    setFormBody]    = useState("");
  const [formError,   setFormError]   = useState("");
  const [submitted,   setSubmitted]   = useState(false);

  // ── Carga de reseñas aprobadas ──────────────────────────────────────────
  const { data, isLoading } = useQuery<ReviewsResponse>({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/catalog/products/${productId}/reviews`);
      if (!res.ok) throw new Error("Error al cargar reseñas");
      return res.json() as Promise<ReviewsResponse>;
    },
  });

  // ── Envío de nueva reseña ───────────────────────────────────────────────
  const createReview = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("tele_import_token");
      const res = await fetch(`${API_URL}/catalog/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rating: formRating, title: formTitle, body: formBody }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error ?? "Error al enviar la reseña");
      }
    },
    onSuccess: () => {
      setSubmitted(true);
      setFormRating(0);
      setFormTitle("");
      setFormBody("");
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (formRating === 0) { setFormError("Seleccioná una calificación"); return; }
    if (!formBody.trim()) { setFormError("El comentario no puede estar vacío"); return; }
    createReview.mutate();
  }

  const reviews = data?.data ?? [];
  const meta    = data?.meta;

  return (
    <section className="mt-14 pt-10 border-t border-slate-100">

      {/* Encabezado */}
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-brand-500" />
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Opiniones de clientes
        </h2>
        {!isLoading && meta && meta.total > 0 && (
          <span className="text-sm text-slate-400">({meta.total})</span>
        )}
      </div>

      {/* Resumen de calificación promedio */}
      {!isLoading && meta && meta.total > 0 && (
        <div className="flex items-center gap-4 mb-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 w-fit">
          <div className="text-center">
            <p className="text-4xl font-bold text-slate-900 leading-none mb-1">
              {meta.average_rating.toFixed(1)}
            </p>
            <StarDisplay rating={Math.round(meta.average_rating)} size="sm" />
            <p className="text-xs text-slate-400 mt-1.5">
              {meta.total} reseña{meta.total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Lista de reseñas ── */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            [...Array(2)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                <div className="flex gap-2">
                  <div className="h-3 bg-slate-100 rounded w-28" />
                  <div className="h-3 bg-slate-100 rounded w-20" />
                </div>
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ))
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-medium">
                Todavía no hay reseñas para este producto.
              </p>
              <p className="text-slate-400 text-xs mt-1">¡Sé el primero en opinar!</p>
            </div>
          ) : (
            reviews.map((review) => (
              <article key={review.id} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {review.user_first_name} {review.user_last_name[0]}.
                    </p>
                    <StarDisplay rating={review.rating} size="sm" />
                  </div>
                  <time className="text-xs text-slate-400 flex-shrink-0">
                    {formatDate(review.created_at)}
                  </time>
                </div>
                {review.title && (
                  <p className="text-sm font-semibold text-slate-700">{review.title}</p>
                )}
                <p className="text-sm text-slate-600 leading-relaxed">{review.body}</p>
              </article>
            ))
          )}
        </div>

        {/* ── Panel lateral: form o invitación a loguear ── */}
        <div className="lg:col-span-1">
          {!isAuthenticated ? (
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 text-center space-y-3">
              <MessageSquare className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                ¿Compraste este producto?
              </p>
              <p className="text-xs text-slate-400">Iniciá sesión para dejar tu opinión</p>
              <Link
                href="/login"
                className="inline-block mt-1 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
              >
                Ingresar
              </Link>
            </div>
          ) : submitted ? (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 text-center space-y-2">
              <p className="text-sm font-bold text-emerald-800">¡Gracias por tu opinión!</p>
              <p className="text-xs text-emerald-600 leading-relaxed">
                Tu reseña fue recibida y será publicada luego de ser revisada por el equipo.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Dejá tu reseña</h3>
              <form onSubmit={handleSubmit} className="space-y-3.5">

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
                    Calificación *
                  </label>
                  <StarPicker value={formRating} onChange={setFormRating} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">
                    Título <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Resumen breve de tu opinión..."
                    maxLength={255}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">
                    Comentario *
                  </label>
                  <textarea
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    placeholder="Contá tu experiencia con el producto..."
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all resize-none"
                    required
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={createReview.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  {createReview.isPending ? (
                    "Enviando..."
                  ) : (
                    <>
                      <SendHorizonal className="w-4 h-4" />
                      Publicar reseña
                    </>
                  )}
                </button>

              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
