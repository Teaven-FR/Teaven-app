// Helpers Square — appels via Edge Functions Supabase
// Les clés Square ne sont jamais exposées côté client
import { supabase } from './supabase';

type EdgeFunctionResponse<T> = {
  data: T | null;
  error: string | null;
};

/** Appel générique à une Edge Function Supabase — utilise fetch directement pour capturer les erreurs */
export async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  accessToken?: string,
): Promise<EdgeFunctionResponse<T>> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

  // Récupérer un token valide (refresh automatique si expiré)
  let token = accessToken;
  if (!token) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // Vérifier si le token est expiré et refresh si nécessaire
        const expiresAt = session.expires_at ?? 0;
        if (expiresAt * 1000 < Date.now()) {
          const { data: { session: refreshed } } = await supabase.auth.refreshSession();
          token = refreshed?.access_token;
        } else {
          token = session.access_token;
        }
      }
    } catch {
      // Pas de session — on continue avec l'anon key
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': anonKey,
    'Authorization': `Bearer ${token || anonKey}`,
  };

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      const msg = json.error ?? json.message ?? `Erreur ${res.status}`;
      console.warn(`[EdgeFunction:${functionName}]`, msg);
      return { data: null, error: msg };
    }

    return { data: json as T, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur réseau';
    console.warn(`[EdgeFunction:${functionName}]`, msg);
    return { data: null, error: msg };
  }
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

/** Récupérer le solde du wallet (Square Gift Cards) */
export async function fetchWalletBalance(accessToken?: string) {
  return callEdgeFunction<{ success: boolean; balance: number }>(
    'manage-wallet',
    { action: 'balance' },
    accessToken,
  );
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
