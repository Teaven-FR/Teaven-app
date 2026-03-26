// Edge Function — Créer une commande Square avec variations et modificateurs
// Déployée via : supabase functions deploy create-order

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderLineItem {
  catalogObjectId: string; // Square variation ID (pas l'item ID)
  quantity: number;
  name: string;
  modifiers?: { squareModifierId: string }[];
}

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
    // Authentification — optionnelle (guest allowed)
    const authUser = await authenticateUser(req);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'JSON invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { items, pickupTime } = body;

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
    const lineItems = (items as OrderLineItem[]).map((item) => {
      const lineItem: Record<string, unknown> = {
        catalog_object_id: item.catalogObjectId,
        quantity: String(item.quantity),
        item_type: 'ITEM',
      };

      if (item.modifiers && item.modifiers.length > 0) {
        lineItem.modifiers = item.modifiers.map((mod) => ({
          catalog_object_id: mod.squareModifierId,
        }));
      }

      return lineItem;
    });

    // Créer la commande via Square Orders API
    const scheduledPickup = (pickupTime as string) ?? new Date(Date.now() + 20 * 60 * 1000).toISOString();

    const orderResponse = await fetch(`${squareBaseUrl}/v2/orders`, {
      method: 'POST',
      headers: {
        'Square-Version': '2025-01-23',
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
              pickup_at: scheduledPickup,
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

    // Sauvegarder dans Supabase (service role pour bypass RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: dbOrder, error: dbError } = await supabase
      .from('orders')
      .insert({
        user_id: authUser?.id ?? null,
        square_order_id: squareOrder.id,
        status: 'payment_pending',
        total_amount: squareOrder.total_money?.amount ?? 0,
        items: items,
        pickup_time: scheduledPickup,
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
        estimatedPickup: scheduledPickup,
        dbOrder,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('create-order error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
