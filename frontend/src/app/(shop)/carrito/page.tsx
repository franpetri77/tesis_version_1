"use client";

// =============================================
// PÁGINA: CARRITO DE COMPRAS
// Muestra los ítems del carrito, permite editar cantidades
// y navegar al checkout.
// =============================================

import Image from "next/image";
import Link from "next/link";
import { Trash2, ShoppingBag, ArrowRight, Package } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils/format";
import { getProductImageUrl } from "@/lib/api/catalog";

export default function CartPage() {
  const { items, subtotal, discount_amount, total, updateQuantity, removeItem } =
    useCartStore();

  if (items.length === 0) {
    return (
      <div className="container-main py-20 flex flex-col items-center text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
          <ShoppingBag className="w-9 h-9 text-slate-400" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Tu carrito está vacío
        </h1>
        <p className="text-slate-500 text-sm mb-7 max-w-xs">
          Explorá el catálogo y encontrá lo que necesitás.
        </p>
        <Link href="/catalogo">
          <Button variant="primary" size="lg" className="gap-2">
            Ver catálogo
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-main py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">
        Carrito de compras
        <span className="ml-2 text-base font-normal text-slate-400">
          ({items.length} {items.length === 1 ? "producto" : "productos"})
        </span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---- LISTA DE ÍTEMS ---- */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const mainImage = item.product.images
              ?.slice()
              .sort((a, b) => a.sort_order - b.sort_order)[0];

            return (
              <div
                key={item.product_id}
                className="flex gap-4 bg-white rounded-xl border border-slate-200 shadow-card p-4 transition-shadow hover:shadow-card-hover"
              >
                {/* Imagen */}
                <Link
                  href={`/producto/${item.product.slug}`}
                  className="flex-shrink-0"
                >
                  <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                    {mainImage ? (
                      <Image
                        src={getProductImageUrl(mainImage.image_url, {
                          width: 144,
                          height: 144,
                        })}
                        alt={item.product.name}
                        fill
                        className="object-contain p-1.5"
                        sizes="72px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-7 h-7 text-slate-300" strokeWidth={1} />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <Link
                      href={`/producto/${item.product.slug}`}
                      className="text-sm font-medium text-slate-900 hover:text-brand-600 line-clamp-2 transition-colors leading-snug"
                    >
                      {item.product.name}
                    </Link>
                    {item.product.sku && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        SKU: {item.product.sku}
                      </p>
                    )}
                  </div>
                  <p className="text-brand-700 font-bold text-sm mt-1">
                    {formatPrice(item.unit_price)}
                  </p>
                </div>

                {/* Controles */}
                <div className="flex flex-col items-end justify-between flex-shrink-0">
                  {/* Subtotal del ítem */}
                  <span className="font-bold text-slate-900 text-sm">
                    {formatPrice(item.unit_price * item.quantity)}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Selector de cantidad */}
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors text-lg leading-none font-medium"
                        aria-label="Disminuir"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product_id, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.product.stock_quantity}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 transition-colors text-lg leading-none font-medium"
                        aria-label="Aumentar"
                      >
                        +
                      </button>
                    </div>

                    {/* Eliminar ítem */}
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label="Eliminar del carrito"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Link continuar comprando */}
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors mt-2"
          >
            ← Continuar comprando
          </Link>
        </div>

        {/* ---- RESUMEN DEL PEDIDO ---- */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 sticky top-24">
            <h2 className="font-semibold text-slate-900 mb-5">
              Resumen del pedido
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">{formatPrice(subtotal)}</span>
              </div>
              {discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Descuento</span>
                  <span>-{formatPrice(discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 text-xs">
                <span>Envío</span>
                <span>Se calcula en el checkout</span>
              </div>
            </div>

            <div className="border-t border-slate-100 mt-4 pt-4 flex justify-between font-bold text-slate-900">
              <span>Total estimado</span>
              <span className="text-lg">{formatPrice(total)}</span>
            </div>

            <Link href="/checkout" className="block mt-5">
              <Button variant="primary" size="lg" fullWidth className="gap-2">
                Finalizar compra
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            {/* Íconos de pago */}
            <p className="text-[11px] text-slate-400 text-center mt-4">
              Pago seguro con{" "}
              <span className="font-semibold text-slate-500">Mercado Pago</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
