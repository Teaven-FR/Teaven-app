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
  body: Record<string, unknown>,
  accessToken?: string,
): Promise<EdgeFunctionResponse<T>> {
  let token = accessToken;
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  }

  const headers: Record<string, string> = token
    ? { 'Authorization': `Bearer ${token}` }
    : {};

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as T, error: null };
}

/** Expose callEdgeFunction avec token pour les appels authentifiés */
export async function callAuthenticatedFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<EdgeFunctionResponse<T>> {
  return callEdgeFunction<T>(functionName, body, accessToken);
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

/** Récupérer ou créer un client Square par téléphone */
export async function fetchCustomer(phone: string, accessToken?: string) {
  return callEdgeFunction<{
    success: boolean;
    customer: {
      squareCustomerId: string;
      fullName: string;
      email: string | null;
      phone: string;
      createdAt: string;
    } | null;
  }>('fetch-customer', { phone }, accessToken);
}

/** Récupérer les données de fidélité */
export async function fetchLoyalty(customerId: string, accessToken?: string, phone?: string) {
  return callEdgeFunction<{
    success: boolean;
    points: number;
    level: string;
    progress: number;
    loyaltyAccountId: string | null;
    rewards: {
      id: string;
      name: string;
      description: string;
      pointsCost: number;
      icon: string;
    }[];
    accrualRules: {
      type: string;
      points: number;
      spendAmount?: number;
    }[];
  }>('get-loyalty', { customerId, ...(phone ? { phone } : {}) }, accessToken);
}
