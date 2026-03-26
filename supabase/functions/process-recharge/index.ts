// Edge Function — Paiement carte pour recharge wallet
// Reçoit un nonce Square + montant → crée un paiement Square → crédite le wallet

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
    const squareBaseUrl = squareEnvironment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');

    // 1. Créer le paiement Square (pas de commande — juste un paiement)
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
        note: 'Recharge wallet Teaven',
      }),
    });

    const payData = await payRes.json();

    if (!payRes.ok) {
      const errDetail = payData.errors?.[0]?.detail ?? 'Paiement refusé';
      return new Response(
        JSON.stringify({ error: errDetail }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Créditer le wallet dans Supabase
    const authUser = await authenticateUser(req);
    if (authUser) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', authUser.id)
        .single();

      const newBalance = (profile?.wallet_balance ?? 0) + amount;
      await supabase
        .from('profiles')
        .upsert({ id: authUser.id, wallet_balance: newBalance, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    }

    return new Response(
      JSON.stringify({ success: true, paymentId: payData.payment?.id }),
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
