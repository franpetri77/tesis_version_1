"use client";

// =============================================
// PÁGINA: CHECKOUT
// Flujo: resumen → método de entrega → dirección → pago Mercado Pago.
// Incluye modal de procesamiento y validaciones.
// =============================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Store, Truck, Tag, AlertCircle, CheckCircle2,
  Lock, ChevronRight, Package, ArrowLeft
} from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatPrice } from "@/lib/utils/format";
import { getProductImageUrl } from "@/lib/api/catalog";
import { cn } from "@/lib/utils/cn";

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

const SHIPPING_COST = 3500;

const PROVINCES = [
  "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut",
  "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén",
  "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
  "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const cart = useCartStore();

  const [form, setForm] = useState<CheckoutFormData>({
    delivery_method: "pickup",
    street: "", number: "", floor: "", apartment: "",
    city: "", province: "", postal_code: "", notes: "",
  });
  const [couponInput, setCouponInput]     = useState("");
  const [couponError, setCouponError]     = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    if (cart.items.length === 0) { router.push("/carrito"); return; }
    if (!isAuthenticated)        { router.push("/login?redirect=/checkout"); }
  }, [cart.items.length, isAuthenticated, router]);

  const shippingCost = form.delivery_method === "shipping" ? SHIPPING_COST : 0;
  const finalTotal   = cart.total + shippingCost;

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

  if (!isAuthenticated || cart.items.length === 0) return null;

  return (
    <>
      {/* ---- MODAL DE PROCESAMIENTO ---- */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-5 shadow-2xl max-w-xs w-full mx-4">
            {/* Spinner */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-5 h-5 text-brand-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-900 text-lg">Procesando pago</p>
              <p className="text-slate-500 text-sm mt-1">
                Conectando con Mercado Pago...
              </p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="container-main py-8 animate-fade-in">
        {/* Encabezado + breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/carrito" className="flex items-center gap-1 hover:text-brand-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Carrito
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-700 font-semibold">Finalizar compra</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ---- COLUMNA IZQUIERDA ---- */}
            <div className="lg:col-span-2 space-y-5">

              {/* SECCIÓN 1: Método de entrega */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
                <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  Método de entrega
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    {
                      value: "pickup" as const,
                      label: "Retiro en sucursal",
                      desc: "Sin costo. Listo en 24hs hábiles.",
                      icon: Store,
                      badge: "Gratis",
                    },
                    {
                      value: "shipping" as const,
                      label: "Envío a domicilio",
                      desc: `Costo fijo ${formatPrice(SHIPPING_COST)}. 3–7 días hábiles.`,
                      icon: Truck,
                      badge: null,
                    },
                  ]).map(({ value, label, desc, icon: Icon, badge }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150",
                        form.delivery_method === value
                          ? "border-brand-500 bg-brand-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <input
                        type="radio"
                        name="delivery_method"
                        value={value}
                        checked={form.delivery_method === value}
                        onChange={handleChange}
                        className="mt-0.5 accent-brand-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className={cn(
                            "w-4 h-4",
                            form.delivery_method === value ? "text-brand-600" : "text-slate-400"
                          )} />
                          <span className={cn(
                            "text-sm font-semibold",
                            form.delivery_method === value ? "text-brand-800" : "text-slate-700"
                          )}>
                            {label}
                          </span>
                          {badge && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">
                              {badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* SECCIÓN 2: Dirección (solo si eligió envío) */}
              {form.delivery_method === "shipping" && (
                <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 animate-fade-in">
                  <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                    Dirección de envío
                  </h2>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Input label="Calle *" name="street" value={form.street}
                          onChange={handleChange} placeholder="Av. Corrientes" required />
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
                        onChange={handleChange} placeholder="Buenos Aires" required />
                      <Input label="Cód. postal *" name="postal_code" value={form.postal_code}
                        onChange={handleChange} placeholder="1043" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Provincia *</label>
                      <select
                        name="province"
                        value={form.province}
                        onChange={handleChange}
                        required
                        className="mt-1.5 w-full rounded-lg border border-slate-200 hover:border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                      >
                        <option value="">Seleccioná una provincia</option>
                        {PROVINCES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>
              )}

              {/* SECCIÓN 3: Notas */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
                <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center">
                    {form.delivery_method === "shipping" ? "3" : "2"}
                  </span>
                  Notas del pedido
                  <span className="text-xs text-slate-400 font-normal">(opcional)</span>
                </h2>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 hover:border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition-colors placeholder:text-slate-400"
                  placeholder="Instrucciones especiales, horario de entrega, etc."
                />
              </section>
            </div>

            {/* ---- COLUMNA DERECHA: RESUMEN ---- */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 sticky top-24 space-y-5">
                <h2 className="font-bold text-slate-900">Resumen del pedido</h2>

                {/* Productos */}
                <ul className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {cart.items.map((item) => {
                    const img = item.product.images
                      ?.slice().sort((a, b) => a.sort_order - b.sort_order)[0];
                    return (
                      <li key={item.product_id} className="flex gap-3">
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0">
                          {img ? (
                            <Image
                              src={getProductImageUrl(img.image_url, { width: 88 })}
                              alt={item.product.name}
                              fill className="object-contain p-1" sizes="44px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 text-slate-300" strokeWidth={1} />
                            </div>
                          )}
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-700 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug">
                            {item.product.name}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-900 flex-shrink-0">
                          {formatPrice(item.unit_price * item.quantity)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* Cupón */}
                <div className="pt-1">
                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    ¿Tenés un cupón?
                  </p>
                  {cart.coupon_code ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm text-emerald-700 font-semibold">
                          {cart.coupon_code}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => cart.removePromotion()}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="CÓDIGO"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleApplyCoupon}
                        isLoading={isApplyingCoupon}
                      >
                        Aplicar
                      </Button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {couponError}
                    </p>
                  )}
                </div>

                {/* Totales */}
                <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-900">{formatPrice(cart.subtotal)}</span>
                  </div>
                  {cart.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Descuento</span>
                      <span>-{formatPrice(cart.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Envío</span>
                    <span className={shippingCost === 0 ? "text-emerald-600 font-semibold" : "font-medium text-slate-900"}>
                      {shippingCost === 0 ? "Gratis" : formatPrice(shippingCost)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-3">
                    <span>Total</span>
                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                {/* Error */}
                {checkoutError && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 animate-fade-in">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {checkoutError}
                  </div>
                )}

                {/* Botón de pago */}
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="lg"
                  isLoading={isProcessing}
                  className="gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {isProcessing ? "Procesando..." : "Pagar con Mercado Pago"}
                </Button>

                {/* Sellos de seguridad */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <Lock className="w-3 h-3" />
                  Pago 100% seguro · SSL cifrado
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
