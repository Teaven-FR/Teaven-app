// Edge Function — Lecture du solde wallet Teaven.
//
// Doctrine Teaven : Square est la source de vérité unique du solde.
// Cette fonction ne fait QUE lire — jamais écrire un solde.
//
// Actions supprimées :
//   - `recharge` → utiliser process-recharge (flux Square-first avec paiement)
//   - `pay`      → utiliser process-payment (flux Square-first avec REDEEM)
//
// Action conservée :
//   - `balance`  → lit le solde directement depuis Square Gift Cards API

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

async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/** Lit le solde d'une gift card Square. Null si échec. */
async function getSquareGiftCardBalance(giftCardId: string): Promise<number | null> {
  try {
    const res = await fetch(`${SQUARE_BASE_URL}/v2/gift-cards/${giftCardId}`, {
      method: 'GET',
      headers: {
        'Square-Version': SQUARE_VERSION,
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      },
    });
    if (!res.ok) {
      console.warn('[manage-wallet] getSquareGiftCardBalance HTTP', res.status);
      return null;
    }
    const data = await res.json();
    return data.gift_card?.balance_money?.amount ?? 0;
  } catch (err) {
    console.warn('[manage-wallet] getSquareGiftCardBalance exception:', err);
    return null;
  }
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
    const body = await req.json().catch(() => ({}));
    const { action } = body as { action?: string };

    // Seule action autorisée désormais
    if (action && action !== 'balance') {
      return new Response(
        JSON.stringify({
          error: `Action "${action}" retirée. Utilise process-recharge ou process-payment.`,
        }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const authUser = await authenticateUser(req);
    if (!authUser) {
      // Pas auth → réponse vide tolérante (UX : non-bloquante pour home public)
      return new Response(
        JSON.stringify({ success: true, balance: 0, giftCardId: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Récupérer square_customer_id + square_gift_card_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('square_customer_id, square_gift_card_id')
      .eq('id', authUser.id)
      .single();

    if (!profile?.square_customer_id) {
      // Compte pas encore lié à Square → solde 0
      return new Response(
        JSON.stringify({ success: true, balance: 0, giftCardId: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Garantir une gift card active (crée si absente) via ensure-gift-card
    let giftCardId = profile.square_gift_card_id;
    if (!giftCardId) {
      const ensureRes = await fetch(`${supabaseUrl}/functions/v1/ensure-gift-card`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          squareCustomerId: profile.square_customer_id,
          userId: authUser.id,
        }),
      });
      if (ensureRes.ok) {
        const data = await ensureRes.json();
        giftCardId = data.giftCardId ?? null;
      }
    }

    if (!giftCardId) {
      return new Response(
        JSON.stringify({ success: true, balance: 0, giftCardId: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Lire balance depuis Square (source de vérité)
    const balance = await getSquareGiftCardBalance(giftCardId);

    return new Response(
      JSON.stringify({
        success: true,
        balance: balance ?? 0,
        giftCardId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[manage-wallet] error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
