"use client";

// =============================================
// PÁGINA ADMIN: GESTIÓN DE STOCK
// Permite registrar ingresos y egresos de stock.
// Muestra el historial de movimientos recientes.
// =============================================

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils/format";
import { PackagePlus, CheckCircle2 } from "lucide-react";
import type { StockMovement, Product } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type MovementType = "ingreso" | "egreso" | "ajuste";

interface StockFormData {
  product_id: string;
  type: MovementType;
  quantity: number;
  reason: string;
}

const MOVEMENT_VARIANT: Record<MovementType | "venta" | "devolucion", "success" | "danger" | "warning" | "info"> = {
  ingreso:    "success",
  egreso:     "danger",
  ajuste:     "warning",
  venta:      "info",
  devolucion: "success",
};

const MOVEMENT_LABEL: Record<MovementType | "venta" | "devolucion", string> = {
  ingreso:    "Ingreso",
  egreso:     "Egreso",
  ajuste:     "Ajuste",
  venta:      "Venta",
  devolucion: "Devolución",
};

export default function AdminStockPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StockFormData>({
    product_id: "",
    type: "ingreso",
    quantity: 1,
    reason: "",
  });
  const [formError, setFormError]     = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const { data: products } = useQuery({
    queryKey: ["admin-products-selector"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/catalog/products?limit=1000`);
      if (!res.ok) return [] as Product[];
      const data = await res.json() as { data: Product[] };
      return data.data;
    },
  });

  const { data: movements, isLoading } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: async () => {
      const token = localStorage.getItem("tele_import_token");
      const res = await fetch(`${API_URL}/reports/stock-movements?limit=50`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [] as StockMovement[];
      const data = await res.json() as { data: StockMovement[] };
      return data.data;
    },
  });

  const registerMovement = useMutation({
    mutationFn: async (data: StockFormData) => {
      const token = localStorage.getItem("tele_import_token");
      const res = await fetch(`${API_URL}/reports/stock-movement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error al registrar");
    },
    onSuccess: () => {
      setFormSuccess("Movimiento registrado correctamente.");
      setForm({ product_id: "", type: "ingreso", quantity: 1, reason: "" });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products-selector"] });
      setTimeout(() => setFormSuccess(""), 3000);
    },
    onError: () => {
      setFormError("Error al registrar el movimiento. Intentá nuevamente.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.product_id) { setFormError("Seleccioná un producto"); return; }
    if (form.quantity <= 0) { setFormError("La cantidad debe ser mayor a 0"); return; }
    registerMovement.mutate(form);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Gestión de stock</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Registrá ingresos, egresos y ajustes de inventario
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---- Formulario ---- */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <PackagePlus className="w-4 h-4 text-brand-500" />
              <h2 className="font-semibold text-slate-900 text-sm">Nuevo movimiento</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Producto *
                </label>
                <select
                  value={form.product_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, product_id: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">Seleccionar producto...</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Stock: {p.stock_quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Tipo *
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as MovementType }))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                >
                  <option value="ingreso">Ingreso (suma stock)</option>
                  <option value="egreso">Egreso (resta stock)</option>
                  <option value="ajuste">Ajuste manual</option>
                </select>
              </div>

              <Input
                label="Cantidad *"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                required
              />

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Motivo
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                  rows={2}
                  placeholder="Compra a proveedor, merma, corrección..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
              {formSuccess && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  {formSuccess}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={registerMovement.isPending}
              >
                Registrar movimiento
              </Button>
            </form>
          </div>
        </div>

        {/* ---- Historial ---- */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm">Últimos 50 movimientos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Producto</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cant.</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Anterior</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nuevo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-4 py-3"><div className="h-3 bg-slate-100 rounded w-40" /></td>
                        <td className="px-4 py-3"><div className="h-5 bg-slate-100 rounded-full w-16 mx-auto" /></td>
                        <td className="px-4 py-3"><div className="h-3 bg-slate-100 rounded w-8 ml-auto" /></td>
                        <td className="px-4 py-3"><div className="h-3 bg-slate-100 rounded w-8 ml-auto" /></td>
                        <td className="px-4 py-3"><div className="h-3 bg-slate-100 rounded w-8 ml-auto" /></td>
                        <td className="px-4 py-3"><div className="h-3 bg-slate-100 rounded w-28" /></td>
                      </tr>
                    ))
                  ) : movements?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                        No hay movimientos registrados todavía
                      </td>
                    </tr>
                  ) : (
                    movements?.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-slate-800 font-medium text-xs line-clamp-1">
                          {typeof m.product_id === "object"
                            ? (m.product_id as unknown as { name: string }).name
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={MOVEMENT_VARIANT[m.type as MovementType]}>
                            {MOVEMENT_LABEL[m.type as MovementType] ?? m.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{m.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-400">{m.previous_quantity}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{m.new_quantity}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {m.created_at ? formatDateTime(m.created_at) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
