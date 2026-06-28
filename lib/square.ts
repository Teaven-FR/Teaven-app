// Helpers Square — appels via Edge Functions Supabase
// Les clés Square ne sont jamais exposées côté client
import { supabase } from './supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/config';

type EdgeFunctionResponse<T> = {
  data: T | null;
  error: string | null;
};

const SUPA_URL = SUPABASE_URL;
const ANON_KEY = SUPABASE_ANON_KEY;

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

/** Liste des fonctions edge qui exigent un user authentifié — pas de fallback anon */
const AUTH_REQUIRED_FUNCTIONS = new Set([
  'process-recharge',
  'process-payment',
  'manage-wallet',
  'claim-birthday-bonus',
]);

/** Appel générique à une Edge Function — refresh auto du token, fallback anon si possible */
export async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  accessToken?: string,
): Promise<EdgeFunctionResponse<T>> {
  const requiresAuth = AUTH_REQUIRED_FUNCTIONS.has(functionName);

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
    if (!result.error) return result;

    // Si "Invalid JWT" → tenter de rafraîchir la session avant de retomber sur anon
    if (result.error.includes('Invalid JWT') || result.error.includes('invalid_jwt')) {
      console.warn(`[${functionName}] Token invalide, tentative de refresh`);
      try {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        if (refreshed?.access_token) {
          const retried = await fetchEdgeFunction<T>(functionName, body, refreshed.access_token);
          if (!retried.error) return retried;
        }
      } catch { /* refresh failed */ }

      if (requiresAuth) {
        return { data: null, error: 'Connexion requise. Reconnectez-vous pour continuer.' };
      }
      return fetchEdgeFunction<T>(functionName, body, ANON_KEY);
    }
    return result;
  }

  // 2. Pas de token → fonction protégée : on rejette explicitement
  if (requiresAuth) {
    return { data: null, error: 'Connexion requise. Reconnectez-vous pour continuer.' };
  }

  // 3. Pas de token → fonction publique : utiliser anon key
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
export async function fetchWalletBalance(accessToken?: string, userId?: string) {
  return callEdgeFunction<{ success: boolean; balance: number; giftCardId?: string }>(
    'manage-wallet',
    // userId : fallback côté edge si le JWT user est rejeté par le SDK Supabase
    { action: 'balance', userId },
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
