// État des commandes — Zustand store avec persistance
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCartStore, getItemUnitPrice } from '@/stores/cartStore';
import type { Order, OrderStatus, CartItem, SelectedModifier } from '@/lib/types';

interface OrderState {
  currentOrder: Order | null;
  orderHistory: Order[];
  isProcessing: boolean;

  createOrder: (
    cartItems: CartItem[],
    paymentMethod: 'card' | 'wallet' | 'mixed',
    usePoints: boolean,
  ) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  getOrderById: (orderId: string) => Order | undefined;
  loadOrderHistory: () => void;
  clearCurrentOrder: () => void;
}

/** Génère un ID de commande lisible */
function generateOrderId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const num = Math.floor(Math.random() * 999) + 1;
  return `TEA-${year}-${num.toString().padStart(3, '0')}`;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      currentOrder: null,
      orderHistory: [],
      isProcessing: false,

      createOrder: async (cartItems, paymentMethod, usePoints) => {
        set({ isProcessing: true });

        // Transformer les items du panier en OrderItems
        const orderItems = cartItems.map((item) => {
          const unitPrice = getItemUnitPrice(item);
          const modifiers: SelectedModifier[] = [];

          // Mapper les modificateurs sélectionnés
          (item.selectedModifiers ?? []).forEach((sel) => {
            const group = item.product.modifiers?.find((g) => g.id === sel.groupId);
            if (!group) return;
            sel.optionIds.forEach((optId) => {
              const opt = group.options.find((o) => o.id === optId);
              if (opt) {
                modifiers.push({
                  groupId: group.id,
                  groupName: group.label,
                  optionId: opt.id,
                  optionName: opt.label,
                  priceAdjustment: opt.price,
                });
              }
            });
          });

          return {
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            unitPrice,
            totalPrice: unitPrice * item.quantity,
            modifiers,
          };
        });

        const subtotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);
        const tax = Math.round(subtotal * 0.055);
        const loyaltyDiscount = usePoints ? 200 : 0;
        const total = subtotal + tax - loyaltyDiscount;

        const order: Order = {
          id: generateOrderId(),
          userId: 'mock-user-001',
          status: 'payment_confirmed',
          mode: 'pickup',
          items: orderItems,
          subtotal,
          tax,
          loyaltyDiscount,
          total,
          pickupTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          paymentMethod,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Vider le panier
        useCartStore.getState().clearCart();

        set({
          currentOrder: order,
          orderHistory: [order, ...get().orderHistory],
          isProcessing: false,
        });

        return order;
      },

      updateOrderStatus: (orderId, status) => {
        set((state) => {
          const updatedHistory = state.orderHistory.map((o) =>
            o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o,
          );
          const updatedCurrent =
            state.currentOrder?.id === orderId
              ? { ...state.currentOrder, status, updatedAt: new Date().toISOString() }
              : state.currentOrder;

          return {
            orderHistory: updatedHistory,
            currentOrder: updatedCurrent,
          };
        });
      },

      getOrderById: (orderId) => {
        return get().orderHistory.find((o) => o.id === orderId);
      },

      loadOrderHistory: () => {
        // Les données sont déjà persistées via AsyncStorage
        // Plus tard : fetch depuis Supabase
      },

      clearCurrentOrder: () => set({ currentOrder: null }),
    }),
    {
      name: '@teaven/orders',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        orderHistory: state.orderHistory.slice(0, 20), // Garder les 20 dernières
      }),
    },
  ),
);
