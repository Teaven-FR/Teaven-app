// Edge Function — Webhook Uber Direct → met à jour le statut de livraison
// Valide la signature HMAC-SHA256

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-uber-signature',
};

// Mapping statuts Uber Direct → statuts Teaven
const STATUS_MAP: Record<string, string> = {
  'pending': 'pending',
  'pickup': 'courier_assigned',
  'pickup_complete': 'picked_up',
  'dropoff': 'en_route',
  'delivered': 'delivered',
  'cancelled': 'cancelled',
  'returned': 'returned',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const body = await req.text();

  // Valider signature Uber Direct
  const signingKey = Deno.env.get('UBER_DIRECT_SIGNING_KEY');
  if (signingKey) {
    const signature = req.headers.get('x-uber-signature');
    const hmac = createHmac('sha256', signingKey).update(body).digest('hex');
    if (signature !== hmac) {
      console.warn('Signature Uber Direct invalide');
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    const payload = JSON.parse(body);
    const { kind, data } = payload;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (kind === 'eats.delivery_status' && data?.delivery_id) {
      const uberStatus = data.status;
      const teavenStatus = STATUS_MAP[uberStatus] ?? uberStatus;

      const updateData: Record<string, unknown> = {
        status: teavenStatus,
        updated_at: new Date().toISOString(),
      };

      if (data.courier) {
        updateData.courier_name = data.courier.name;
        updateData.courier_phone = data.courier.phone_number;
        updateData.courier_vehicle = data.courier.vehicle?.make ?? data.courier.vehicle_type;
      }
      if (data.dropoff?.eta) updateData.estimated_dropoff_at = data.dropoff.eta;
      if (uberStatus === 'pickup_complete') updateData.actual_pickup_at = new Date().toISOString();
      if (uberStatus === 'delivered') updateData.actual_dropoff_at = new Date().toISOString();

      await supabase.from('deliveries')
        .update(updateData)
        .eq('uber_delivery_id', data.delivery_id);

      console.log(`Livraison ${data.delivery_id} mise à jour : ${teavenStatus}`);
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('uber-direct-webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
