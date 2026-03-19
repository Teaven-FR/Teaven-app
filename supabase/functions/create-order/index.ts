// Edge Function — Créer une commande Square
// Déployée séparément via : supabase functions deploy create-order

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
    const { items, userId, pickupTime } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'items est requis et doit être un tableau non vide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
    const squareBaseUrl = squareEnvironment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');

    // Construire les line items Square
    const lineItems = items.map((item: { catalogObjectId: string; quantity: number; name: string; price: number }) => ({
      catalog_object_id: item.catalogObjectId,
      quantity: String(item.quantity),
      item_type: 'ITEM',
      ...(item.price ? {
        base_price_money: {
          amount: item.price,
          currency: 'EUR',
        },
      } : {}),
    }));

    // Créer la commande via Square Orders API
    const orderResponse = await fetch(`${squareBaseUrl}/v2/orders`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order: {
          location_id: locationId,
          line_items: lineItems,
          fulfillments: [{
            type: 'PICKUP',
            state: 'PROPOSED',
            pickup_details: {
              schedule_type: 'SCHEDULED',
              pickup_at: pickupTime ?? new Date(Date.now() + 20 * 60 * 1000).toISOString(),
              recipient: {
                display_name: 'Client Teaven',
              },
            },
          }],
        },
        idempotency_key: crypto.randomUUID(),
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error('Square order error:', orderData);
      return new Response(
        JSON.stringify({ error: 'Échec de la création de commande', details: orderData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const squareOrder = orderData.order;

    // Sauvegarder dans Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: dbOrder, error: dbError } = await supabase
      .from('orders')
      .insert({
        user_id: userId ?? null,
        square_order_id: squareOrder.id,
        status: 'pending',
        total_amount: squareOrder.total_money?.amount ?? 0,
        items: items,
        pickup_time: pickupTime ?? null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Supabase insert error:', dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: squareOrder.id,
        totalAmount: squareOrder.total_money?.amount,
        estimatedPickup: pickupTime ?? new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        dbOrder,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('create-order error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
