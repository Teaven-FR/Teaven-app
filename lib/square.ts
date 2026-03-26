// Helpers Square — appels via Edge Functions Supabase
// Les clés Square ne sont jamais exposées côté client
import { supabase } from './supabase';

type EdgeFunctionResponse<T> = {
  data: T | null;
  error: string | null;
};

const SUPA_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Appel HTTP à une Edge Function Supabase */
async function fetchEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  bearerToken: string,
): Promise<EdgeFunctionResponse<T>> {
  const res = await fetch(`${SUPA_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok) {
    return { data: null, error: json.error ?? json.message ?? `Erreur ${res.status}` };
  }

  return { data: json as T, error: null };
}

/** Appel générique à une Edge Function — retry automatique avec anon key si JWT invalide */
export async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  accessToken?: string,
): Promise<EdgeFunctionResponse<T>> {
  // 1. Essayer avec le token user si disponible
  let token = accessToken;
  if (!token) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token ?? undefined;
    } catch { /* pas de session */ }
  }

  if (token) {
    const result = await fetchEdgeFunction<T>(functionName, body, token);
    // Si ça marche → retourner
    if (!result.error) return result;
    // Si "Invalid JWT" → retry avec anon key
    if (result.error.includes('Invalid JWT') || result.error.includes('invalid_jwt')) {
      console.warn(`[${functionName}] Token invalide, retry avec anon key`);
      return fetchEdgeFunction<T>(functionName, body, ANON_KEY);
    }
    return result;
  }

  // 2. Pas de token → utiliser anon key directement
  return fetchEdgeFunction<T>(functionName, body, ANON_KEY);
}

/** Synchroniser le catalogue Square → Supabase */
export async function syncCatalog() {
  return callEdgeFunction('sync-catalog', {});
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

/** Récupérer le solde du wallet (Square Gift Cards) */
export async function fetchWalletBalance(accessToken?: string) {
  return callEdgeFunction<{ success: boolean; balance: number; giftCardId?: string }>(
    'manage-wallet',
    { action: 'balance' },
    accessToken,
  );
}

/** Créer une commande Square */
export async function createOrder(
  items: { catalogObjectId: string; quantity: number; name: string; modifiers?: { squareModifierId: string }[] }[],
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
