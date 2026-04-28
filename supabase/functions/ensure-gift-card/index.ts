// Edge Function — Garantir qu'un client Square a une gift card active.
//
// Doctrine Teaven : Square = source de vérité unique. Supabase stocke uniquement
// la référence (square_gift_card_id), jamais le solde.
//
// Comportement :
//   1. Liste les gift cards ACTIVE du customer Square
//   2. Si ≥1 existe → retourne la première (1 carte par client, doctrine)
//   3. Si 0 → crée une gift card DIGITAL à 0€ et la lie au customer
//   4. Optionnel : persiste square_gift_card_id sur profiles Supabase
//
// Cette fonction ne crée JAMAIS de doublon : elle est idempotente par customer.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SQUARE_ENV = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
const SQUARE_BASE_URL = SQUARE_ENV === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';
const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN') ?? '';
const SQUARE_VERSION = '2025-01-23';
const LOCATION_ID = Deno.env.get('SQUARE_LOCATION_ID') ?? '';

async function squareFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SQUARE_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Square-Version': SQUARE_VERSION,
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Square ${res.status} ${path} → ${JSON.stringify(body)}`);
  }
  return body;
}

/**
 * Cherche toutes les gift cards ACTIVE liées à ce customer Square.
 * Retourne la liste triée par date de création (plus ancienne en premier).
 */
async function listActiveGiftCards(squareCustomerId: string): Promise<Array<{
  id: string;
  balance: number;
  createdAt: string;
}>> {
  const cards: Array<{ id: string; balance: number; createdAt: string }> = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${SQUARE_BASE_URL}/v2/gift-cards`);
    url.searchParams.set('customer_id', squareCustomerId);
    url.searchParams.set('state', 'ACTIVE');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Square-Version': SQUARE_VERSION,
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      },
    });
    if (!res.ok) {
      console.warn('[ensure-gift-card] listActiveGiftCards HTTP error:', await res.text());
      break;
    }
    const data = await res.json();
    for (const card of data.gift_cards ?? []) {
      if (card.state === 'ACTIVE') {
        cards.push({
          id: card.id,
          balance: card.balance_money?.amount ?? 0,
          createdAt: card.created_at ?? '',
        });
      }
    }
    cursor = data.cursor;
  } while (cursor);

  cards.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return cards;
}

/**
 * Crée une nouvelle gift card DIGITAL à 0€ et la lie au customer Square.
 * La carte sera chargée via LOAD lors de la première recharge.
 */
async function createAndLinkGiftCard(squareCustomerId: string): Promise<string> {
  const { gift_card } = await squareFetch('/v2/gift-cards', {
    method: 'POST',
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      location_id: LOCATION_ID,
      gift_card: { type: 'DIGITAL' },
    }),
  });
  const giftCardId = gift_card.id as string;

  // Lier au customer Square
  await squareFetch(`/v2/gift-cards/${giftCardId}/link-customer`, {
    method: 'POST',
    body: JSON.stringify({ customer_id: squareCustomerId }),
  });

  return giftCardId;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Méthode non autorisée' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { squareCustomerId, userId } = await req.json() as {
      squareCustomerId?: string;
      userId?: string;
    };

    if (!squareCustomerId) {
      return new Response(
        JSON.stringify({ error: 'squareCustomerId requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1. Lister les cartes actives existantes
    const activeCards = await listActiveGiftCards(squareCustomerId);

    let giftCardId: string;
    let balance: number;
    let created = false;

    if (activeCards.length > 0) {
      // 2a. Au moins une carte existe → prendre la plus ancienne (canonique)
      giftCardId = activeCards[0].id;
      balance = activeCards[0].balance;
      if (activeCards.length > 1) {
        console.warn(
          `[ensure-gift-card] Customer ${squareCustomerId} a ${activeCards.length} cartes actives. ` +
          `Utilisation de la plus ancienne (${giftCardId}). Les autres devraient être désactivées.`,
        );
      }
    } else {
      // 2b. Aucune carte → créer + linker
      giftCardId = await createAndLinkGiftCard(squareCustomerId);
      balance = 0;
      created = true;
      console.log(`[ensure-gift-card] Gift card créée ${giftCardId} pour customer ${squareCustomerId}`);
    }

    // 3. Persister square_gift_card_id dans Supabase si userId fourni
    if (userId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await supabase
        .from('profiles')
        .update({
          square_gift_card_id: giftCardId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        giftCardId,
        balance,
        created,
        duplicatesCount: Math.max(0, activeCards.length - 1),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[ensure-gift-card] error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
