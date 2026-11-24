"use client";

// =============================================
// PÁGINA: CHECKOUT — "Finalizá tu compra"
// Misma estructura que el carrito (productos con su descripción + resumen
// a la derecha) y luego: forma de entrega (envío o retiro, con las
// direcciones guardadas del usuario), medio de pago y notas.
// El pago se completa en Mercado Pago. La lógica de cupón y de creación
// de la preferencia de pago no cambia.
// =============================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store, Truck, AlertCircle, CheckCircle2, Lock, ArrowLeft,
  Home, Plus, Wallet, CreditCard, ChevronDown,
} from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { useModalStore } from "@/stores/modalStore";
import { Input } from "@/components/ui/Input";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { OrderSummary, type SummaryLine } from "@/components/cart/OrderSummary";
import { getMyAddresses } from "@/lib/api/account";
import { formatPrice } from "@/lib/utils/format";
import { STORE_ADDRESS } from "@/lib/chat/faq";
import { SHIPPING_COST } from "@/lib/shipping";
import { cn } from "@/lib/utils/cn";
import type { Address } from "@/types";

type DeliveryMethod = "pickup" | "shipping";

interface CheckoutFormData {
  delivery_method: DeliveryMethod;
  street: string;
  number: string;
  floor: string;
  apartment: string;
  city: string;
  province: string;
  postal_code: string;
  notes: string;
}

