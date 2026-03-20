// Edge Function — Traiter un paiement Square
// Déployée séparément via : supabase functions deploy process-payment

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Vérifie le JWT Supabase et retourne l'utilisateur authentifié */
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Méthode non autorisée' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // Authentification requise
    const authUser = await authenticateUser(req);
    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'Authentification requise' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'JSON invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { orderId, sourceId, amount, giftCardAmount, idempotencyKey } = body as {
      orderId?: string;
      sourceId?: string;
      amount?: number;
      giftCardAmount?: number;
      idempotencyKey?: string;
    };

    if (!orderId || !sourceId || !amount) {
      return new Response(
        JSON.stringify({ error: 'orderId, sourceId et amount sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validation du montant
    if (!Number.isInteger(amount) || amount <= 0 || amount > 50000) {
      return new Response(
        JSON.stringify({ error: 'amount doit être un entier positif en centimes (max 500€)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const giftCard = giftCardAmount ?? 0;
    const netAmount = amount - giftCard;
    if (netAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Le montant net après déduction doit être positif' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Vérifier que la commande appartient à l'utilisateur
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: orderRow } = await supabase
      .from('orders')
      .select('user_id')
      .eq('square_order_id', orderId)
      .single();

    if (orderRow && orderRow.user_id !== authUser.id) {
      return new Response(
        JSON.stringify({ error: 'Accès non autorisé à cette commande' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
        'Square-Version': '2025-01-23',
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: idempotencyKey ?? crypto.randomUUID(),
        amount_money: {
          amount: netAmount,
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
    await supabase
      .from('orders')
      .update({
        status: 'payment_confirmed',
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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('process-payment error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
