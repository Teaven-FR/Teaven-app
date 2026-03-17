// Hook commandes — gestion des commandes (à connecter plus tard)
import { useState } from 'react';
import type { Order } from '@/lib/types';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    // TODO: Connecter à Supabase + Square via Edge Functions
    setIsLoading(false);
  };

  return {
    orders,
    isLoading,
    fetchOrders,
    setOrders,
  };
}
