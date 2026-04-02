// Edge Function — Annuler une livraison Uber Direct
// POST avec : delivery_id

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { delivery_id } = await req.json();
    if (!delivery_id) {
      return new Response(JSON.stringify({ error: 'delivery_id requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Mettre à jour le statut en DB
    await supabase.from('deliveries')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('uber_delivery_id', delivery_id);

    const customerId = Deno.env.get('UBER_DIRECT_CUSTOMER_ID');
    if (!customerId) {
      return new Response(JSON.stringify({ success: true, stub: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TODO: appel API Uber Direct cancel
    // POST https://api.uber.com/v1/customers/{customerId}/deliveries/{delivery_id}/cancel

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
