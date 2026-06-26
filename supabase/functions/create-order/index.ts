// Edge Function — Créer une commande Square avec variations et modificateurs
// Déployée via : supabase functions deploy create-order

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderLineItem {
  catalogObjectId: string; // Square variation ID (pas l'item ID)
  quantity: number;
  name: string;
  modifiers?: { squareModifierId: string }[];
}

/**
 * Identifie l'utilisateur via le JWT Supabase.
 * verify_jwt:true au niveau Edge Runtime valide déjà la signature en amont,
 * on peut donc faire confiance au `sub` du JWT décodé.
 * Fallback supabase.auth.getUser() si décodage manuel échoue.
 */
async function authenticateUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;

  // 1. Décodage manuel du JWT pour extraire le sub (user_id)
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const padded = parts[1] + '='.repeat((4 - (parts[1].length % 4)) % 4);
      const payload = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
      if (payload?.sub && typeof payload.sub === 'string' && payload.sub.length > 0) {
        if (payload.sub !== 'anon' && payload.role !== 'anon') {
          return { id: payload.sub, email: payload.email };
        }
      }
    } catch { /* fallback ci-dessous */ }
  }

  // 2. Fallback : getUser() classique (peut échouer si SDK incompatible)
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
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

    const { items, pickupTime, customerName, customerPhone, rewardTierId, loyaltyAccountId, discounts: rawDiscounts, mode, subtotal, deliveryAddress } = body as {
      items: OrderLineItem[];
      pickupTime?: string;
      customerName?: string;
      customerPhone?: string;
      rewardTierId?: string;
      loyaltyAccountId?: string;
      discounts?: unknown;
      mode?: 'pickup' | 'delivery';
      subtotal?: number;
      deliveryAddress?: { street: string; city: string; postalCode: string; complement?: string };
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'items est requis et doit être un tableau non vide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
    const squareBaseUrl = squareEnvironment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');

    // Init Supabase (pour profil client + sauvegarde commande)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    console.log(`[create-order] Location: ${locationId}, items:`, JSON.stringify(items).slice(0, 500));

    // Construire les line items Square
    const lineItems = (items as OrderLineItem[]).map((item) => {
      const lineItem: Record<string, unknown> = {
        catalog_object_id: item.catalogObjectId,
        quantity: String(item.quantity),
      };

      if (item.modifiers && item.modifiers.length > 0) {
        lineItem.modifiers = item.modifiers.map((mod) => ({
          catalog_object_id: mod.squareModifierId,
        }));
      }

      return lineItem;
    });

    // Créer la commande via Square Orders API
    const scheduledPickup = (pickupTime as string) ?? new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // Nom et téléphone du client
    const displayName = (customerName as string) || 'Client Teaven';
    const phone = (customerPhone as string) || undefined;

    // Chercher le profil Supabase pour plus d'infos si on a un user authentifié
    let profileName = displayName;
    let profilePhone = phone;
    let profileEmail: string | undefined;
    if (authUser) {
      profileEmail = authUser.email ?? undefined;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', authUser.id)
        .single();
      if (profile?.full_name) profileName = profile.full_name;
      if (profile?.phone) profilePhone = profile.phone;
      if (profile?.email) profileEmail = profile.email as string;
    }

    // Formater le téléphone
    let formattedPhone = profilePhone;
    if (formattedPhone && !formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Créer un loyalty reward si demandé
    let loyaltyRewardId: string | undefined;
    if (rewardTierId && loyaltyAccountId) {
      try {
        const rewardRes = await fetch(`${squareBaseUrl}/v2/loyalty/rewards`, {
          method: 'POST',
          headers: {
            'Square-Version': '2025-01-23',
            'Authorization': `Bearer ${squareAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reward: {
              loyalty_account_id: loyaltyAccountId as string,
              reward_tier_id: rewardTierId as string,
            },
            idempotency_key: crypto.randomUUID(),
          }),
        });
        const rewardData = await rewardRes.json();
        if (rewardRes.ok && rewardData.reward) {
          loyaltyRewardId = rewardData.reward.id;
          console.log(`[create-order] Loyalty reward created: ${loyaltyRewardId}`);
        } else {
          console.error('[create-order] Loyalty reward error:', JSON.stringify(rewardData));
        }
      } catch (err) {
        console.error('[create-order] Loyalty reward exception:', err);
      }
    }

    // Construire les discounts Square
    const squareDiscounts: Array<Record<string, unknown>> = [];
    if (rawDiscounts && Array.isArray(rawDiscounts)) {
      for (const d of rawDiscounts as Array<{ name: string; percentage?: string; amountCents?: number }>) {
        if (d.percentage) {
          squareDiscounts.push({
            name: d.name,
            percentage: d.percentage,
            scope: 'ORDER',
          });
        } else if (d.amountCents) {
          squareDiscounts.push({
            name: d.name,
            amount_money: { amount: d.amountCents, currency: 'EUR' },
            scope: 'ORDER',
          });
        }
      }
    }

    const orderResponse = await fetch(`${squareBaseUrl}/v2/orders`, {
      method: 'POST',
      headers: {
        'Square-Version': '2025-01-23',
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order: {
          location_id: locationId,
          reference_id: `TEAVEN-${Date.now()}`,
          source: { name: 'Teaven app' },
          line_items: lineItems,
          ...(squareDiscounts.length > 0 ? { discounts: squareDiscounts } : {}),
          fulfillments: [
            // Square IMPOSE state='PROPOSED' (ou 'HELD') à la CRÉATION d'une
            // commande via l'API — créer directement en 'RESERVED' est rejeté
            // ("Fulfillments must be created with state of PROPOSED or HELD").
            // C'est le type de fulfillment qui décide de la visibilité KDS :
            // une livraison Uber = coursier qui retire au comptoir => PICKUP
            // (comme une commande emporter), et non DELIVERY (que Square exclut
            // du flux de préparation). L'adresse client est mise dans la note.
            mode === 'delivery'
              ? {
                  type: 'PICKUP',
                  state: 'PROPOSED',
                  pickup_details: {
                    schedule_type: 'SCHEDULED',
                    pickup_at: scheduledPickup,
                    recipient: {
                      display_name: `🚚 Coursier Uber — ${profileName}`,
                      ...(formattedPhone ? { phone_number: formattedPhone } : {}),
                      ...(profileEmail ? { email_address: profileEmail } : {}),
                    },
                    note: deliveryAddress
                      ? `🚚 LIVRAISON UBER — À REMETTRE AU COURSIER\nClient : ${profileName}\n${deliveryAddress.street}${deliveryAddress.complement ? ` (${deliveryAddress.complement})` : ''}\n${deliveryAddress.postalCode} ${deliveryAddress.city}${formattedPhone ? `\n☎ ${formattedPhone}` : ''}`
                      : `🚚 LIVRAISON UBER — ${profileName}`,
                  },
                }
              : {
                  type: 'PICKUP',
                  state: 'PROPOSED',
                  pickup_details: {
                    schedule_type: 'SCHEDULED',
                    pickup_at: scheduledPickup,
                    recipient: {
                      display_name: profileName,
                      ...(formattedPhone ? { phone_number: formattedPhone } : {}),
                      ...(profileEmail ? { email_address: profileEmail } : {}),
                    },
                    note: `Commande via app Teaven — ${profileName}`,
                  },
                },
          ],
          // rewards est un champ read-only — le loyalty reward est appliqué automatiquement via POST /v2/loyalty/rewards
        },
        idempotency_key: crypto.randomUUID(),
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error('Square order error:', JSON.stringify(orderData));
      const squareErrors = orderData.errors as Array<{ detail?: string; code?: string }> | undefined;
      const firstError = squareErrors?.[0];
      const friendlyMsg = firstError?.code === 'NOT_FOUND'
        ? `Produit introuvable dans Square. Veuillez vider votre panier et réessayer.`
        : firstError?.detail ?? 'Échec de la création de commande';
      return new Response(
        JSON.stringify({ error: friendlyMsg, details: orderData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const squareOrder = orderData.order;

    // Sauvegarder dans Supabase — mode/subtotal envoyés par le client (par
    // défaut 'pickup' si absent pour compat). C'est ce mode qui décide du
    // routing app (/order/[id] vs /delivery/[id]) et des STATUS_STEPS
    // affichés côté tracking.
    const orderMode = mode === 'delivery' ? 'delivery' : 'pickup';
    const { data: dbOrder, error: dbError } = await supabase
      .from('orders')
      .insert({
        user_id: authUser?.id ?? null,
        square_order_id: squareOrder.id,
        status: 'payment_pending',
        mode: orderMode,
        subtotal: typeof subtotal === 'number' ? subtotal : (squareOrder.total_money?.amount ?? 0),
        total_amount: squareOrder.total_money?.amount ?? 0,
        items: items,
        pickup_time: scheduledPickup,
        customer_name: profileName,
        customer_phone: formattedPhone ?? null,
        // Adresse de livraison persistée (lat/lng inclus si l'app les fournit)
        // → permet la création serveur de la livraison Uber (square-webhook)
        //   et alimente la carte de suivi, indépendamment du build de l'app.
        delivery_address: orderMode === 'delivery' && deliveryAddress
          ? {
              street: deliveryAddress.street,
              city: deliveryAddress.city,
              postalCode: deliveryAddress.postalCode,
              complement: deliveryAddress.complement ?? null,
              lat: (deliveryAddress as { lat?: number }).lat ?? null,
              lng: (deliveryAddress as { lng?: number }).lng ?? null,
              name: profileName,
              phone: formattedPhone ?? null,
            }
          : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Supabase insert error:', dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: squareOrder.id,
        totalAmount: squareOrder.total_money?.amount,
        estimatedPickup: scheduledPickup,
        dbOrder,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('create-order error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
