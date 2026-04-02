// Edge Function — Créer une livraison Uber Direct
// POST avec : order_id, pickup_address, dropoff_address, items_description
// Variables requises : UBER_DIRECT_CLIENT_ID, UBER_DIRECT_CLIENT_SECRET, UBER_DIRECT_CUSTOMER_ID

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UBER_API_BASE = 'https://api.uber.com/v1';

async function getUberToken(): Promise<string> {
  const clientId = Deno.env.get('UBER_DIRECT_CLIENT_ID');
  const clientSecret = Deno.env.get('UBER_DIRECT_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Uber Direct credentials not configured');

  const res = await fetch('https://login.uber.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'eats.deliveries',
    }),
  });
  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { order_id, pickup_address, dropoff_address, items_description } = await req.json();
    if (!order_id || !dropoff_address) {
      return new Response(JSON.stringify({ error: 'order_id et dropoff_address requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customerId = Deno.env.get('UBER_DIRECT_CUSTOMER_ID');
    if (!customerId) {
      // Mode stub — retourner une réponse simulée
      return new Response(JSON.stringify({
        success: true,
        stub: true,
        delivery_id: `STUB_${Date.now()}`,
        tracking_url: 'https://uber.com/deliveries/stub',
        estimated_delivery_time: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = await getUberToken();

    // Adresse boutique Teaven (pickup par défaut)
    const defaultPickup = pickup_address ?? {
      street_address: ['12 Place de la Gare', ''],
      city: 'Franconville',
      state: 'Île-de-France',
      zip_code: '95130',
      country: 'FR',
    };

    const res = await fetch(`${UBER_API_BASE}/customers/${customerId}/deliveries`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickup: {
          name: 'Teaven Franconville',
          address: defaultPickup,
          phone_number: '+33000000000',
        },
        dropoff: {
          name: dropoff_address.name ?? 'Client',
          address: dropoff_address,
          phone_number: dropoff_address.phone ?? '',
        },
        manifest: { description: items_description ?? 'Commande Teaven' },
        external_id: order_id,
      }),
    });

    const delivery = await res.json();

    // Sauvegarder dans Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await supabase.from('deliveries').insert({
      order_id,
      uber_delivery_id: delivery.id,
      status: delivery.status ?? 'pending',
      tracking_url: delivery.tracking_url,
      estimated_dropoff_at: delivery.dropoff.eta,
      dropoff_address: dropoff_address,
      pickup_address: defaultPickup,
      fee_cents: delivery.fee ? Math.round(delivery.fee * 100) : null,
    });

    return new Response(JSON.stringify({
      success: true,
      delivery_id: delivery.id,
      tracking_url: delivery.tracking_url,
      estimated_delivery_time: delivery.dropoff.eta,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('uber-direct-create-delivery error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
