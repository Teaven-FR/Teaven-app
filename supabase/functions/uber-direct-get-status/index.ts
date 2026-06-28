// Edge Function — Récupérer le statut d'une livraison Uber Direct
// GET avec ?delivery_id=xxx ou ?order_id=xxx
// Lit d'abord dans Supabase (mis à jour par webhook), fallback sur API Uber

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
  if (!data.access_token) throw new Error('Failed to get Uber token');
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const deliveryId = url.searchParams.get('delivery_id');
    const orderId = url.searchParams.get('order_id');

    if (!deliveryId && !orderId) {
      return new Response(JSON.stringify({ error: 'delivery_id ou order_id requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Lire le statut depuis Supabase (source de vérité via webhook)
    //    Colonnes réelles : provider_delivery_id, estimated_pickup/dropoff,
    //    courier_name/phone/vehicle, courier_lat/lng, actual_*_at
    //    (l'ancienne version lisait uber_delivery_id / estimated_*_at qui
    //    n'existent pas → ETA et coursier jamais retournés)
    let query = supabase.from('deliveries').select('*');
    if (deliveryId) {
      query = query.eq('provider_delivery_id', deliveryId);
    } else {
      query = query.eq('order_id', orderId);
    }
    const { data: delivery } = await query.maybeSingle();

    if (delivery) {
      // Coordonnées destination (adresse client géocodée) depuis orders.
      // Permet à la carte de suivi d'afficher le bon pin client.
      let dropoffLat: number | null = null;
      let dropoffLng: number | null = null;
      const lookupOrderId = orderId ?? delivery.order_id;
      if (lookupOrderId) {
        const { data: orderRow } = await supabase
          .from('orders')
          .select('delivery_address')
          .eq('id', lookupOrderId)
          .maybeSingle();
        const da = orderRow?.delivery_address as { lat?: number | null; lng?: number | null } | null;
        if (da?.lat != null && da?.lng != null) {
          dropoffLat = da.lat;
          dropoffLng = da.lng;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        status: delivery.status,
        courier: delivery.courier_name ? {
          name: delivery.courier_name,
          phone: delivery.courier_phone,
          vehicle: delivery.courier_vehicle,
          lat: delivery.courier_lat,
          lng: delivery.courier_lng,
        } : null,
        tracking_url: delivery.tracking_url,
        estimated_pickup_at: delivery.estimated_pickup,
        estimated_dropoff_at: delivery.estimated_dropoff,
        actual_pickup_at: delivery.actual_pickup_at,
        actual_dropoff_at: delivery.actual_dropoff_at,
        uber_delivery_id: delivery.provider_delivery_id,
        dropoff_lat: dropoffLat,
        dropoff_lng: dropoffLng,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Si pas en base et delivery_id fourni → requête directe Uber API
    const customerId = Deno.env.get('UBER_DIRECT_CUSTOMER_ID');
    if (!customerId || !deliveryId) {
      if (deliveryId?.startsWith('STUB_')) {
        return new Response(JSON.stringify({
          success: true,
          stub: true,
          status: 'pending',
          courier: null,
          tracking_url: null,
          estimated_dropoff_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: false, error: 'Livraison introuvable' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await getUberToken();
    const uberRes = await fetch(`https://api.uber.com/v1/customers/${customerId}/deliveries/${deliveryId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!uberRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `Uber API ${uberRes.status}` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uberData = await uberRes.json();
    return new Response(JSON.stringify({
      success: true,
      status: uberData.status ?? 'unknown',
      courier: uberData.courier ? {
        name: uberData.courier.name,
        phone: uberData.courier.phone_number,
        vehicle: uberData.courier.vehicle?.make ?? uberData.courier.vehicle_type,
        lat: uberData.courier.location?.lat,
        lng: uberData.courier.location?.lng,
      } : null,
      tracking_url: uberData.tracking_url,
      estimated_pickup_at: uberData.pickup_eta ?? uberData.pickup?.eta,
      estimated_dropoff_at: uberData.dropoff_eta ?? uberData.dropoff?.eta,
      uber_delivery_id: uberData.id,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('uber-direct-get-status error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
