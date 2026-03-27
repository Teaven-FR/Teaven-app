// Edge Function — Traiter un paiement Square
// Déployée séparément via : supabase functions deploy process-payment

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Vérifie le JWT Supabase et retourne l'utilisateur authentifié */
async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

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
    // Authentification — optionnelle (guest allowed)
    const authUser = await authenticateUser(req);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'JSON invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { orderId, sourceId, amount, giftCardId, idempotencyKey, paymentMethod } = body as {
      orderId?: string;
      sourceId?: string;
      amount?: number;
      giftCardId?: string;
      idempotencyKey?: string;
      paymentMethod?: string;
    };

    if (!orderId || !amount) {
      return new Response(
        JSON.stringify({ error: 'orderId et amount sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Déterminer la source de paiement
    const isCardPayment = sourceId && sourceId.startsWith('cnon');
    const isWalletPayment = paymentMethod === 'wallet' && giftCardId;

    if (!isCardPayment && !isWalletPayment) {
      return new Response(
        JSON.stringify({ error: 'Un moyen de paiement valide est requis (carte ou wallet)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validation du montant
    if (!Number.isInteger(amount) || amount <= 0 || amount > 50000) {
      return new Response(
        JSON.stringify({ error: 'amount doit être un entier positif en centimes (max 500€)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const netAmount = amount;

    // Vérifier que la commande appartient à l'utilisateur
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: orderRow } = await supabase
      .from('orders')
      .select('user_id')
      .eq('square_order_id', orderId)
      .single();

    if (authUser && orderRow && orderRow.user_id && orderRow.user_id !== authUser.id) {
      return new Response(
        JSON.stringify({ error: 'Accès non autorisé à cette commande' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
    const squareBaseUrl = squareEnvironment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    // deno-lint-ignore no-explicit-any
    let paymentData: any;

    if (isCardPayment) {
      // ── Paiement CB réel via Square Payments API ──
      const paymentResponse = await fetch(`${squareBaseUrl}/v2/payments`, {
        method: 'POST',
        headers: {
          'Square-Version': '2025-01-23',
          'Authorization': `Bearer ${squareAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_id: sourceId,
          idempotency_key: idempotencyKey ?? crypto.randomUUID(),
          amount_money: {
            amount: netAmount,
            currency: 'EUR',
          },
          order_id: orderId,
          autocomplete: true,
          location_id: Deno.env.get('SQUARE_LOCATION_ID'),
          // Lier le paiement au client Square pour l'historique et la carte enregistrée
          ...(orderRow?.user_id ? await (async () => {
            const { data: p } = await supabase.from('profiles').select('square_customer_id').eq('id', orderRow.user_id).single();
            return p?.square_customer_id ? { customer_id: p.square_customer_id } : {};
          })() : {}),
        }),
      });

      paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        console.error('Square payment error:', paymentData);
        const errDetail = (paymentData as { errors?: Array<{ detail?: string }> }).errors?.[0]?.detail;
        const friendlyMsg = errDetail?.includes('declined') || errDetail?.includes('refus')
          ? 'Paiement refusé. Vérifiez vos informations ou essayez un autre moyen.'
          : errDetail?.includes('network') || errDetail?.includes('timeout')
          ? 'Erreur de connexion. Votre carte n\'a pas été débitée. Réessayez.'
          : 'Échec du paiement';
        return new Response(
          JSON.stringify({ error: friendlyMsg, details: paymentData }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    } else if (isWalletPayment) {
      // ── Paiement wallet via Square Gift Card ──
      const paymentResponse = await fetch(`${squareBaseUrl}/v2/payments`, {
        method: 'POST',
        headers: {
          'Square-Version': '2025-01-23',
          'Authorization': `Bearer ${squareAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_id: giftCardId,
          idempotency_key: idempotencyKey ?? crypto.randomUUID(),
          amount_money: {
            amount: netAmount,
            currency: 'EUR',
          },
          order_id: orderId,
          autocomplete: true,
          location_id: Deno.env.get('SQUARE_LOCATION_ID'),
        }),
      });

      paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        console.error('Square gift card payment error:', paymentData);
        const errDetail = (paymentData as { errors?: Array<{ detail?: string }> }).errors?.[0]?.detail;
        return new Response(
          JSON.stringify({ error: errDetail ?? 'Échec du paiement wallet', details: paymentData }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Mettre à jour la commande dans Supabase
    await supabase
      .from('orders')
      .update({
        status: 'payment_confirmed',
        payment_id: paymentData.payment?.id,
        paid_at: new Date().toISOString(),
      })
      .eq('square_order_id', orderId);

    // --- Loyalty: attribuer des points après paiement réussi ---
    // Base = 10 pts/€ avec multiplicateur par niveau
    const LEVEL_MULTIPLIERS: Record<string, number> = {
      'Première Parenthèse': 1, 'Habitude': 1, 'Rituel': 1.5, 'Sérénité': 1.7, 'Essentia': 2,
    };
    function getLoyaltyLevel(pts: number): string {
      if (pts >= 20000) return 'Essentia';
      if (pts >= 10000) return 'Sérénité';
      if (pts >= 5000) return 'Rituel';
      if (pts >= 2000) return 'Habitude';
      return 'Première Parenthèse';
    }

    let pointsEarned = 0;
    try {
      if (!authUser) throw new Error('No auth user — skipping loyalty');
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, square_customer_id, loyalty_points, loyalty_level')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        // 10 pts par euro × multiplicateur du niveau
        const euros = amount / 100;
        const level = profile.loyalty_level || getLoyaltyLevel(profile.loyalty_points ?? 0);
        const multiplier = LEVEL_MULTIPLIERS[level] ?? 1;
        pointsEarned = Math.floor(euros * 10 * multiplier);

        if (pointsEarned > 0) {
          const newTotal = (profile.loyalty_points ?? 0) + pointsEarned;
          const newLevel = getLoyaltyLevel(newTotal);

          // Mise à jour profil : points + niveau
          await supabase
            .from('profiles')
            .update({ loyalty_points: newTotal, loyalty_level: newLevel })
            .eq('id', authUser.id);

          // Transaction fidélité
          await supabase
            .from('loyalty_transactions')
            .insert({
              user_id: authUser.id,
              points: pointsEarned,
              type: 'earn',
              reason: `Commande ${orderId} (×${multiplier})`,
              order_id: orderId,
            });

          // Square Loyalty API : accumulate points basé sur la commande
          if (profile.square_customer_id) {
            try {
              const loyaltySearchRes = await fetch(`${squareBaseUrl}/v2/loyalty/accounts/search`, {
                method: 'POST',
                headers: {
                  'Square-Version': '2025-01-23',
                  'Authorization': `Bearer ${squareAccessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  query: { customer_ids: [profile.square_customer_id] },
                }),
              });
              const loyaltySearchData = await loyaltySearchRes.json();
              const loyaltyAccountId = loyaltySearchData.loyalty_accounts?.[0]?.id;

              if (loyaltyAccountId) {
                // Utiliser accumulate avec l'order_id — Square calcule les points automatiquement
                const accRes = await fetch(`${squareBaseUrl}/v2/loyalty/accounts/${loyaltyAccountId}/accumulate`, {
                  method: 'POST',
                  headers: {
                    'Square-Version': '2025-01-23',
                    'Authorization': `Bearer ${squareAccessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    idempotency_key: crypto.randomUUID(),
                    accumulate_points: {
                      order_id: orderId,
                    },
                    location_id: Deno.env.get('SQUARE_LOCATION_ID'),
                  }),
                });
                const accData = await accRes.json();
                if (accRes.ok) {
                  // Mettre à jour les points réels depuis la réponse
                  const newBalance = accData.event?.loyalty_event?.accumulate_points?.loyalty_program_id
                    ? accData.event?.accumulate_points?.points
                    : pointsEarned;
                  console.log(`[process-payment] Loyalty accumulate OK: +${newBalance ?? pointsEarned} pts`);
                } else {
                  console.error('[process-payment] Loyalty accumulate error:', JSON.stringify(accData));
                  // Fallback : adjust manuellement
                  await fetch(`${squareBaseUrl}/v2/loyalty/accounts/${loyaltyAccountId}/adjust`, {
                    method: 'POST',
                    headers: {
                      'Square-Version': '2025-01-23',
                      'Authorization': `Bearer ${squareAccessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      idempotency_key: crypto.randomUUID(),
                      adjust_points: {
                        points: pointsEarned,
                        reason: `Commande ${orderId}`,
                      },
                    }),
                  });
                }
              }
            } catch (loyaltySquareErr) {
              console.error('Square Loyalty adjust error (non-fatal):', loyaltySquareErr);
            }
          }
        }
      }
    } catch (loyaltyErr) {
      console.error('Loyalty points error (non-fatal):', loyaltyErr);
    }

    // Créer une notification pour le client
    if (authUser) {
      try {
        await supabase.from('notifications').insert({
          user_id: authUser.id,
          type: 'order',
          title: 'Commande confirmée',
          body: `Votre commande est confirmée. ${pointsEarned > 0 ? `+${pointsEarned} pts fidélité gagnés !` : ''}`,
          data: { orderId, pointsEarned },
        });
      } catch { /* non bloquant */ }
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentData.payment?.id,
        orderId,
        pointsEarned,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('process-payment error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
