// Edge Function — Cron quotidien : célèbre l'anniversaire des clients (J-0).
//
// Doctrine Teaven : déclenché par pg_cron (Supabase) une fois par jour.
// Pour chaque profil dont la date d'anniv = aujourd'hui ET qui n'a pas
// déjà été fêté cette année :
//   1. Crédite 5 € sur sa gift card Square (via ensure-gift-card + ADJUST_INCREMENT)
//   2. Envoie une push notification "🎂 Joyeux anniversaire …"
//   3. Marque profiles.last_birthday_celebrated_year = année courante
//
// Auth : header `x-cron-secret` doit matcher l'env CRON_SECRET.
// Body optionnel : { dryRun: true } pour lister sans agir.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const SQUARE_ENV = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
const SQUARE_BASE_URL = SQUARE_ENV === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';
const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN') ?? '';
const SQUARE_LOCATION_ID = Deno.env.get('SQUARE_LOCATION_ID') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

const BIRTHDAY_GIFT_AMOUNT_CENTS = 500; // 5 €

type Profile = {
  id: string;
  full_name: string | null;
  birthday: string;
  square_customer_id: string | null;
  square_gift_card_id: string | null;
  last_birthday_celebrated_year: number | null;
};

async function ensureGiftCard(
  supabaseUrl: string,
  serviceKey: string,
  squareCustomerId: string,
  userId: string,
): Promise<{ giftCardId: string } | null> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/ensure-gift-card`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ squareCustomerId, userId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.giftCardId ? { giftCardId: data.giftCardId } : null;
  } catch {
    return null;
  }
}

async function creditGiftCard(giftCardId: string, amountCents: number) {
  const res = await fetch(`${SQUARE_BASE_URL}/v2/gift-cards/activities`, {
    method: 'POST',
    headers: {
      'Square-Version': '2025-01-23',
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      gift_card_activity: {
        gift_card_id: giftCardId,
        type: 'ADJUST_INCREMENT',
        location_id: SQUARE_LOCATION_ID,
        adjust_increment_activity_details: {
          amount_money: { amount: amountCents, currency: 'EUR' },
          reason: 'COMPLIMENTARY',
        },
      },
    }),
  });
  return res.ok;
}

async function sendBirthdayPush(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  firstName: string,
) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/push-send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        type: 'birthday',
        title: `🎂 Joyeux anniversaire ${firstName} !`,
        body: 'Ton cadeau Teaven : 5 € offerts sur ton wallet, à savourer aujourd\'hui.',
        data: { route: '/(tabs)/profil' },
      }),
    });
  } catch (err) {
    console.warn('[birthday-cron] push KO', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Auth via secret partagé (jamais de JWT user pour un cron).
  const providedSecret = req.headers.get('x-cron-secret') ?? '';
  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = !!body?.dryRun;
  } catch {
    // pas de body → run réel
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Date du jour en UTC (suffisant — le cron tourne 1×/j).
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const todayMMDD = `${month}-${day}`;

  // Sélection : birthday non null, MM-DD = aujourd'hui, pas encore fêté cette année.
  const { data: candidates, error } = await supabase
    .from('profiles')
    .select('id, full_name, birthday, square_customer_id, square_gift_card_id, last_birthday_celebrated_year')
    .not('birthday', 'is', null)
    .filter('last_birthday_celebrated_year', 'is', null)
    .returns<Profile[]>();

  // Le filtre `is null` ci-dessus exclut les déjà-fêtés ; on récupère aussi
  // ceux dont last_year != year via une 2e passe (Supabase ne permet pas
  // facilement un OR mixte filter+null sur une seule requête).
  const { data: candidates2 } = await supabase
    .from('profiles')
    .select('id, full_name, birthday, square_customer_id, square_gift_card_id, last_birthday_celebrated_year')
    .not('birthday', 'is', null)
    .neq('last_birthday_celebrated_year', year)
    .returns<Profile[]>();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Fusionner et dédupliquer, puis filtrer par MM-DD = aujourd'hui.
  const byId = new Map<string, Profile>();
  for (const p of [...(candidates ?? []), ...(candidates2 ?? [])]) byId.set(p.id, p);
  const todays = Array.from(byId.values()).filter((p) => {
    if (!p.birthday) return false;
    return p.birthday.slice(5) === todayMMDD;
  });

  if (dryRun) {
    return new Response(
      JSON.stringify({ dryRun: true, count: todays.length, profiles: todays.map((p) => ({ id: p.id, name: p.full_name, birthday: p.birthday })) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let celebrated = 0;
  let skippedNoSquare = 0;
  let creditFailures = 0;

  for (const profile of todays) {
    const firstName = (profile.full_name ?? '').trim().split(/\s+/)[0] || 'cher client';

    if (!profile.square_customer_id) {
      // Sans customer Square, pas de gift card → on envoie juste la push de bons vœux.
      await sendBirthdayPush(supabaseUrl, serviceKey, profile.id, firstName);
      await supabase
        .from('profiles')
        .update({ last_birthday_celebrated_year: year, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      skippedNoSquare += 1;
      continue;
    }

    const ensured = await ensureGiftCard(supabaseUrl, serviceKey, profile.square_customer_id, profile.id);
    if (!ensured) {
      creditFailures += 1;
      continue;
    }

    const credited = await creditGiftCard(ensured.giftCardId, BIRTHDAY_GIFT_AMOUNT_CENTS);
    if (!credited) {
      creditFailures += 1;
      continue;
    }

    await sendBirthdayPush(supabaseUrl, serviceKey, profile.id, firstName);
    await supabase.from('wallet_transactions').insert({
      user_id: profile.id,
      type: 'credit',
      amount: BIRTHDAY_GIFT_AMOUNT_CENTS,
      description: 'Cadeau anniversaire Teaven',
    });
    await supabase
      .from('profiles')
      .update({ last_birthday_celebrated_year: year, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    celebrated += 1;
  }

  return new Response(
    JSON.stringify({
      success: true,
      year,
      todayMMDD,
      candidatesToday: todays.length,
      celebrated,
      skippedNoSquare,
      creditFailures,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
