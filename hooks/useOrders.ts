// Hook commandes — gestion complète des commandes avec Square
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { createOrder, processPayment } from '@/lib/square';
import { useAuthStore } from '@/stores/authStore';
import { getItemUnitPrice } from '@/stores/cartStore';
import type { Order, OrderItem, CartItem, SelectedModifier } from '@/lib/types';

/** Transforme des CartItems en OrderItems */
function cartItemsToOrderItems(items: CartItem[]): OrderItem[] {
  return items.map((item) => {
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
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const user = useAuthStore((s) => s.user);

  /** Charger les commandes depuis Supabase */
  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setOrders(
          data.map((o: Record<string, unknown>) => ({
            id: o.id as string,
            userId: o.user_id as string,
            squareOrderId: o.square_order_id as string | undefined,
            status: o.status as Order['status'],
            mode: (o.mode as Order['mode']) ?? 'pickup',
            items: ((o.order_items as Record<string, unknown>[]) ?? []).map((item) => ({
              productId: item.product_id as string,
              name: item.name as string,
              quantity: item.quantity as number,
              unitPrice: item.unit_price as number,
              totalPrice: item.total_price as number,
              modifiers: (item.modifiers as SelectedModifier[]) ?? [],
            })),
            subtotal: (o.subtotal as number) ?? 0,
            tax: (o.tax as number) ?? 0,
            loyaltyDiscount: (o.loyalty_discount as number) ?? 0,
            total: (o.total_amount as number) ?? 0,
            pickupTime: o.pickup_time as string | undefined,
            paymentMethod: (o.payment_method as Order['paymentMethod']) ?? 'card',
            squarePaymentId: o.square_payment_id as string | undefined,
            createdAt: o.created_at as string,
            updatedAt: (o.updated_at as string) ?? (o.created_at as string),
          })),
        );
      }
    } catch (err) {
      console.error('fetchOrders error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /** Passer une nouvelle commande — envoie les Square variation IDs */
  const placeOrder = useCallback(
    async (items: CartItem[], pickupTime?: string) => {
      if (!user?.id) return { success: false, error: 'Utilisateur non connecté' };
      setIsLoading(true);
      try {
        // Mapper les items du panier vers le format Square
        const squareItems = items.map((item) => {
          const catalogObjectId =
            item.selectedVariation?.squareVariationId ??
            item.product.squareId ??
            item.product.id;

          const modifiers = (item.selectedModifiers ?? []).flatMap((sel) => {
            const group = item.product.modifiers?.find((g) => g.id === sel.groupId);
            if (!group) return [];
            return sel.optionIds
              .map((optId) => {
                const opt = group.options.find((o) => o.id === optId);
                return opt ? { squareModifierId: opt.squareModifierId } : undefined;
              })
              .filter((m): m is { squareModifierId: string } => m !== undefined);
          });

          return {
            catalogObjectId,
            quantity: item.quantity,
            name: item.product.name,
            ...(modifiers.length > 0 ? { modifiers } : {}),
          };
        });

        const result = await createOrder(squareItems);

        if (result.error) {
          return { success: false, error: result.error };
        }

        const orderData = result.data as {
          orderId: string;
          totalAmount: number;
          estimatedPickup: string;
        };

        // Convertir CartItem[] en OrderItem[]
        const orderItems = cartItemsToOrderItems(items);
        const subtotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);
        const tax = Math.round(subtotal * 0.055);

        const newOrder: Order = {
          id: orderData.orderId,
          userId: user.id,
          squareOrderId: orderData.orderId,
          status: 'payment_pending',
          mode: 'pickup',
          items: orderItems,
          subtotal,
          tax,
          loyaltyDiscount: 0,
          total: orderData.totalAmount,
          pickupTime: orderData.estimatedPickup || pickupTime,
          paymentMethod: 'card',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setCurrentOrder(newOrder);
        setOrders((prev) => [newOrder, ...prev]);

        return { success: true, order: newOrder };
      } catch (err) {
        console.error('placeOrder error:', err);
        return { success: false, error: 'Erreur lors de la commande' };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id],
  );

  /** Payer une commande */
  const payOrder = useCallback(
    async (orderId: string, sourceId: string, amount: number) => {
      setIsLoading(true);
      try {
        const result = await processPayment({
          orderId,
          sourceId,
          amount,
        });

        if (result.error) {
          return { success: false, error: result.error };
        }

        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: 'payment_confirmed' as const, updatedAt: new Date().toISOString() }
              : o,
          ),
        );

        return { success: true };
      } catch (err) {
        console.error('payOrder error:', err);
        return { success: false, error: 'Erreur de paiement' };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id
                ? { ...o, status: updated.status as Order['status'], updatedAt: new Date().toISOString() }
                : o,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    currentOrder,
    isLoading,
    fetchOrders,
    placeOrder,
    payOrder,
    setOrders,
  };
}
