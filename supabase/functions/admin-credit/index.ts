import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const squareEnv = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
  const squareBaseUrl = squareEnv === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
  const squareToken = Deno.env.get('SQUARE_ACCESS_TOKEN') ?? '';
  const locationId = Deno.env.get('SQUARE_LOCATION_ID') ?? '';

  const body = await req.json();
  const action = body.action;

  if (action === 'list-users') {
    const { data } = await supabase.auth.admin.listUsers();
    return new Response(
      JSON.stringify({ users: (data?.users ?? []).map(u => ({ id: u.id, phone: u.phone, email: u.email })) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (action === 'credit') {
    const { userId, amount } = body;
    const { data: existing } = await supabase.from('profiles').select('wallet_balance').eq('id', userId).single();
    const newBalance = (existing?.wallet_balance ?? 0) + amount;
    await supabase.from('profiles').upsert(
      { id: userId, wallet_balance: newBalance, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    );
    return new Response(
      JSON.stringify({ success: true, newBalance }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (action === 'check-profile') {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', body.userId).single();
    return new Response(
      JSON.stringify({ profile: data, error: error?.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ─── Migration Supabase wallet_balance → Square gift card ────────────
  // Idempotent : crédite seulement le delta (supabaseBalance - squareBalance).
  // Modes : dryRun=true pour simulation, dryRun=false pour exécution.
  if (action === 'migrate-to-square') {
    const { userId, dryRun = true } = body;

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('email, wallet_balance, square_customer_id, square_gift_card_id')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable', userId, details: profileErr?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!profile.square_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Pas de square_customer_id, migration impossible', userId, profile }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseBalance = profile.wallet_balance ?? 0;

    // Étape 1 : ensure-gift-card → retourne giftCardId + balance Square actuel
    const ensureRes = await fetch(`${supabaseUrl}/functions/v1/ensure-gift-card`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ squareCustomerId: profile.square_customer_id, userId }),
    });
    if (!ensureRes.ok) {
      return new Response(
        JSON.stringify({ error: 'ensure-gift-card failed', details: await ensureRes.text() }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const ensureData = await ensureRes.json();
    const giftCardId: string = ensureData.giftCardId;
    const squareBalance: number = ensureData.balance ?? 0;

    // Étape 2 : calcul du delta à créditer
    const delta = Math.max(0, supabaseBalance - squareBalance);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dryRun: true,
          userId,
          email: profile.email,
          supabaseBalance,
          squareBalance,
          delta,
          giftCardId,
          willCredit: delta > 0,
          willResetWalletBalance: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Étape 3 : créditer Square via ADJUST_INCREMENT si delta > 0
    let credited = 0;
    if (delta > 0) {
      const adjustRes = await fetch(`${squareBaseUrl}/v2/gift-cards/activities`, {
        method: 'POST',
        headers: {
          'Square-Version': '2025-01-23',
          'Authorization': `Bearer ${squareToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          gift_card_activity: {
            gift_card_id: giftCardId,
            type: 'ADJUST_INCREMENT',
            location_id: locationId,
            adjust_increment_activity_details: {
              amount_money: { amount: delta, currency: 'EUR' },
              reason: 'COMPLIMENTARY',
            },
          },
        }),
      });

      if (!adjustRes.ok) {
        const errText = await adjustRes.text();
        return new Response(
          JSON.stringify({
            error: 'Square ADJUST_INCREMENT failed',
            userId,
            giftCardId,
            details: errText,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      credited = delta;

      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        type: 'credit',
        amount: delta,
        description: 'Migration solde historique Supabase → Square',
      });
    }

    // Étape 4 : reset wallet_balance Supabase (cache déprécié)
    await supabase
      .from('profiles')
      .update({ wallet_balance: 0, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email: profile.email,
        giftCardId,
        supabaseBalanceBefore: supabaseBalance,
        squareBalanceBefore: squareBalance,
        credited,
        squareBalanceAfter: squareBalance + credited,
        walletBalanceReset: true,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ─── Reset wallet_balance pour les profils sans square_customer_id ───
  // (orphelins qui ne peuvent pas être migrés vers Square)
  if (action === 'reset-orphan-balance') {
    const { userId } = body;
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance, square_customer_id')
      .eq('id', userId)
      .single();
    if (profile?.square_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Profil non orphelin (square_customer_id présent), utilise migrate-to-square' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    await supabase
      .from('profiles')
      .update({ wallet_balance: 0, updated_at: new Date().toISOString() })
      .eq('id', userId);
    return new Response(
      JSON.stringify({ success: true, userId, walletBalanceReset: true, previousBalance: profile?.wallet_balance ?? 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ error: 'unknown action' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
