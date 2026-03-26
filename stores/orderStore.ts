// État des commandes — Zustand store avec persistance
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCartStore, getItemUnitPrice } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { callEdgeFunction } from '@/lib/square';
import type { Order, OrderStatus, CartItem, SelectedModifier } from '@/lib/types';

interface OrderState {
  currentOrder: Order | null;
  orderHistory: Order[];
  isProcessing: boolean;

  createOrder: (
    cartItems: CartItem[],
    paymentMethod: 'card' | 'wallet' | 'mixed',
    usePoints: boolean,
    cardNonce?: string,
    giftCardId?: string,
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

      createOrder: async (cartItems, paymentMethod, _usePoints, cardNonce?, giftCardId?) => {
        set({ isProcessing: true });

        const authUser = useAuthStore.getState().user;
        const userId = authUser?.id ?? 'guest';

        // Construire les items pour le local + les line_items pour Square
        const orderItems = cartItems.map((item) => {
          const unitPrice = getItemUnitPrice(item);
          const modifiers: SelectedModifier[] = [];
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

        // ── Appel Square via Edge Functions ──
        try {
          // 1. Créer la commande sur Square
          const squareItems = cartItems.map((item) => {
            const variation = item.selectedVariation ?? item.product.variations?.[0];
            const mods = (item.selectedModifiers ?? []).flatMap((sel) => {
              const group = item.product.modifiers?.find((g) => g.id === sel.groupId);
              if (!group) return [];
              return sel.optionIds.map((optId) => {
                const opt = group.options.find((o) => o.id === optId);
                return { squareModifierId: opt?.squareModifierId ?? optId };
              });
            });
            return {
              catalogObjectId: variation?.squareVariationId ?? item.product.squareId ?? item.product.id,
              quantity: item.quantity,
              name: item.product.name,
              modifiers: mods.length > 0 ? mods : undefined,
            };
          });

          // Vérifier que tous les items ont un vrai ID Square
          const invalidItems = squareItems.filter((i) => !i.catalogObjectId || i.catalogObjectId.length < 10);
          if (invalidItems.length > 0) {
            console.error('[ORDER] Items without Square IDs:', invalidItems.map((i) => i.name));
            throw new Error(`Produit "${invalidItems[0].name}" non synchronisé avec Square. Veuillez réessayer.`);
          }

          console.log('[ORDER] Creating order with', squareItems.length, 'items');
          console.log('[ORDER] catalogObjectIds:', squareItems.map((i) => `${i.name}: ${i.catalogObjectId}`));

          // 1. Créer la commande sur Square (callEdgeFunction gère l'auth automatiquement)
          const createResult = await callEdgeFunction<{
            success: boolean;
            orderId: string;
            totalAmount: number;
            estimatedPickup: string;
            dbOrder?: { id: string };
            error?: string;
          }>('create-order', { items: squareItems });

          console.log('[ORDER] create-order result:', JSON.stringify(createResult).slice(0, 500));

          if (createResult.error || !createResult.data?.success) {
            throw new Error(createResult.error ?? createResult.data?.error ?? 'create-order failed');
          }

          const squareOrderId = createResult.data.orderId;
          const squareTotal = createResult.data.totalAmount ?? subtotal;

          console.log('[ORDER] Paying order', squareOrderId, 'amount:', squareTotal);

          // 2. Payer la commande sur Square
          const payResult = await callEdgeFunction<{
            success: boolean;
            error?: string;
          }>('process-payment', {
            orderId: squareOrderId,
            sourceId: cardNonce ?? undefined,
            amount: squareTotal,
            paymentMethod,
            giftCardId: giftCardId ?? undefined,
          });

          console.log('[ORDER] process-payment result:', JSON.stringify(payResult).slice(0, 500));

          if (payResult.error || !payResult.data?.success) {
            throw new Error(payResult.error ?? payResult.data?.error ?? 'process-payment failed');
          }

          // 3. Créer l'objet order local
          const order: Order = {
            id: createResult.data.dbOrder?.id ?? generateOrderId(),
            userId,
            status: 'payment_confirmed',
            mode: 'pickup',
            items: orderItems,
            subtotal,
            tax: 0,
            loyaltyDiscount: 0,
            total: squareTotal,
            pickupTime: createResult.data.estimatedPickup ?? new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            paymentMethod,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          useCartStore.getState().clearCart();
          set({
            currentOrder: order,
            orderHistory: [order, ...get().orderHistory],
            isProcessing: false,
          });
          return order;

        } catch (err) {
          console.error('Order flow error:', err);
          set({ isProcessing: false });
          throw err;
        }
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
