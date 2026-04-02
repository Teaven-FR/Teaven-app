// Edge Function — Récupérer le statut d'une livraison Uber Direct
// GET avec ?delivery_id=xxx

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const deliveryId = url.searchParams.get('delivery_id');
    if (!deliveryId) {
      return new Response(JSON.stringify({ error: 'delivery_id requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customerId = Deno.env.get('UBER_DIRECT_CUSTOMER_ID');
    if (!customerId) {
      return new Response(JSON.stringify({ stub: true, status: 'pending', eta: null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TODO: implémenter getUberToken() depuis uber-direct-create-delivery
    // const token = await getUberToken();
    // const res = await fetch(`https://api.uber.com/v1/customers/${customerId}/deliveries/${deliveryId}`, {
    //   headers: { 'Authorization': `Bearer ${token}` },
    // });
    // const data = await res.json();

    return new Response(JSON.stringify({ message: 'Uber Direct non configuré' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
