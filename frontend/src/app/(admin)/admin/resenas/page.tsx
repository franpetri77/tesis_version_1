"use client";

// =============================================
// PÁGINA ADMIN: MODERACIÓN DE RESEÑAS
// Lista todas las reseñas, permite aprobar/rechazar
// y eliminar. Filtro por estado de aprobación.
// =============================================

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, CheckCircle2, XCircle, Trash2, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface AdminReview {
  id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  user_name: string;
  rating: number;
  title: string | null;
  body: string;
  is_approved: boolean;
  created_at: string;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            "w-3 h-3",
            s <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("tele_import_token") : null;
}

export default function AdminResenasPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  const queryParam =
    filter === "pending" ? "?approved=0" : filter === "approved" ? "?approved=1" : "";

  const { data, isLoading, isError, error } = useQuery<{ data: AdminReview[] }>({
    queryKey: ["admin-reviews", filter],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/reviews${queryParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? "Error cargando reseñas");
      }
      return res.json() as Promise<{ data: AdminReview[] }>;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const toggleApprove = useMutation({
    mutationFn: async (id: string) => {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/reviews/${id}/approve`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al actualizar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/reviews/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al eliminar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  const reviews = data?.data ?? [];
  const pendingCount = reviews.filter((r) => !r.is_approved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Moderación de reseñas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Aprobá o eliminá los comentarios de clientes
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
            <MessageSquare className="w-3.5 h-3.5" />
            {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(["all", "pending", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filter === f
                ? "bg-brand-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {f === "all" ? "Todas" : f === "pending" ? "Pendientes" : "Aprobadas"}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Producto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Comentario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-slate-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <p className="text-sm font-semibold text-red-600">No se pudieron cargar las reseñas</p>
                    <p className="text-xs text-red-400 mt-1">
                      {error instanceof Error ? error.message : "Intentá actualizar la página"}
                    </p>
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No hay reseñas para mostrar
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-slate-800 line-clamp-1 max-w-[140px]">
                        {review.product_name}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{review.user_name}</td>
                    <td className="px-4 py-3 text-center">
                      <StarDisplay rating={review.rating} />
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      {review.title && (
                        <p className="text-xs font-semibold text-slate-700 line-clamp-1">
                          {review.title}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 line-clamp-2">{review.body}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(review.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                          review.is_approved
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {review.is_approved ? "Aprobada" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleApprove.mutate(review.id)}
                          disabled={toggleApprove.isPending}
                          title={review.is_approved ? "Rechazar" : "Aprobar"}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            review.is_approved
                              ? "text-amber-500 hover:bg-amber-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          )}
                        >
                          {review.is_approved
                            ? <XCircle className="w-4 h-4" />
                            : <CheckCircle2 className="w-4 h-4" />
                          }
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("¿Eliminar esta reseña permanentemente?")) {
                              deleteReview.mutate(review.id);
                            }
                          }}
                          disabled={deleteReview.isPending}
                          title="Eliminar"
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
