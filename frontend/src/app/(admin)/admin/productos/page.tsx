// =============================================
// PÁGINA ADMIN: GESTIÓN DE PRODUCTOS
// Lista de productos con acciones: crear, editar, archivar.
// =============================================

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, Package } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils/format";
import type { Product } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const metadata: Metadata = { title: "Productos — Admin" };
export const revalidate = 0;

export default async function AdminProductsPage() {
  let products: Product[] = [];
  try {
    const res = await fetch(`${API_URL}/catalog/products?limit=1000`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json() as { data: Product[] };
      products = data.data;
    }
  } catch {
    products = [];
  }

  function getThumbUrl(product: Product): string | null {
    if (!product.images || product.images.length === 0) return null;
    const sorted = [...product.images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return sorted[0]?.image_url ?? null;
  }

  const activeCount = products.filter((p) => p.is_active).length;
  const lowStockCount = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 5).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity <= 0).length;

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {products.length} productos ·{" "}
            <span className="text-emerald-600 font-medium">{activeCount} activos</span>
            {outOfStockCount > 0 && (
              <> · <span className="text-red-500 font-medium">{outOfStockCount} sin stock</span></>
            )}
            {lowStockCount > 0 && (
              <> · <span className="text-amber-500 font-medium">{lowStockCount} stock bajo</span></>
            )}
          </p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo producto
        </Link>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => {
                const thumbUrl = getThumbUrl(product);
                return (
                  <tr key={product.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Miniatura */}
                    <td className="px-4 py-3">
                      <div className="w-9 h-9 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {thumbUrl ? (
                          <Image
                            src={thumbUrl}
                            alt={product.name}
                            width={36}
                            height={36}
                            className="object-contain"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-slate-300" strokeWidth={1.5} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900 line-clamp-1">
                        {product.name}
                      </span>
                      {product.is_featured && (
                        <span className="ml-2 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">
                          Destacado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {product.category_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          product.stock_quantity <= 0
                            ? "text-red-600 font-semibold"
                            : product.stock_quantity <= 5
                            ? "text-amber-600 font-semibold"
                            : "text-slate-700"
                        }
                      >
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={product.is_active ? "success" : "default"}>
                        {product.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/productos/${product.id}`}
                        className="text-brand-600 hover:text-brand-700 text-xs font-semibold transition-colors"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-slate-400">
                    No hay productos registrados.{" "}
                    <Link href="/admin/productos/nuevo" className="text-brand-600 hover:underline font-semibold">
                      Crear el primero
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
