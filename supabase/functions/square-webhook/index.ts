// Edge Function — Webhook Square (notifications commandes & paiements)
// Déployée séparément via : supabase functions deploy square-webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping des statuts Square → Teaven (aligné avec OrderStatus dans types.ts)
const ORDER_STATUS_MAP: Record<string, string> = {
  'OPEN': 'payment_pending',
  'COMPLETED': 'picked_up',
  'CANCELED': 'incident',
};

const FULFILLMENT_STATUS_MAP: Record<string, string> = {
  'PROPOSED': 'order_created',
  'RESERVED': 'accepted',
  'PREPARED': 'preparing',
  'COMPLETED': 'ready',
  'CANCELED': 'incident',
};

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
    const body = await req.text();
    const signature = req.headers.get('x-square-hmacsha256-signature');
    const webhookSignatureKey = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY');

    // Vérification de la signature OBLIGATOIRE
    if (!webhookSignatureKey || !signature) {
      console.error('Missing webhook signature key or signature header');
      return new Response(
        JSON.stringify({ error: 'Signature requise' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

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
          ? FULFILLMENT_STATUS_MAP[fulfillment.state] ?? ORDER_STATUS_MAP[order.state] ?? 'payment_pending'
          : ORDER_STATUS_MAP[order.state] ?? 'payment_pending';

        await supabase
          .from('orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('square_order_id', order.id);

        // Log l'audit trail
        await supabase.from('order_status_log').insert({
          order_id: order.id,
          new_status: status,
          changed_by: 'square-webhook',
        });

        console.log(`Order ${order.id} updated → ${status}`);
        break;
      }

      case 'payment.completed': {
        const payment = event.data?.object?.payment;
        if (!payment?.order_id) break;

        await supabase
          .from('orders')
          .update({
            status: 'payment_confirmed',
            payment_id: payment.id,
            paid_at: new Date().toISOString(),
          })
          .eq('square_order_id', payment.order_id);

        // Mettre à jour loyalty_progress (streak, compteur commandes)
        // NOTE : les points sont déjà crédités par process-payment, pas de double comptage ici
        const { data: orderRow } = await supabase
          .from('orders')
          .select('user_id')
          .eq('square_order_id', payment.order_id)
          .maybeSingle();

        if (orderRow?.user_id) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekStartStr = weekStart.toISOString().split('T')[0];

          // Upsert loyalty_progress
          const { data: lp } = await supabase
            .from('loyalty_progress')
            .upsert(
              { user_id: orderRow.user_id, total_parentheses: 0 },
              { onConflict: 'user_id', ignoreDuplicates: true },
            )
            .select('total_parentheses, streak_weeks, last_order_week')
            .maybeSingle();

          const newTotal = (lp?.total_parentheses ?? 0) + 1;
          const lastWeek = lp?.last_order_week;
          const isNewWeek = !lastWeek || lastWeek < weekStartStr;
          const newStreak = isNewWeek ? (lp?.streak_weeks ?? 0) + 1 : (lp?.streak_weeks ?? 0);

          await supabase
            .from('loyalty_progress')
            .update({
              total_parentheses: newTotal,
              streak_weeks: newStreak,
              last_order_week: isNewWeek ? weekStartStr : lastWeek,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', orderRow.user_id);

          console.log(`Progress updated for user ${orderRow.user_id}: parenthèse #${newTotal}, streak: ${newStreak}`);

          // Déclencher la vérification des défis
          try {
            await supabase.functions.invoke('challenge-check', {
              body: {
                user_id: orderRow.user_id,
                order_total: payment.amount_money?.amount ?? 0,
                order_time: new Date().toISOString(),
              },
            });
          } catch (challengeErr) {
            console.error('Challenge check error (non-fatal):', challengeErr);
          }

          // ── Notifications push post-paiement ──
          const userId = orderRow.user_id;

          // T+0s : Commande confirmée
          try {
            await supabase.functions.invoke('push-send', {
              body: {
                user_id: userId,
                type: 'order_confirmed',
                title: 'Commande confirmée !',
                body: 'Votre parenthèse est en préparation.',
                data: { orderId: payment.order_id },
              },
            });
          } catch (e) { console.error('Push order_confirmed error:', e); }

          // T+30s : Points gagnés
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('loyalty_points, loyalty_level')
                .eq('id', userId)
                .single();
              if (profile) {
                const pts = profile.loyalty_points ?? 0;
                const THRESHOLDS: Record<string, number> = {
                  'Première Parenthèse': 2000, 'Habitude': 5000, 'Rituel': 10000, 'Sérénité': 20000,
                };
                const nextThreshold = THRESHOLDS[profile.loyalty_level ?? 'Première Parenthèse'] ?? 2000;
                const remaining = Math.max(0, nextThreshold - pts);
                await supabase.functions.invoke('push-send', {
                  body: {
                    user_id: userId,
                    type: 'points_earned',
                    title: `Points gagnés !`,
                    body: remaining > 0
                      ? `Vous êtes à ${remaining} points du prochain niveau.`
                      : `Félicitations, vous avez atteint le sommet !`,
                    data: { screen: '/fidelite' },
                  },
                });
              }
            } catch (e) { console.error('Push points_earned error:', e); }
          }, 30000);
        }

        console.log(`Payment ${payment.id} completed for order ${payment.order_id}`);
        break;
      }

      case 'catalog.version.updated': {
        console.log('Catalog updated, triggering sync...');
        await supabase.functions.invoke('sync-catalog', { body: {} });
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ received: true, type: eventType }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('square-webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
