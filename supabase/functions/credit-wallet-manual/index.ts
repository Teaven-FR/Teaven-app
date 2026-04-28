// Edge Function temporaire — créer et créditer une gift card
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN')!;
  const squareBaseUrl = Deno.env.get('SQUARE_ENVIRONMENT') === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
  const locationId = Deno.env.get('SQUARE_LOCATION_ID')!;

  const body = await req.json();
  const amount = body.amount ?? 2500;

  try {
    // 1. Créer gift card
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
        gift_card: { type: 'DIGITAL' },
      }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      return new Response(JSON.stringify({ error: 'Create failed', details: createData }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const giftCardId = createData.gift_card.id;
    const gan = createData.gift_card.gan;

    // 2. Créditer via ADJUST_INCREMENT (fonctionne sans order)
    const adjustRes = await fetch(`${squareBaseUrl}/v2/gift-cards/activities`, {
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
          type: 'ADJUST_INCREMENT',
          location_id: locationId,
          adjust_increment_activity_details: {
            amount_money: { amount, currency: 'EUR' },
            reason: 'COMPLIMENTARY',
          },
        },
      }),
    });
    const adjustData = await adjustRes.json();

    // 3. Lire le solde
    const balRes = await fetch(`${squareBaseUrl}/v2/gift-cards/${giftCardId}`, {
      headers: { 'Square-Version': '2025-01-23', 'Authorization': `Bearer ${squareAccessToken}` },
    });
    const balData = await balRes.json();

    return new Response(JSON.stringify({
      success: true,
      giftCardId,
      gan,
      balance: balData.gift_card?.balance_money?.amount,
      state: balData.gift_card?.state,
      adjustOk: adjustRes.ok,
      adjustError: adjustRes.ok ? null : adjustData,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
