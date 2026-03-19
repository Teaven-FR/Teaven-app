// Edge Function — Webhook Square (notifications commandes & paiements)
// Déployée séparément via : supabase functions deploy square-webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createHmac } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping des statuts Square → Teaven
const ORDER_STATUS_MAP: Record<string, string> = {
  'OPEN': 'pending',
  'COMPLETED': 'completed',
  'CANCELED': 'cancelled',
};

const FULFILLMENT_STATUS_MAP: Record<string, string> = {
  'PROPOSED': 'confirmed',
  'RESERVED': 'confirmed',
  'PREPARED': 'preparing',
  'COMPLETED': 'ready',
  'CANCELED': 'cancelled',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('x-square-hmacsha256-signature');
    const webhookSignatureKey = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY');

    // Vérifier la signature si configurée
    if (webhookSignatureKey && signature) {
      const notificationUrl = Deno.env.get('SQUARE_WEBHOOK_URL') ?? '';
      const toSign = notificationUrl + body;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSignatureKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(toSign));
      const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(sig)));

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Signature invalide' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const event = JSON.parse(body);
    const eventType = event.type;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Traiter les différents types d'événements
    switch (eventType) {
      case 'order.updated': {
        const order = event.data?.object?.order;
        if (!order?.id) break;

        const fulfillment = order.fulfillments?.[0];
        const status = fulfillment
          ? FULFILLMENT_STATUS_MAP[fulfillment.state] ?? ORDER_STATUS_MAP[order.state] ?? 'pending'
          : ORDER_STATUS_MAP[order.state] ?? 'pending';

        await supabase
          .from('orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('square_order_id', order.id);

        console.log(`Order ${order.id} updated → ${status}`);
        break;
      }

      case 'payment.completed': {
        const payment = event.data?.object?.payment;
        if (!payment?.order_id) break;

        await supabase
          .from('orders')
          .update({
            status: 'confirmed',
            payment_id: payment.id,
            paid_at: new Date().toISOString(),
          })
          .eq('square_order_id', payment.order_id);

        console.log(`Payment ${payment.id} completed for order ${payment.order_id}`);
        break;
      }

      case 'catalog.version.updated': {
        // Déclencher une re-sync du catalogue
        console.log('Catalog updated, triggering sync...');
        await supabase.functions.invoke('sync-catalog', { body: {} });
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ received: true, type: eventType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('square-webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
