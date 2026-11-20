// =============================================
// STORE DEL CARRITO DE COMPRAS
// Gestiona el estado del carrito usando Zustand con persistencia.
// Incluye estado de toast para notificaciones visuales.
// =============================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cart, CartItem, Product, Promotion } from "@/types";

// Estado del toast de notificación al agregar producto
interface CartToast {
  visible: boolean;
  productName: string;
  productImage?: string;
}

interface CartState extends Cart {
  /** Cuenta a la que pertenece el carrito; null mientras es de invitado. */
  ownerId: string | null;
  total_items: number;
  subtotal: number;
  total: number;
  toast: CartToast;

  addItem: (product: Product, quantity?: number) => void;
  removeItem: (product_id: string) => void;
  updateQuantity: (product_id: string, quantity: number) => void;
  applyPromotion: (promotion: Promotion) => void;
  removePromotion: () => void;
  clearCart: () => void;
  dismissToast: () => void;
  syncOwner: (userId: string | null) => void;
}

const initialState: Cart = {
  items: [],
  coupon_code: undefined,
  discount_amount: 0,
};

const initialToast: CartToast = {
  visible: false,
  productName: "",
  productImage: undefined,
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      ...initialState,
      ownerId: null,
      total_items: 0,
      subtotal: 0,
      total: 0,
      toast: initialToast,

      // Sólo un carrito de invitado puede pasar a una cuenta. Al salir o
      // cambiar de usuario, se borran también cupón, totales y notificación.
      syncOwner: (userId) => {
        const previous = get().ownerId;
        if (previous === userId) return;
        if (previous === null && userId !== null) {
          set({ ownerId: userId, toast: initialToast });
        } else {
          get().clearCart();
          set({ ownerId: userId });
        }
      },

      // Agrega un producto al carrito. Si ya existe, incrementa la cantidad.
      // Respeta el stock disponible y activa el toast de confirmación.
      addItem: (product: Product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product_id === product.id
          );

          let updatedItems: CartItem[];

          if (existingItem) {
            const newQuantity = Math.min(
              existingItem.quantity + quantity,
              product.stock_quantity
            );
            updatedItems = state.items.map((item) =>
              item.product_id === product.id
                ? { ...item, quantity: newQuantity }
                : item
            );
          } else {
            const newItem: CartItem = {
              product_id: product.id,
              product: {
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                images: product.images,
                sku: product.sku,
                stock_quantity: product.stock_quantity,
              },
              quantity: Math.min(quantity, product.stock_quantity),
              unit_price: product.price,
            };
            updatedItems = [...state.items, newItem];
          }

          // Imagen principal del producto para el toast
          const mainImage = product.images
            ?.slice()
            .sort((a, b) => a.sort_order - b.sort_order)[0];

          return {
            ...computeCartTotals({ ...state, items: updatedItems }),
            toast: {
              visible: true,
              productName: product.name,
              productImage: mainImage?.image_url,
            },
          };
        });

        // Ocultar el toast automáticamente después de 3 segundos
        setTimeout(() => {
          get().dismissToast();
        }, 3000);
      },

      removeItem: (product_id: string) => {
        set((state) => {
          const updatedItems = state.items.filter(
            (item) => item.product_id !== product_id
          );
          return computeCartTotals({ ...state, items: updatedItems });
        });
      },

      updateQuantity: (product_id: string, quantity: number) => {
        set((state) => {
          if (quantity <= 0) {
            const updatedItems = state.items.filter(
              (item) => item.product_id !== product_id
            );
            return computeCartTotals({ ...state, items: updatedItems });
          }

          const updatedItems = state.items.map((item) =>
            item.product_id === product_id
              ? {
                  ...item,
                  quantity: Math.min(quantity, item.product.stock_quantity),
                }
              : item
          );
          return computeCartTotals({ ...state, items: updatedItems });
        });
      },

      applyPromotion: (promotion: Promotion) => {
        set((state) => {
          const subtotal = calculateSubtotal(state.items);
          let discountAmount = 0;

          if (promotion.type === "percentage") {
            discountAmount = (subtotal * promotion.value) / 100;
          } else if (promotion.type === "fixed_amount") {
            discountAmount = Math.min(promotion.value, subtotal);
          }

          const newState = {
            ...state,
            coupon_code: promotion.code,
            discount_amount: discountAmount,
          };
          return computeCartTotals(newState);
        });
      },

      removePromotion: () => {
        set((state) => {
          const newState = {
            ...state,
            coupon_code: undefined,
            discount_amount: 0,
          };
          return computeCartTotals(newState);
        });
      },

      clearCart: () => {
        set({
          ...initialState,
          total_items: 0,
          subtotal: 0,
          total: 0,
          toast: initialToast,
        });
      },

      dismissToast: () => {
        set((state) => ({
          ...state,
          toast: { ...state.toast, visible: false },
        }));
      },
    }),
    {
      name: "tele-import-cart",
      version: 1,
      // El carrito anterior era global: no se puede atribuir con seguridad
      // a la cuenta actual. Se descarta una sola vez al actualizar.
      migrate: (): Cart & { ownerId: string | null } => ({ ...initialState, ownerId: null }),
      partialize: (state) => ({
        ownerId: state.ownerId,
        items: state.items,
        coupon_code: state.coupon_code,
        discount_amount: state.discount_amount,
      }),
      merge: (persisted, current) => {
        const restored = { ...current, ...(persisted as Partial<CartState>) };
        return { ...restored, ...computeCartTotals(restored), toast: initialToast };
      },
    }
  )
);

function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
}

function computeCartTotals(state: Cart & Partial<CartState>): Partial<CartState> {
  const subtotal = calculateSubtotal(state.items);
  const total_items = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = Math.max(0, subtotal - (state.discount_amount ?? 0));

  return {
    ...state,
    subtotal,
    total_items,
    total,
  };
}
