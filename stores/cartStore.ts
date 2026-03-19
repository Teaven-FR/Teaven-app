// État du panier — Zustand store avec persistance AsyncStorage
// Supporte variations et modificateurs Square
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product, CartItem, ProductVariation } from '@/lib/types';

/** Clé unique d'un item dans le panier (produit + variation + modifiers) */
function cartItemKey(
  productId: string,
  variation?: ProductVariation,
  modifiers?: Record<string, string[]>,
): string {
  const parts = [productId];
  if (variation) parts.push(variation.id);
  if (modifiers) {
    const sorted = Object.entries(modifiers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([gid, ids]) => `${gid}:${ids.sort().join(',')}`)
      .join('|');
    if (sorted) parts.push(sorted);
  }
  return parts.join('::');
}

/** Calcule le prix unitaire d'un CartItem (variation + modifiers) */
export function getItemUnitPrice(item: CartItem): number {
  const basePrice = item.selectedVariation?.price ?? item.product.price;
  const modExtra = (item.selectedModifiers ?? []).reduce((sum, sel) => {
    const group = item.product.modifiers?.find((g) => g.id === sel.groupId);
    if (!group) return sum;
    return sum + sel.optionIds.reduce((s, optId) => {
      const opt = group.options.find((o) => o.id === optId);
      return s + (opt?.price ?? 0);
    }, 0);
  }, 0);
  return basePrice + modExtra;
}

interface CartState {
  items: CartItem[];
  addItem: (
    product: Product,
    quantity?: number,
    variation?: ProductVariation,
    modifiers?: Record<string, string[]>,
  ) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getTax: () => number;
  getItemCount: () => number;
  getLoyaltyDiscount: (usePoints: boolean) => number;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (
        product: Product,
        quantity = 1,
        variation?: ProductVariation,
        modifiers?: Record<string, string[]>,
      ) => {
        set((state) => {
          const key = cartItemKey(product.id, variation, modifiers);

          // Chercher un item existant avec la même combinaison
          const existingIdx = state.items.findIndex(
            (item) =>
              cartItemKey(
                item.product.id,
                item.selectedVariation,
                Object.fromEntries(
                  (item.selectedModifiers ?? []).map((s) => [s.groupId, s.optionIds]),
                ),
              ) === key,
          );

          if (existingIdx >= 0) {
            const updated = [...state.items];
            updated[existingIdx] = {
              ...updated[existingIdx],
              quantity: updated[existingIdx].quantity + quantity,
            };
            return { items: updated };
          }

          // Construire les selectedModifiers depuis le Record
          const selectedModifiers = modifiers
            ? Object.entries(modifiers)
                .filter(([, ids]) => ids.length > 0)
                .map(([groupId, optionIds]) => ({ groupId, optionIds }))
            : undefined;

          return {
            items: [
              ...state.items,
              {
                product,
                quantity,
                selectedVariation: variation,
                selectedModifiers,
              },
            ],
          };
        });
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item,
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () =>
        get().items.reduce((sum, item) => sum + getItemUnitPrice(item) * item.quantity, 0),

      getTax: () => Math.round(get().getSubtotal() * 0.055),

      getTotal: () => get().getSubtotal() + get().getTax(),

      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      getLoyaltyDiscount: (usePoints: boolean) => (usePoints ? 200 : 0),

      totalItems: () => get().getItemCount(),
      totalPrice: () => get().getSubtotal(),
    }),
    {
      name: '@teaven/cart',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
