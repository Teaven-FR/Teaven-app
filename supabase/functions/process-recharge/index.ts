// Edge Function — Recharge wallet Teaven
// 1. Paiement carte via Square Payments API
// 2. Trouver ou créer la gift card du client
// 3. Créditer la gift card (montant + bonus)
// 4. Mettre à jour le solde dans Supabase

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SQUARE_VERSION = '2025-01-23';

// Bonus de recharge (en centimes)
function calculateBonus(amount: number): number {
  if (amount >= 10000) return Math.round(amount * 0.12); // 100€+ → 12%
  if (amount >= 5000) return Math.round(amount * 0.08);  // 50€+ → 8%
  if (amount >= 2000) return Math.round(amount * 0.05);  // 20€+ → 5%
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
        JSON.stringify({ error: 'sourceId et amount (100-50000 centimes) requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN')!;
    const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
    const squareBaseUrl = squareEnvironment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    const locationId = Deno.env.get('SQUARE_LOCATION_ID')!;

    const authUser = await authenticateUser(req);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── 1. Paiement carte Square ──
    const payRes = await fetch(`${squareBaseUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': SQUARE_VERSION,
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

    // ── 2. Calculer le bonus ──
    const bonus = calculateBonus(amount);
    const totalCredit = amount + bonus;

    // ── 3. Trouver ou créer la gift card du client ──
    let giftCardId: string | null = null;

    if (authUser) {
      // Chercher le gift_card_id existant
      const { data: profile } = await supabase
        .from('profiles')
        .select('square_gift_card_id, square_customer_id')
        .eq('id', authUser.id)
        .single();

      giftCardId = profile?.square_gift_card_id ?? null;

      // Si pas de gift card, chercher par customer_id dans Square
      if (!giftCardId && profile?.square_customer_id) {
        const searchRes = await fetch(
          `${squareBaseUrl}/v2/gift-cards?customer_id=${profile.square_customer_id}`,
          { headers: { 'Square-Version': SQUARE_VERSION, 'Authorization': `Bearer ${squareAccessToken}` } },
        );
        const searchData = await searchRes.json();
        if (searchData.gift_cards?.length > 0) {
          giftCardId = searchData.gift_cards[0].id;
        }
      }

      // Si toujours pas de gift card, en créer une
      if (!giftCardId) {
        const createRes = await fetch(`${squareBaseUrl}/v2/gift-cards`, {
          method: 'POST',
          headers: {
            'Square-Version': SQUARE_VERSION,
            'Authorization': `Bearer ${squareAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idempotency_key: crypto.randomUUID(),
            location_id: locationId,
            type: 'DIGITAL',
          }),
        });
        const createData = await createRes.json();
        if (createRes.ok && createData.gift_card) {
          giftCardId = createData.gift_card.id;

          // Activer la gift card
          await fetch(`${squareBaseUrl}/v2/gift-cards/${giftCardId}/activities`, {
            method: 'POST',
            headers: {
              'Square-Version': SQUARE_VERSION,
              'Authorization': `Bearer ${squareAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              idempotency_key: crypto.randomUUID(),
              gift_card_activity: {
                gift_card_id: giftCardId,
                type: 'ACTIVATE',
                location_id: locationId,
                activate_activity_details: {
                  amount_money: { amount: 0, currency: 'EUR' },
                },
              },
            }),
          });

          // Lier au customer si possible
          if (profile?.square_customer_id) {
            await fetch(`${squareBaseUrl}/v2/gift-cards/${giftCardId}/link-customer`, {
              method: 'POST',
              headers: {
                'Square-Version': SQUARE_VERSION,
                'Authorization': `Bearer ${squareAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ customer_id: profile.square_customer_id }),
            });
          }
        } else {
          console.error('Gift card creation failed:', createData);
        }
      }

      // ── 4. Créditer la gift card (montant + bonus) ──
      if (giftCardId) {
        const loadRes = await fetch(`${squareBaseUrl}/v2/gift-cards/${giftCardId}/activities`, {
          method: 'POST',
          headers: {
            'Square-Version': SQUARE_VERSION,
            'Authorization': `Bearer ${squareAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idempotency_key: crypto.randomUUID(),
            gift_card_activity: {
              gift_card_id: giftCardId,
              type: 'LOAD',
              location_id: locationId,
              load_activity_details: {
                amount_money: { amount: totalCredit, currency: 'EUR' },
              },
            },
          }),
        });
        const loadData = await loadRes.json();
        if (!loadRes.ok) {
          console.error('Gift card LOAD failed:', loadData);
        }
      }

      // ── 5. Mettre à jour Supabase ──
      // Lire le vrai solde depuis Square
      let newBalance = totalCredit;
      if (giftCardId) {
        const balRes = await fetch(`${squareBaseUrl}/v2/gift-cards/${giftCardId}`, {
          headers: { 'Square-Version': SQUARE_VERSION, 'Authorization': `Bearer ${squareAccessToken}` },
        });
        const balData = await balRes.json();
        if (balData.gift_card?.balance_money?.amount != null) {
          newBalance = balData.gift_card.balance_money.amount;
        }
      }

      await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          wallet_balance: newBalance,
          square_gift_card_id: giftCardId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: payData.payment?.id,
          giftCardId,
          bonus,
          totalCredit,
          newBalance,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Pas authentifié — juste le paiement
    return new Response(
      JSON.stringify({ success: true, paymentId: payData.payment?.id, bonus: 0 }),
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
