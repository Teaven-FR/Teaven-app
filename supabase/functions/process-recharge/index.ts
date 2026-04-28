// Edge Function — Recharge wallet Teaven.
//
// Doctrine Teaven : Square est la source de vérité unique du solde wallet.
// Supabase stocke uniquement : square_gift_card_id (pont) + historique
// (wallet_transactions, append-only). Le solde est lu depuis Square à chaque fois.
//
// Flux Square-first :
//   1. Auth obligatoire
//   2. Récupérer ou créer la gift card du customer (via ensure-gift-card)
//   3. Déterminer si première recharge (via wallet_transactions, lecture seule)
//   4. Paiement carte Square
//   5. Si paiement OK → LOAD sur gift card (amount + bonus)
//   6. Relire balance Square et appender wallet_transactions
//   7. Retourner le nouveau solde issu de Square

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

/** Bonus de recharge — règles Teaven. */
function calculateBonus(amount: number, isFirst: boolean): number {
  if (isFirst && amount === 2000) return 500; // Première recharge 20€ → +5€
  if (amount >= 10000) return Math.round(amount * 0.12);
  if (amount >= 5000) return Math.round(amount * 0.08);
  if (amount >= 2000) return Math.round(amount * 0.05);
  return 0;
}

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
  return { ok: res.ok, status: res.status, body };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { sourceId, amount } = await req.json() as {
      sourceId?: string;
      amount?: number;
    };

    if (!sourceId || !amount || amount <= 0 || amount > 50000) {
      return new Response(
        JSON.stringify({ error: 'sourceId et amount (1-50000 cts) requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Auth OBLIGATOIRE ──
    const authUser = await authenticateUser(req);
    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'Connexion requise pour recharger le portefeuille' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── 1. Récupérer square_customer_id + square_gift_card_id ──
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('square_customer_id, square_gift_card_id')
      .eq('id', authUser.id)
      .single();

    if (profileErr || !profile?.square_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Compte Square manquant — relancez-vous connecter pour le lier.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 2. Garantir une gift card active (crée si absente) ──
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
      if (!ensureRes.ok) {
        console.error('[process-recharge] ensure-gift-card failed:', await ensureRes.text());
        return new Response(
          JSON.stringify({ error: 'Impossible de préparer la carte cadeau Square' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const ensureData = await ensureRes.json();
      giftCardId = ensureData.giftCardId;
    }

    // ── 3. Déterminer si c'est la première recharge (lecture audit log) ──
    const { count: priorCredits } = await supabase
      .from('wallet_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authUser.id)
      .eq('type', 'credit');
    const isFirst = (priorCredits ?? 0) === 0;

    const bonus = calculateBonus(amount, isFirst);
    const totalCredit = amount + bonus;

    // ── 4. Paiement carte Square (montant payé par le client) ──
    const payRes = await squareFetch('/v2/payments', {
      method: 'POST',
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: crypto.randomUUID(),
        amount_money: { amount, currency: 'EUR' },
        location_id: LOCATION_ID,
        autocomplete: true,
        note: 'Recharge portefeuille Teaven',
      }),
    });

    if (!payRes.ok) {
      console.error('[process-recharge] card payment error', payRes.body?.errors);
      const firstErr = payRes.body?.errors?.[0];
      return new Response(
        JSON.stringify({
          error: firstErr?.detail ?? 'Paiement refusé',
          code: firstErr?.code,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const paymentId = payRes.body?.payment?.id;

    // ── 5. Créditer la gift card Square (montant + bonus) ──
    // On utilise ADJUST_INCREMENT car LOAD exige order_id+line_item_uid ou
    // buyer_payment_instrument_id (contexte commercial complet).
    // ADJUST_INCREMENT = ajustement côté Square, sans contexte order/payment dédié.
    // Le lien avec le paiement carte est conservé côté audit (wallet_transactions).
    const loadRes = await squareFetch('/v2/gift-cards/activities', {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        gift_card_activity: {
          type: 'ADJUST_INCREMENT',
          location_id: LOCATION_ID,
          gift_card_id: giftCardId,
          adjust_increment_activity_details: {
            amount_money: { amount: totalCredit, currency: 'EUR' },
            // Enum Square restreint : seuls COMPLIMENTARY et SUPPORT_ISSUE acceptés.
            // COMPLIMENTARY couvre "crédit ajouté au wallet client" (incl. recharge + bonus).
            reason: 'COMPLIMENTARY',
          },
        },
      }),
    });

    if (!loadRes.ok) {
      // Paiement carte OK mais crédit gift card KO → incident critique + refund auto
      console.error('[process-recharge] CRITIQUE : paiement OK mais ADJUST_INCREMENT Square KO', {
        userId: authUser.id,
        paymentId,
        amount,
        loadError: loadRes.body?.errors,
      });

      // Tentative de refund automatique pour protéger le client
      try {
        await squareFetch('/v2/refunds', {
          method: 'POST',
          body: JSON.stringify({
            idempotency_key: crypto.randomUUID(),
            amount_money: { amount, currency: 'EUR' },
            payment_id: paymentId,
            reason: 'Échec chargement carte cadeau — remboursement automatique',
          }),
        });
      } catch (refundErr) {
        console.error('[process-recharge] refund auto FAILED, intervention manuelle requise:', refundErr);
      }

      return new Response(
        JSON.stringify({
          error: 'Erreur Square. Votre paiement a été remboursé, merci de réessayer.',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 6. Relire balance depuis Square (source de vérité) ──
    const balanceRes = await squareFetch(`/v2/gift-cards/${giftCardId}`, { method: 'GET' });
    const newBalance = balanceRes.ok
      ? (balanceRes.body?.gift_card?.balance_money?.amount ?? 0)
      : null;

    // ── 7. Audit log (append-only, pas une source de vérité) ──
    await supabase.from('wallet_transactions').insert({
      user_id: authUser.id,
      type: 'credit',
      amount: totalCredit,
      description: bonus > 0
        ? `Recharge ${(amount / 100).toFixed(2)} € + ${(bonus / 100).toFixed(2)} € offerts`
        : `Recharge ${(amount / 100).toFixed(2)} €`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        paymentId,
        giftCardId,
        bonus,
        totalCredit,
        newBalance, // ← issu de Square (peut être null si relecture KO, rare)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[process-recharge] error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
