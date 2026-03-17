// État du panier — Zustand store avec persistance AsyncStorage
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product, CartItem } from '@/lib/types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getTax: () => number;
  getItemCount: () => number;
  getLoyaltyDiscount: (usePoints: boolean) => number;
  // Compat avec le code existant
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product) => {
        set((state) => {
          const existing = state.items.find((item) => item.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              ),
            };
          }
          return { items: [...state.items, { product, quantity: 1 }] };
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
        get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),

      getTax: () => Math.round(get().getSubtotal() * 0.055),

      getTotal: () => get().getSubtotal() + get().getTax(),

      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      getLoyaltyDiscount: (usePoints: boolean) => (usePoints ? 200 : 0), // 2€

      // Compat
      totalItems: () => get().getItemCount(),
      totalPrice: () => get().getSubtotal(),
    }),
    {
      name: '@teaven/cart',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
