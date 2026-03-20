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

/** Génère la clé d'un CartItem déjà dans le panier */
function existingItemKey(item: CartItem): string {
  return cartItemKey(
    item.product.id,
    item.selectedVariation,
    Object.fromEntries(
      (item.selectedModifiers ?? []).map((s) => [s.groupId, s.optionIds]),
    ),
  );
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
  removeItem: (itemKey: string) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getTax: () => number;
  getItemCount: () => number;
  getLoyaltyDiscount: (usePoints: boolean, loyaltyPoints: number) => number;
  totalItems: () => number;
  totalPrice: () => number;
  getItemKey: (item: CartItem) => string;
}

// Seuils de fidélité pour le calcul du discount
const LOYALTY_DISCOUNTS: { minPoints: number; discount: number }[] = [
  { minPoints: 1000, discount: 500 }, // Platine: 5€
  { minPoints: 500, discount: 300 },  // Or: 3€
  { minPoints: 200, discount: 200 },  // Argent: 2€
];

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
            (item) => existingItemKey(item) === key,
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

      removeItem: (itemKey: string) => {
        set((state) => ({
          items: state.items.filter((item) => existingItemKey(item) !== itemKey),
        }));
      },

      updateQuantity: (itemKey: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(itemKey);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            existingItemKey(item) === itemKey ? { ...item, quantity } : item,
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () =>
        get().items.reduce((sum, item) => sum + getItemUnitPrice(item) * item.quantity, 0),

      getTax: () => Math.round(get().getSubtotal() * 0.055),

      getTotal: () => get().getSubtotal() + get().getTax(),

      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      getLoyaltyDiscount: (usePoints: boolean, loyaltyPoints: number) => {
        if (!usePoints) return 0;
        for (const tier of LOYALTY_DISCOUNTS) {
          if (loyaltyPoints >= tier.minPoints) return tier.discount;
        }
        return 0;
      },

      totalItems: () => get().getItemCount(),
      totalPrice: () => get().getSubtotal(),
      getItemKey: (item: CartItem) => existingItemKey(item),
    }),
    {
      name: '@teaven/cart',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
