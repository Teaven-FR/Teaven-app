// Edge Function — Créer une livraison Uber Direct
// POST avec : order_id, pickup_address, dropoff_address, items_description, items
// Optionnel : scheduled_pickup_time (ISO). Sinon lu depuis orders.pickup_time.
// Variables requises : UBER_DIRECT_CLIENT_ID, UBER_DIRECT_CLIENT_SECRET, UBER_DIRECT_CUSTOMER_ID
// Optionnelle : TEAVEN_SHOP_PHONE (téléphone E.164 de la boutique pour le pickup)

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
  if (!res.ok || !data.access_token) {
    console.error('[uber-direct-create-delivery] OAuth token failed:', res.status, JSON.stringify(data));
    throw new Error(`Uber OAuth failed (${res.status}): ${data.error_description ?? data.error ?? 'no token'}`);
  }
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { order_id, pickup_address, dropoff_address, items_description, items, scheduled_pickup_time } = await req.json();
    if (!order_id || !dropoff_address) {
      return new Response(JSON.stringify({ error: 'order_id et dropoff_address requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Déterminer si la commande est programmée (créneau futur) ──
    // Source : scheduled_pickup_time (body) sinon orders.pickup_time en base.
    // Lire en base permet à la planification de fonctionner sans modifier
    // l'app : create-order stocke déjà le créneau choisi dans orders.pickup_time.
    let scheduledTimeStr: string | null = scheduled_pickup_time ?? null;
    if (!scheduledTimeStr) {
      try {
        const { data: orderRow } = await supabase
          .from('orders')
          .select('pickup_time')
          .eq('id', order_id)
          .single();
        scheduledTimeStr = (orderRow?.pickup_time as string | undefined) ?? null;
      } catch { /* ignore — fallback ASAP */ }
    }

    // Uber accepte une livraison programmée via pickup_ready_dt / deadlines.
    // On ne programme que si le créneau est > maintenant + 30 min, sinon ASAP.
    // Contraintes Uber : pickup_deadline > pickup_ready ; dropoff_ready dans
    // [pickup_ready, pickup_deadline] ; dropoff_deadline >= dropoff_ready + 20min.
    let scheduling: Record<string, unknown> = {};
    let isScheduled = false;
    if (scheduledTimeStr) {
      const t = new Date(scheduledTimeStr).getTime();
      if (!Number.isNaN(t) && t > Date.now() + 30 * 60 * 1000) {
        isScheduled = true;
        scheduling = {
          pickup_ready_dt: new Date(t).toISOString(),
          pickup_deadline_dt: new Date(t + 15 * 60 * 1000).toISOString(),
          dropoff_ready_dt: new Date(t).toISOString(),
          dropoff_deadline_dt: new Date(t + 45 * 60 * 1000).toISOString(),
        };
        console.log(`[uber-direct-create-delivery] Scheduled delivery for ${new Date(t).toISOString()} (order ${order_id})`);
      }
    }

    const customerId = Deno.env.get('UBER_DIRECT_CUSTOMER_ID');
    if (!customerId) {
      // Mode stub — retourner une réponse simulée
      return new Response(JSON.stringify({
        success: true,
        stub: true,
        delivery_id: `STUB_${Date.now()}`,
        tracking_url: 'https://uber.com/deliveries/stub',
        estimated_delivery_time: scheduledTimeStr ?? new Date(Date.now() + 35 * 60 * 1000).toISOString(),
        scheduled: isScheduled,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = await getUberToken();

    // Adresse boutique Teaven (pickup par défaut) — adresse réelle de la
    // Square Location « Bar Teaven »
    const defaultPickup = pickup_address ?? {
      street_address: ['19 Place De La République', ''],
      city: 'Franconville',
      state: 'Île-de-France',
      zip_code: '95130',
      country: 'FR',
    };

    const dropoffPhone = (dropoff_address.phone ?? '').trim();
    const uberPayload: Record<string, unknown> = {
      pickup_name: 'Teaven Franconville',
      pickup_address: JSON.stringify({
        street_address: defaultPickup.street_address,
        city: defaultPickup.city,
        state: defaultPickup.state ?? '',
        zip_code: defaultPickup.zip_code,
        country: defaultPickup.country ?? 'FR',
      }),
      pickup_phone_number: Deno.env.get('TEAVEN_SHOP_PHONE') ?? '+33987536166',
      dropoff_name: dropoff_address.name ?? 'Client',
      dropoff_address: JSON.stringify({
        street_address: dropoff_address.street_address,
        city: dropoff_address.city,
        state: dropoff_address.state ?? '',
        zip_code: dropoff_address.zip_code,
        country: dropoff_address.country ?? 'FR',
      }),
      ...(dropoffPhone ? { dropoff_phone_number: dropoffPhone } : {}),
      manifest_items: Array.isArray(items) && items.length > 0
        ? items.map((i: { name?: string; quantity?: number }) => ({
            name: i.name ?? 'Article Teaven',
            quantity: i.quantity ?? 1,
            size: 'small',
          }))
        : [{ name: items_description ?? 'Commande Teaven', quantity: 1, size: 'small' }],
      external_id: order_id,
      ...scheduling,
    };

    const res = await fetch(`${UBER_API_BASE}/customers/${customerId}/deliveries`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(uberPayload),
    });

    const delivery = await res.json();

    // ── Échec API Uber : ne PAS masquer, renvoyer l'erreur au client et logger
    if (!res.ok || !delivery.id) {
      console.error('[uber-direct-create-delivery] Uber API error', {
        status: res.status,
        order_id,
        payload: uberPayload,
        response: delivery,
      });
      const firstError = Array.isArray(delivery?.errors) ? delivery.errors[0] : null;
      const friendlyMsg = firstError?.message
        ?? delivery?.message
        ?? `Échec création livraison Uber (${res.status})`;
      return new Response(JSON.stringify({
        error: friendlyMsg,
        code: delivery?.code ?? firstError?.code ?? `UBER_${res.status}`,
        details: delivery,
      }), { status: res.status >= 500 ? 502 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Sauvegarder dans Supabase
    const { error: dbErr } = await supabase.from('deliveries').insert({
      order_id,
      provider: 'uber_direct',
      provider_delivery_id: delivery.id,
      status: delivery.status ?? 'pending',
      tracking_url: delivery.tracking_url ?? null,
      estimated_dropoff: delivery.dropoff_eta ?? delivery.dropoff?.eta ?? null,
      estimated_pickup: delivery.pickup_eta ?? delivery.pickup?.eta ?? null,
    });
    if (dbErr) {
      console.error('[uber-direct-create-delivery] DB insert error (non-fatal):', dbErr);
    }

    return new Response(JSON.stringify({
      success: true,
      delivery_id: delivery.id,
      tracking_url: delivery.tracking_url,
      estimated_delivery_time: delivery.dropoff_eta ?? delivery.dropoff?.eta,
      scheduled: isScheduled,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('uber-direct-create-delivery error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
