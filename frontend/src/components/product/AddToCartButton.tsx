"use client";

// =============================================
// COMPONENTE: ADD TO CART BUTTON
// Botón con selector de cantidad para la página de detalle.
// Muestra feedback visual al agregar al carrito.
// =============================================

import { useState } from "react";
import { ShoppingCart, Minus, Plus, Check } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import type { Product } from "@/types";
import { cn } from "@/lib/utils/cn";

interface AddToCartButtonProps {
  product: Product;
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const isOutOfStock = product.stock_quantity <= 0;
  const maxQuantity  = Math.min(product.stock_quantity, 99);

  function handleAdd() {
    if (justAdded) return;
    addItem(product, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  }

  if (isOutOfStock) {
    return (
      <div className="flex flex-col gap-2">
        <button
          disabled
          className="w-full py-3.5 rounded-xl bg-slate-100 text-slate-400 text-sm font-semibold cursor-not-allowed"
        >
          Sin stock disponible
        </button>
        <p className="text-xs text-slate-400 text-center">
          Este producto no está disponible actualmente
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selector de cantidad */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Cantidad:</span>
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors"
            aria-label="Disminuir cantidad"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-10 text-center text-sm font-bold text-slate-900">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            disabled={quantity >= maxQuantity}
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors"
            aria-label="Aumentar cantidad"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {maxQuantity <= 5 && (
          <span className="text-xs text-amber-600 font-semibold">
            ¡Solo {maxQuantity} disponibles!
          </span>
        )}
      </div>

      {/* Botón principal */}
      <button
        onClick={handleAdd}
        disabled={justAdded}
        className={cn(
          "w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2",
          "transition-all duration-200 active:scale-[0.98]",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          justAdded
            ? "bg-emerald-500 text-white focus:ring-emerald-400 cursor-default"
            : "bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500"
        )}
      >
        {justAdded ? (
          <>
            <Check className="w-4 h-4" strokeWidth={2.5} />
            ¡Agregado al carrito!
          </>
        ) : (
          <>
            <ShoppingCart className="w-4 h-4" />
            Agregar al carrito
            {quantity > 1 && ` (${quantity})`}
          </>
        )}
      </button>
    </div>
  );
}
