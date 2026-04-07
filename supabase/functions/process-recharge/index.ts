// Edge Function — Recharge wallet Teaven
// 1. Paiement carte via Square
// 2. Calculer le bonus
// 3. Créditer Supabase wallet_balance (source de vérité)
// 4. Si gift card active existe → créditer aussi côté Square

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bonus de recharge
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { sourceId, amount } = body as { sourceId?: string; amount?: number };

    if (!sourceId || !amount || amount <= 0 || amount > 50000) {
      return new Response(
        JSON.stringify({ error: 'sourceId et amount requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN')!;
    const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
    const squareBaseUrl = squareEnvironment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    const locationId = Deno.env.get('SQUARE_LOCATION_ID')!;

    // ── 1. Paiement carte ──
    const payRes = await fetch(`${squareBaseUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': '2025-01-23',
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: crypto.randomUUID(),
        amount_money: { amount, currency: 'EUR' },
        location_id: locationId,
        autocomplete: true,
        note: 'Recharge portefeuille Teaven',
      }),
    });
    const payData = await payRes.json();
    if (!payRes.ok) {
      return new Response(
        JSON.stringify({ error: payData.errors?.[0]?.detail ?? 'Paiement refusé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── 2. Calculer le bonus ──
    const authUser = await authenticateUser(req);
    let currentBalance = 0;
    let isFirst = true;

    if (authUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance, square_gift_card_id')
        .eq('id', authUser.id)
        .single();
      currentBalance = profile?.wallet_balance ?? 0;
      if (currentBalance > 0 || profile?.square_gift_card_id) isFirst = false;
    }

    const bonus = calculateBonus(amount, isFirst);
    const totalCredit = amount + bonus;
    const newBalance = currentBalance + totalCredit;

    // ── 3. Créditer Supabase (source de vérité) ──
    if (authUser) {
      await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          wallet_balance: newBalance,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
    }

    // ── 4. Sync gift card Square si active ──
    // En production Square, on ne peut pas créer de gift card sans transaction liée.
    // Si le client a déjà une gift card active, on la crédite via ADJUST_INCREMENT.
    // Sinon, le solde reste dans Supabase uniquement.
    if (authUser) {
      const { data: profileGc } = await supabase
        .from('profiles')
        .select('square_gift_card_id')
        .eq('id', authUser.id)
        .single();

      if (profileGc?.square_gift_card_id) {
        try {
          await fetch(`${squareBaseUrl}/v2/gift-cards/activities`, {
            method: 'POST',
            headers: {
              'Square-Version': '2025-01-23',
              'Authorization': `Bearer ${squareAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              idempotency_key: crypto.randomUUID(),
              gift_card_activity: {
                gift_card_id: profileGc.square_gift_card_id,
                type: 'ADJUST_INCREMENT',
                location_id: locationId,
                adjust_increment_activity_details: {
                  amount_money: { amount: totalCredit, currency: 'EUR' },
                  reason: 'COMPLIMENTARY',
                },
              },
            }),
          });
        } catch {
          // Non bloquant — Supabase est la source de vérité
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payData.payment?.id,
        bonus,
        totalCredit,
        newBalance,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('process-recharge error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
