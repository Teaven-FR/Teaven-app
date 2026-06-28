// Edge Function — Annuler une livraison Uber Direct
// POST avec : delivery_id

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (!res.ok || !data.access_token) {
    throw new Error(`Uber OAuth failed (${res.status}): ${data.error_description ?? data.error ?? 'no token'}`);
  }
  return data.access_token;
}

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

    const customerId = Deno.env.get('UBER_DIRECT_CUSTOMER_ID');
    if (!customerId || delivery_id.startsWith('STUB_')) {
      await supabase.from('deliveries')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('provider_delivery_id', delivery_id);
      return new Response(JSON.stringify({ success: true, stub: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Annulation RÉELLE côté Uber — avant ce fix, la fonction ne faisait
    // qu'un update DB local : la livraison continuait côté Uber (et était
    // facturée).
    const token = await getUberToken();
    const cancelRes = await fetch(
      `https://api.uber.com/v1/customers/${customerId}/deliveries/${delivery_id}/cancel`,
      { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } },
    );
    const cancelData = await cancelRes.json().catch(() => ({}));

    if (!cancelRes.ok) {
      console.error('[uber-direct-cancel] Uber cancel failed:', cancelRes.status, JSON.stringify(cancelData));
      return new Response(JSON.stringify({
        error: cancelData?.message ?? `Échec annulation Uber (${cancelRes.status})`,
        details: cancelData,
      }), { status: cancelRes.status >= 500 ? 502 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('deliveries')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('provider_delivery_id', delivery_id);

    return new Response(JSON.stringify({ success: true, status: cancelData.status ?? 'cancelled' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('uber-direct-cancel error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