const PROVINCES = [
  "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut",
  "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén",
  "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
  "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

const EMPTY_ADDRESS = { street: "", number: "", floor: "", apartment: "", city: "", province: "", postal_code: "" };
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50";
const CARD = "rounded-2xl border border-paper-300 bg-paper-50 shadow-card";

function formatAddress(a: Pick<Address, "street" | "number" | "floor" | "apartment">) {
  return `${a.street} ${a.number}${a.floor ? `, piso ${a.floor}` : ""}${a.apartment ? ` ${a.apartment}` : ""}`;
}

/** Campos del formulario a partir de una dirección guardada. */
function addressFields(a: Address) {
  return {
    street: a.street, number: a.number, floor: a.floor ?? "", apartment: a.apartment ?? "",
    city: a.city, province: a.province, postal_code: a.postal_code,
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const cart = useCartStore();
  const openModal = useModalStore((s) => s.openModal);

  const [form, setForm] = useState<CheckoutFormData>({
    delivery_method: "pickup",
    ...EMPTY_ADDRESS, notes: "",
  });
  const [couponInput, setCouponInput]     = useState("");
  const [couponError, setCouponError]     = useState("");
  const [couponOpen, setCouponOpen]       = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  // Direcciones guardadas en "Mi perfil": la predeterminada se elige sola
  const [addresses, setAddresses]         = useState<Address[]>([]);
  const [addressChoice, setAddressChoice] = useState<string>("new");
  // Durante la hidratación los stores devuelven su estado inicial (carrito
  // vacío, sin sesión) para coincidir con el HTML del servidor. Las
  // redirecciones esperan al montaje: si no, recargar /checkout con sesión
  // y productos mandaba siempre al carrito.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (cart.items.length === 0) { router.push("/carrito"); return; }
    if (!isAuthenticated) {
      // Entrada directa sin sesión: volver al carrito y pedir el ingreso en
      // el modal (sin pasar por /login); al ingresar vuelve acá.
      router.replace("/carrito");
      openModal("auth", { authTab: "intro", redirectTo: "/checkout" });
    }
  }, [mounted, cart.items.length, isAuthenticated, router, openModal]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    getMyAddresses()
      .then((list) => {
        if (cancelled || list.length === 0) return;
        setAddresses(list);
        const preferred = list.find((a) => a.is_default) ?? list[0];
        setAddressChoice(preferred.id);
        setForm((prev) => ({ ...prev, ...addressFields(preferred) }));
      })
      .catch(() => { /* sin direcciones guardadas se usa el formulario */ });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const shippingCost = form.delivery_method === "shipping" ? SHIPPING_COST : 0;
  const finalTotal   = cart.total + shippingCost;

  function chooseAddress(id: string) {
    setAddressChoice(id);
    const saved = addresses.find((a) => a.id === id);
    setForm((prev) => ({ ...prev, ...(saved ? addressFields(saved) : EMPTY_ADDRESS) }));
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validateShippingForm(): boolean {
    if (form.delivery_method === "pickup") return true;
    return Boolean(form.street && form.number && form.city && form.province && form.postal_code);
  }

  async function handleApplyCoupon() {
    setCouponError("");
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    try {
      const res  = await fetch("/api/pagos/validar-cupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim().toUpperCase(), subtotal: cart.subtotal }),
      });
      const data = (await res.json()) as {
        valid: boolean;
        promotion?: { code: string; type: string; value: number; name: string };
        error?: string;
      };

      if (!data.valid || !data.promotion) {
        setCouponError(data.error ?? "Código inválido o vencido");
        return;
      }
      cart.applyPromotion({
        id: "", code: data.promotion.code, name: data.promotion.name,
        type: data.promotion.type as "percentage" | "fixed_amount" | "free_shipping",
        value: data.promotion.value, current_uses: 0, is_active: true, valid_from: "",
      });
    } catch {
      setCouponError("Error al validar el cupón");
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCheckoutError("");

    if (!validateShippingForm()) {
      setCheckoutError("Completá todos los campos de envío requeridos.");
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem("tele_import_token") ?? "";
      const res = await fetch("/api/pagos/preferencia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          items: cart.items,
          delivery_method: form.delivery_method,
          shipping_address:
            form.delivery_method === "shipping"
              ? { street: form.street, number: form.number, floor: form.floor,
                  apartment: form.apartment, city: form.city, province: form.province,
                  postal_code: form.postal_code, country: "Argentina" }
              : null,
          coupon_code:     cart.coupon_code,
          subtotal:        cart.subtotal,
          discount_amount: cart.discount_amount,
          shipping_cost:   shippingCost,
          total:           finalTotal,
          notes:           form.notes,
        }),
      });

      const data = (await res.json()) as {
        sandbox_init_point?: string;
        init_point?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        setCheckoutError(data.error ?? "Error al procesar el pago");
        setIsProcessing(false);
        return;
      }

      cart.clearCart();
      window.location.href = data.sandbox_init_point ?? data.init_point!;
    } catch {
      setCheckoutError("Error de conexión. Verificá tu internet e intentá de nuevo.");
      setIsProcessing(false);
    }
  }

  if (!mounted || !isAuthenticated || cart.items.length === 0) return null;

  const totalItems = cart.items.reduce((n, i) => n + i.quantity, 0);
  const savings = cart.items.reduce((acc, i) => {
    const cmp = i.product.compare_price;
    return cmp && cmp > i.unit_price ? acc + (cmp - i.unit_price) * i.quantity : acc;
  }, 0) + cart.discount_amount;

  const lines: SummaryLine[] = [
    { label: `Productos (${totalItems})`, value: formatPrice(cart.subtotal) },
    ...(cart.discount_amount > 0
      ? [{ label: `Cupón ${cart.coupon_code ?? ""}`.trim(), value: `−${formatPrice(cart.discount_amount)}`, tone: "discount" as const }]
      : []),
    form.delivery_method === "pickup"
      ? { label: "Envío", value: "Gratis", tone: "free" as const }
      : { label: "Envío", value: formatPrice(SHIPPING_COST) },
  ];

  const showAddressForm = addresses.length === 0 || addressChoice === "new";

  return (
    <>
      {/* ---- AVISO DE PROCESAMIENTO ---- */}
      {isProcessing && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 motion-safe:animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <div className="mx-4 flex w-full max-w-xs flex-col items-center gap-5 rounded-2xl bg-paper-50 p-8 shadow-2xl">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-paper-200" />
              <div className="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent motion-safe:animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="h-5 w-5 text-brand-600" aria-hidden="true" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900">Procesando pago</p>
              <p className="mt-1 text-sm text-slate-500">Te llevamos a Mercado Pago…</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-paper-100">
        <div className="container-main py-8 motion-safe:animate-fade-in lg:py-10">
          <Link
            href="/carrito"
            className={cn("mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm text-slate-500 hover:text-slate-900", FOCUS_RING)}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al carrito
          </Link>
          <h1 className="titulo-display mb-6 text-3xl">Finalizá tu compra</h1>

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              {/* ---- COLUMNA IZQUIERDA ---- */}
              <div className="space-y-5">

                {/* PRODUCTOS */}
                <section aria-labelledby="co-productos" className={CARD}>
                  <div className="flex items-center justify-between border-b border-paper-300 px-5 py-4 sm:px-6">
                    <h2 id="co-productos" className="text-base font-semibold text-slate-900">
                      Productos <span className="font-normal text-slate-500">({totalItems})</span>
                    </h2>
                    <Link href="/carrito" className={cn("rounded-sm text-sm font-medium text-brand-700 underline-offset-4 hover:underline", FOCUS_RING)}>
                      Modificar
                    </Link>
                  </div>
                  <ul className="divide-y divide-paper-300 px-5 sm:px-6">
                    {cart.items.map((item) => (
                      <CartLineItem key={item.product_id} item={item} compact />
                    ))}
                  </ul>
                </section>

                {/* FORMA DE ENTREGA */}
                <section aria-labelledby="co-entrega" className={cn(CARD, "p-5 sm:p-6")}>
                  <h2 id="co-entrega" className="text-base font-semibold text-slate-900">Forma de entrega</h2>

                  <fieldset className="mt-4">
                    <legend className="sr-only">Elegí cómo recibir tu pedido</legend>
                    <div className="grid grid-cols-1 gap-2 rounded-xl bg-paper-100 p-1.5 sm:grid-cols-2">
                      {([
                        { value: "shipping" as const, label: "Envío a domicilio", detail: `${formatPrice(SHIPPING_COST)} · 3 a 7 días hábiles`, icon: Truck, free: false },
                        { value: "pickup" as const,   label: "Retiro en el local", detail: "Listo en 24 h hábiles", icon: Store, free: true },
                      ]).map(({ value, label, detail, icon: Icon, free }) => (
                        <label
                          key={value}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 motion-safe:transition-colors",
                            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600/40",
                            form.delivery_method === value
                              ? "border-brand-600 bg-paper-50 shadow-sm"
                              : "border-transparent hover:bg-paper-50/70"
                          )}
                        >
                          <input
                            type="radio"
                            name="delivery_method"
                            value={value}
                            checked={form.delivery_method === value}
                            onChange={handleChange}
                            className="h-4 w-4 accent-brand-600"
                          />
                          <Icon className={cn("h-5 w-5 shrink-0", form.delivery_method === value ? "text-brand-700" : "text-slate-500")} strokeWidth={1.75} aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-900">{label}</span>
                            <span className="block text-xs text-slate-500">
                              {free && <span className="font-semibold text-emerald-700">Gratis · </span>}
                              {detail}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* Retiro */}
                  {form.delivery_method === "pickup" && (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-paper-300 px-4 py-3.5 motion-safe:animate-fade-in">
                      <Store className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden="true" />
                      <div className="text-sm">
                        <p className="font-medium text-slate-900">Retirás en {STORE_ADDRESS}</p>
                        <p className="mt-0.5 text-slate-500">Te avisamos cuando tu pedido esté listo para retirar.</p>
                      </div>
                    </div>
                  )}

                  {/* Envío: direcciones guardadas o formulario */}
                  {form.delivery_method === "shipping" && (
                    <div className="mt-4 space-y-3 motion-safe:animate-fade-in">
                      {addresses.length > 0 && (
                        <fieldset className="space-y-2">
                          <legend className="mb-2 text-sm font-medium text-slate-700">Dirección de envío</legend>
                          {addresses.map((a) => (
                            <label
                              key={a.id}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 motion-safe:transition-colors",
                                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600/40",
                                addressChoice === a.id ? "border-brand-600 bg-brand-50/60" : "border-paper-300 hover:border-paper-400"
                              )}
                            >
                              <input
                                type="radio"
                                name="address_choice"
                                checked={addressChoice === a.id}
                                onChange={() => chooseAddress(a.id)}
                                className="mt-1 h-4 w-4 accent-brand-600"
                              />
                              <Home className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden="true" />
                              <span className="min-w-0 text-sm">
                                <span className="block font-medium text-slate-900">{formatAddress(a)}</span>
                                <span className="block text-slate-500">
                                  {a.city}, {a.province} · CP {a.postal_code}
                                  {a.is_default && <span className="ml-1.5 text-xs font-medium text-slate-600">(predeterminada)</span>}
                                </span>
                              </span>
                            </label>
                          ))}
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-sm motion-safe:transition-colors",
                              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600/40",
                              addressChoice === "new" ? "border-brand-600 bg-brand-50/60" : "border-dashed border-paper-400 hover:border-slate-400"
                            )}
                          >
                            <input
                              type="radio"
                              name="address_choice"
                              checked={addressChoice === "new"}
                              onChange={() => chooseAddress("new")}
                              className="h-4 w-4 accent-brand-600"
                            />
                            <Plus className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                            <span className="font-medium text-slate-900">Usar otra dirección</span>
                          </label>
                        </fieldset>
                      )}

                      {showAddressForm && (
                        <div className="space-y-3 rounded-xl border border-paper-300 p-4 motion-safe:animate-fade-in">
                          {addresses.length === 0 && (
                            <p className="text-sm font-medium text-slate-700">Dirección de envío</p>
                          )}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <Input label="Calle *" name="street" value={form.street}
                                onChange={handleChange} placeholder="Av. Corrientes" required autoComplete="address-line1" />
                            </div>
                            <Input label="Número *" name="number" value={form.number}
                              onChange={handleChange} placeholder="1234" required />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input label="Piso" name="floor" value={form.floor}
                              onChange={handleChange} placeholder="3" />
                            <Input label="Departamento" name="apartment" value={form.apartment}
                              onChange={handleChange} placeholder="B" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input label="Ciudad *" name="city" value={form.city}
                              onChange={handleChange} placeholder="Córdoba" required autoComplete="address-level2" />
                            <Input label="Cód. postal *" name="postal_code" value={form.postal_code}
                              onChange={handleChange} placeholder="5000" required autoComplete="postal-code" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="co-provincia" className="text-sm font-medium text-slate-700">Provincia *</label>
                            <select
                              id="co-provincia"
                              name="province"
                              value={form.province}
                              onChange={handleChange}
                              required
                              className="w-full rounded-lg border border-paper-300 bg-paper-50 px-3.5 py-2.5 text-sm text-slate-900 hover:border-paper-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
                            >
                              <option value="">Seleccioná una provincia</option>
                              {PROVINCES.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>
                          <p className="text-xs text-slate-500">
                            Podés guardar direcciones en <Link href="/perfil/direcciones" className="font-medium text-brand-700 underline-offset-4 hover:underline">Mi perfil</Link> para elegirlas acá la próxima vez.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* MEDIO DE PAGO */}
                <section aria-labelledby="co-pago" className={cn(CARD, "p-5 sm:p-6")}>
                  <h2 id="co-pago" className="text-base font-semibold text-slate-900">Medio de pago</h2>
                  <div className="mt-4 flex items-start gap-4 rounded-xl border border-brand-600 bg-brand-50/60 px-4 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-50 text-brand-700 ring-1 ring-paper-300">
                      <Wallet className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-slate-900">Mercado Pago</p>
                      <p className="mt-0.5 text-slate-600">
                        Al confirmar te llevamos a Mercado Pago para pagar de forma segura. Cuando termines, volvés a la tienda.
                      </p>
                      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Medios disponibles en Mercado Pago">
                        {["Tarjeta de crédito", "Tarjeta de débito", "Dinero en cuenta", "Efectivo"].map((m) => (
                          <li key={m} className="inline-flex items-center gap-1.5 rounded-full border border-paper-300 bg-paper-50 px-2.5 py-1 text-xs text-slate-700">
                            <CreditCard className="h-3 w-3 text-slate-500" aria-hidden="true" />
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* NOTAS */}
                <details className={cn(CARD, "group")} open={Boolean(form.notes)}>
                  <summary className={cn("flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden", FOCUS_RING)}>
                    <span className="text-base font-semibold text-slate-900">
                      Notas del pedido <span className="text-sm font-normal text-slate-500">(opcional)</span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 motion-safe:transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="px-5 pb-5 sm:px-6">
                    <label htmlFor="co-notas" className="sr-only">Notas del pedido</label>
                    <textarea
                      id="co-notas"
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-paper-300 bg-paper-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 hover:border-paper-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
                      placeholder="Instrucciones especiales, horario de entrega, etc."
                    />
                  </div>
                </details>
              </div>

              {/* ---- COLUMNA DERECHA: RESUMEN ---- */}
              <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
                <OrderSummary
                  lines={lines}
                  total={finalTotal}
                  totalNote={savings > 0 ? `Ahorrás ${formatPrice(savings)}` : undefined}
                  extra={
                    cart.coupon_code ? (
                      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                          {cart.coupon_code}
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.removePromotion()}
                          className={cn("rounded-sm text-xs font-medium text-slate-600 hover:text-red-700", FOCUS_RING)}
                        >
                          Quitar
                        </button>
                      </div>
                    ) : couponOpen ? (
                      <div>
                        <label htmlFor="co-cupon" className="mb-1.5 block text-xs font-medium text-slate-600">Código de cupón</label>
                        <div className="flex gap-2">
                          <input
                            id="co-cupon"
                            type="text"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                            // Enter aplica el cupón en lugar de enviar el pedido
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleApplyCoupon(); } }}
                            placeholder="CÓDIGO"
                            autoFocus
                            className="h-10 min-w-0 flex-1 rounded-lg border border-paper-300 bg-paper-50 px-3 font-mono text-sm uppercase tracking-wider text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                          />
                          <button
                            type="button"
                            onClick={() => void handleApplyCoupon()}
                            disabled={isApplyingCoupon}
                            className={cn("h-10 shrink-0 rounded-lg border border-slate-900/15 px-3.5 text-sm font-semibold text-slate-900 hover:border-slate-900 hover:bg-slate-900 hover:text-paper-50 disabled:opacity-60", FOCUS_RING)}
                          >
                            {isApplyingCoupon ? "…" : "Aplicar"}
                          </button>
                        </div>
                        {couponError && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs text-red-700" role="alert">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {couponError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCouponOpen(true)}
                        className={cn("rounded-sm text-sm font-medium text-brand-700 underline-offset-4 hover:underline", FOCUS_RING)}
                      >
                        Ingresar código de cupón
                      </button>
                    )
                  }
                >
                  {checkoutError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 motion-safe:animate-fade-in" role="alert">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {checkoutError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className={cn("flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-paper-50 hover:bg-brand-700 disabled:opacity-60 motion-safe:transition-colors", FOCUS_RING)}
                  >
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    {isProcessing ? "Procesando…" : "Pagar con Mercado Pago"}
                  </button>
                  <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    Pago seguro · conexión cifrada
                  </p>
                </OrderSummary>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
