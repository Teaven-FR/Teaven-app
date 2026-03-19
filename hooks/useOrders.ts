// Hook commandes — gestion complète des commandes
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { createOrder, processPayment } from '@/lib/square';
import { useAuthStore } from '@/stores/authStore';
import type { Order, CartItem } from '@/lib/types';

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
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setOrders(
          data.map((o: Record<string, unknown>) => ({
            id: o.id as string,
            items: (o.items as CartItem[]) ?? [],
            totalAmount: o.total_amount as number,
            status: o.status as Order['status'],
            createdAt: o.created_at as string,
            estimatedReadyAt: (o.pickup_time as string) ?? '',
          })),
        );
      }
    } catch (err) {
      console.error('fetchOrders error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /** Passer une nouvelle commande */
  const placeOrder = useCallback(
    async (items: CartItem[], pickupTime?: string) => {
      setIsLoading(true);
      try {
        const squareItems = items.map((item) => ({
          catalogObjectId: item.product.id,
          quantity: item.quantity,
          name: item.product.name,
          price: item.product.price,
        }));

        const result = await createOrder(squareItems);

        if (result.error) {
          return { success: false, error: result.error };
        }

        const orderData = result.data as {
          orderId: string;
          totalAmount: number;
          estimatedPickup: string;
        };

        const newOrder: Order = {
          id: orderData.orderId,
          items,
          totalAmount: orderData.totalAmount,
          status: 'pending',
          createdAt: new Date().toISOString(),
          estimatedReadyAt: orderData.estimatedPickup,
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
    [],
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

        // Mettre à jour le statut localement
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: 'confirmed' as const } : o,
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
                ? { ...o, status: updated.status as Order['status'] }
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
