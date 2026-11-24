"use client";

// =============================================
// PÁGINA: CARRITO DE COMPRAS
// Productos con su descripción (marca, categoría, SKU, stock y precio),
// cantidades editables, opciones de entrega y resumen de compra. Debajo,
// productos relacionados con lo que hay en el carrito.
// Sin sesión, "Continuar compra" abre el modal de acceso en lugar de ir
// a /login; al ingresar se sigue al checkout con el mismo carrito.
// =============================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowRight, ArrowLeft, Truck, Store } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { useModalStore } from "@/stores/modalStore";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { OrderSummary, PurchaseAssurances, type SummaryLine } from "@/components/cart/OrderSummary";
import { RecommendationSection } from "@/components/catalog/RecommendationSection";
import { formatPrice } from "@/lib/utils/format";
import { STORE_ADDRESS } from "@/lib/chat/faq";
import { SHIPPING_COST } from "@/lib/shipping";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100";

export default function CartPage() {
  const router = useRouter();
  const { items, subtotal, discount_amount, total, total_items, updateQuantity, removeItem } =
    useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openModal = useModalStore((s) => s.openModal);
  // En la hidratación el carrito llega vacío (estado inicial del store);
  // esperar al montaje evita mostrar un instante "Tu carrito está vacío".
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  function goToCheckout() {
    if (isAuthenticated) router.push("/checkout");
    else openModal("auth", { authTab: "intro", redirectTo: "/checkout" });
  }

  if (!mounted) return <div className="min-h-[60vh]" aria-busy="true" />;

  if (items.length === 0) {
    return (
      <div className="container-main flex flex-col items-center py-20 text-center motion-safe:animate-fade-in">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-paper-300 bg-paper-50">
          <ShoppingBag className="h-9 w-9 text-slate-400" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Tu carrito está vacío</h1>
        <p className="mb-7 max-w-xs text-sm text-slate-500">
          Explorá el catálogo y encontrá lo que necesitás.
        </p>
        <Link
          href="/catalogo"
          className={`group inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-paper-50 hover:bg-brand-700 ${FOCUS_RING}`}
        >
          Ver catálogo
          <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  // Ahorro por precios anteriores (sólo si el producto lo informa)
  const savings = items.reduce((acc, i) => {
    const cmp = i.product.compare_price;
    return cmp && cmp > i.unit_price ? acc + (cmp - i.unit_price) * i.quantity : acc;
  }, 0);

  const lines: SummaryLine[] = [
    { label: `Productos (${total_items})`, value: formatPrice(subtotal) },
    ...(discount_amount > 0 ? [{ label: "Descuento", value: `−${formatPrice(discount_amount)}`, tone: "discount" as const }] : []),
    { label: "Envío", value: "Se elige en el siguiente paso", tone: "muted" },
  ];

  return (
    <div className="bg-paper-100">
      <div className="container-main py-8 motion-safe:animate-fade-in lg:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h1 className="titulo-display text-3xl">
            Carrito{" "}
            <span className="text-lg font-normal tracking-normal text-slate-500">
              ({total_items} {total_items === 1 ? "producto" : "productos"})
            </span>
          </h1>
          <Link
            href="/catalogo"
            className={`inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-slate-600 hover:text-slate-900 ${FOCUS_RING}`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Seguir comprando
          </Link>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ---- PRODUCTOS ---- */}
          <div className="space-y-4">
            <section aria-labelledby="carrito-productos" className="rounded-2xl border border-paper-300 bg-paper-50 shadow-card">
              <h2 id="carrito-productos" className="border-b border-paper-300 px-5 py-4 text-base font-semibold text-slate-900 sm:px-6">
                Productos
              </h2>
              <ul className="divide-y divide-paper-300 px-5 sm:px-6">
                {items.map((item) => (
                  <CartLineItem
                    key={item.product_id}
                    item={item}
                    onQuantityChange={(q) => updateQuantity(item.product_id, q)}
                    onRemove={() => removeItem(item.product_id)}
                  />
                ))}
              </ul>

              {/* Opciones de entrega: se eligen en el checkout */}
              <div className="grid gap-4 rounded-b-2xl border-t border-paper-300 bg-paper-100/60 px-5 py-4 text-sm sm:grid-cols-2 sm:px-6">
                <p className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden="true" />
                  <span>
                    <span className="font-medium text-slate-900">Envío a domicilio</span>
                    <span className="block text-slate-500">{formatPrice(SHIPPING_COST)} · 3 a 7 días hábiles</span>
                  </span>
                </p>
                <p className="flex items-start gap-3">
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden="true" />
                  <span>
                    <span className="font-medium text-slate-900">Retiro en el local</span>{" "}
                    <span className="font-medium text-emerald-700">Gratis</span>
                    <span className="block text-slate-500">{STORE_ADDRESS}</span>
                  </span>
                </p>
              </div>
            </section>
          </div>

          {/* ---- RESUMEN ---- */}
          <div className="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            <OrderSummary
              lines={lines}
              total={total}
              totalNote={savings > 0 ? `Ahorrás ${formatPrice(savings)}` : undefined}
            >
              <button
                type="button"
                onClick={goToCheckout}
                className={`group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-paper-50 hover:bg-brand-700 motion-safe:transition-colors ${FOCUS_RING}`}
              >
                Continuar compra
                <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            </OrderSummary>
            <PurchaseAssurances />
          </div>
        </div>

        {/* Productos relacionados con el primero del carrito */}
        <div className="mt-6">
          <RecommendationSection
            placement="product"
            productId={items[0].product_id}
            title="También te puede interesar"
            excludeIds={items.map((i) => i.product_id)}
          />
        </div>
      </div>
    </div>
  );
}
