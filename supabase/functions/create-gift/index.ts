// ✅ CHANTIER 6 — Edge Function : créer un cadeau "Offrir un moment"
// 1. Crée une Gift Card Square
// 2. Charge le montant dessus
// 3. Enregistre dans wallet_gifts
// 4. Retourne le code cadeau

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Génère un code cadeau lisible : TEAVEN-XXXX */
function generateGiftCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TEAVEN-${code}`;
}

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST requis' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authUser = await authenticateUser(req);
    if (!authUser) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { recipientPhone, amount, message, momentName } = body as {
      recipientPhone: string;
      amount: number;       // en centimes
      message?: string;
      momentName?: string;  // ex: "Une pause sucrée"
    };

    if (!recipientPhone || !amount || amount < 500 || amount > 20000) {
      return new Response(JSON.stringify({ error: 'Téléphone et montant (5€–200€) requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
    const squareBaseUrl = squareEnvironment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');

    // 1. Créer une Gift Card Square
    const createRes = await fetch(`${squareBaseUrl}/v2/gift-cards`, {
      method: 'POST',
      headers: {
        'Square-Version': '2025-01-23',
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        location_id: locationId,
        type: 'DIGITAL',
      }),
    });
    const createData = await createRes.json();

    if (!createRes.ok || !createData.gift_card) {
      console.error('Square gift card create error:', createData);
      return new Response(JSON.stringify({ error: 'Erreur création carte cadeau', details: createData }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const giftCard = createData.gift_card;
    const giftCardId = giftCard.id;

    // 2. Charger le montant (ACTIVATE)
    const activateRes = await fetch(`${squareBaseUrl}/v2/gift-cards/${giftCardId}/activities`, {
      method: 'POST',
      headers: {
        'Square-Version': '2025-01-23',
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        gift_card_activity: {
          gift_card_id: giftCardId,
          type: 'ACTIVATE',
          location_id: locationId,
          activate_activity_details: {
            amount_money: {
              amount: amount,
              currency: 'EUR',
            },
          },
        },
      }),
    });
    const activateData = await activateRes.json();

    if (!activateRes.ok) {
      console.error('Square gift card activate error:', activateData);
      return new Response(JSON.stringify({ error: 'Erreur chargement carte cadeau', details: activateData }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Enregistrer dans Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const code = generateGiftCode();
    const { data: giftRow, error: dbError } = await supabase
      .from('wallet_gifts')
      .insert({
        sender_id: authUser.id,
        recipient_phone: recipientPhone,
        amount,
        message: (message ?? '').slice(0, 150),
        gift_card_id: giftCardId,
        code,
        moment_name: momentName ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Supabase insert error:', dbError);
    }

    // 4. Retourner le code
    return new Response(JSON.stringify({
      success: true,
      code,
      giftCardId,
      gan: giftCard.gan,
      amount,
      giftRow,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('create-gift error:', err);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
