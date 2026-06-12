// Edge Function — Webhook Uber Direct → met à jour le statut de livraison
// Valide la signature HMAC-SHA256 (UBER_DIRECT_SIGNING_KEY)
// IMPORTANT : déployée avec verify_jwt=false — Uber n'envoie pas de JWT Supabase,
// l'authentification se fait par la signature HMAC.

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

    // event.delivery_status (Direct) ou eats.delivery_status (legacy)
    const isStatusEvent = kind === 'event.delivery_status' || kind === 'eats.delivery_status';
    const isCourierEvent = kind === 'event.courier_update';
    const deliveryId = data?.delivery_id ?? data?.id;

    if ((isStatusEvent || isCourierEvent) && deliveryId) {
      const uberStatus = data.status;
      const teavenStatus = STATUS_MAP[uberStatus] ?? uberStatus;

      // Colonnes réelles du schéma deliveries :
      //   provider_delivery_id, status, courier_name, courier_phone,
      //   courier_vehicle, courier_lat, courier_lng,
      //   estimated_pickup, estimated_dropoff, actual_pickup_at,
      //   actual_dropoff_at, tracking_url, proof_of_delivery
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (isStatusEvent && uberStatus) updateData.status = teavenStatus;

      if (data.courier) {
        updateData.courier_name = data.courier.name ?? null;
        updateData.courier_phone = data.courier.phone_number ?? null;
        updateData.courier_vehicle = data.courier.vehicle?.make ?? data.courier.vehicle_type ?? null;
        // Position temps réel du livreur (event.courier_update + delivery_status)
        const loc = data.courier.location ?? data.location;
        if (loc?.lat != null && loc?.lng != null) {
          updateData.courier_lat = loc.lat;
          updateData.courier_lng = loc.lng;
        }
      } else if (data.location?.lat != null && data.location?.lng != null) {
        updateData.courier_lat = data.location.lat;
        updateData.courier_lng = data.location.lng;
      }

      if (data.dropoff_eta ?? data.dropoff?.eta) updateData.estimated_dropoff = data.dropoff_eta ?? data.dropoff.eta;
      if (data.pickup_eta ?? data.pickup?.eta) updateData.estimated_pickup = data.pickup_eta ?? data.pickup.eta;
      if (data.tracking_url) updateData.tracking_url = data.tracking_url;
      if (uberStatus === 'pickup_complete') updateData.actual_pickup_at = new Date().toISOString();
      if (uberStatus === 'delivered') updateData.actual_dropoff_at = new Date().toISOString();

      const { error: updErr } = await supabase.from('deliveries')
        .update(updateData)
        .eq('provider_delivery_id', deliveryId);
      if (updErr) {
        console.error('[uber-direct-webhook] DB update error:', updErr);
      }

      // Notification in-app uniquement sur changement de statut
      if (isStatusEvent) {
        const NOTIF_MESSAGES: Record<string, { title: string; body: string }> = {
          'courier_assigned': { title: 'Coursier en chemin', body: 'Un livreur se dirige vers Teaven pour récupérer votre commande.' },
          'picked_up': { title: 'Commande récupérée', body: 'Le livreur a récupéré votre commande et arrive bientôt !' },
          'en_route': { title: 'Livreur en route', body: 'Votre commande est en chemin. Préparez-vous !' },
          'delivered': { title: 'Commande livrée !', body: 'Votre commande a été livrée. Bon appétit !' },
          'cancelled': { title: 'Livraison annulée', body: 'Votre livraison a été annulée. Contactez-nous si besoin.' },
        };

        const notif = NOTIF_MESSAGES[teavenStatus];
        if (notif) {
          const { data: delivery } = await supabase
            .from('deliveries')
            .select('order_id')
            .eq('provider_delivery_id', deliveryId)
            .single();

          if (delivery?.order_id) {
            const { data: order } = await supabase
              .from('orders')
              .select('user_id')
              .eq('id', delivery.order_id)
              .single();

            if (order?.user_id) {
              await supabase.from('notifications').insert({
                user_id: order.user_id,
                type: 'order',
                title: notif.title,
                body: notif.body,
                data: { delivery_id: deliveryId, status: teavenStatus },
              });
            }
          }
        }
      }

      console.log(`Livraison ${deliveryId} mise à jour : ${teavenStatus ?? 'courier_update'}`);
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('uber-direct-webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
