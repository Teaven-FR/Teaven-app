// Edge Function — Traiter un paiement Square
// Déployée séparément via : supabase functions deploy process-payment

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId, sourceId, amount, giftCardAmount, idempotencyKey } = await req.json();

    if (!orderId || !sourceId || !amount) {
      return new Response(
        JSON.stringify({ error: 'orderId, sourceId et amount sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
    const squareBaseUrl = squareEnvironment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    // Créer le paiement via Square Payments API
    const paymentResponse = await fetch(`${squareBaseUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: idempotencyKey ?? crypto.randomUUID(),
        amount_money: {
          amount: amount - (giftCardAmount ?? 0),
          currency: 'EUR',
        },
        order_id: orderId,
        autocomplete: true,
        location_id: Deno.env.get('SQUARE_LOCATION_ID'),
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error('Square payment error:', paymentData);
      return new Response(
        JSON.stringify({ error: 'Échec du paiement', details: paymentData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Mettre à jour la commande dans Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        payment_id: paymentData.payment?.id,
        paid_at: new Date().toISOString(),
      })
      .eq('square_order_id', orderId);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentData.payment?.id,
        orderId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('process-payment error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
