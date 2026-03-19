// Helpers Square — appels via Edge Functions Supabase
// Les clés Square ne sont jamais exposées côté client
import { supabase } from './supabase';

type EdgeFunctionResponse<T> = {
  data: T | null;
  error: string | null;
};

/** Appel générique à une Edge Function Supabase */
async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<EdgeFunctionResponse<T>> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as T, error: null };
}

/** Synchroniser le catalogue Square → Supabase */
export async function syncCatalog() {
  return callEdgeFunction('sync-catalog', {});
}

/** Créer une commande Square avec variations et modificateurs */
export async function createOrder(
  items: {
    catalogObjectId: string;
    quantity: number;
    name: string;
    modifiers?: { squareModifierId: string }[];
  }[],
  userId?: string,
  pickupTime?: string,
) {
  return callEdgeFunction('create-order', { items, userId, pickupTime });
}

/** Traiter un paiement */
export async function processPayment(payload: {
  orderId: string;
  sourceId: string;
  amount: number;
  giftCardAmount?: number;
}) {
  return callEdgeFunction('process-payment', payload);
}
