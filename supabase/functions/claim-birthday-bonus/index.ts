// Edge Function — Enregistre l'anniversaire client + bonus fidélité one-shot.
//
// Doctrine Teaven : Square = source de vérité (customer + loyalty).
// Supabase stocke uniquement le marqueur de bonus consommé (idempotence).
//
// Flux :
//   1. Auth obligatoire
//   2. Lire le profil pour vérifier que le bonus n'a pas déjà été réclamé
//   3. Si birthday fourni → mise à jour côté Square Customer
//   4. Si bonus pas encore réclamé → ajuster le compte loyalty Square (+100 pts)
//   5. Marquer le profil (birthday + birthday_bonus_claimed_at)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SQUARE_ENV = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
const SQUARE_BASE_URL = SQUARE_ENV === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';
const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN') ?? '';
const SQUARE_VERSION = '2025-01-23';

const BIRTHDAY_BONUS_POINTS = 100;

async function squareFetch(path: string, method = 'GET', body?: Record<string, unknown>) {
  const res = await fetch(`${SQUARE_BASE_URL}${path}`, {
    method,
    headers: {
      'Square-Version': SQUARE_VERSION,
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { ok: res.ok, body: json };
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

/** Récupère ou crée le compte loyalty Square pour un customer + téléphone. */
async function findOrCreateLoyaltyAccount(customerId: string, phone: string | null) {
  // 1. Recherche par customer_id
  const byCustomer = await squareFetch('/v2/loyalty/accounts/search', 'POST', {
    query: { customer_ids: [customerId] },
  });
  if (byCustomer.ok && byCustomer.body?.loyalty_accounts?.length) {
    return byCustomer.body.loyalty_accounts[0];
  }

  // 2. Recherche par téléphone
  if (phone) {
    const variants = new Set<string>();
    variants.add(phone);
    if (phone.startsWith('+33')) variants.add('0' + phone.slice(3));
    if (phone.startsWith('0')) variants.add('+33' + phone.slice(1));
    for (const v of variants) {
      const byPhone = await squareFetch('/v2/loyalty/accounts/search', 'POST', {
        query: { mappings: [{ type: 'PHONE', value: v }] },
      });
      if (byPhone.ok && byPhone.body?.loyalty_accounts?.length) {
        return byPhone.body.loyalty_accounts[0];
      }
    }
  }

  // 3. Création
  const program = await squareFetch('/v2/loyalty/programs/main', 'GET');
  if (!program.ok || !program.body?.program?.id) return null;
  const create = await squareFetch('/v2/loyalty/accounts', 'POST', {
    idempotency_key: `loyalty-create-${customerId}`,
    loyalty_account: {
      program_id: program.body.program.id,
      mapping: phone ? { phone_number: phone } : undefined,
      customer_id: customerId,
    },
  });
  return create.ok ? create.body?.loyalty_account ?? null : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authUser = await authenticateUser(req);
    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'Connexion requise' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { birthday } = await req.json() as { birthday?: string };

    if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return new Response(
        JSON.stringify({ error: 'Format de date invalide (attendu YYYY-MM-DD)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('square_customer_id, phone, birthday, birthday_bonus_claimed_at, loyalty_points')
      .eq('id', authUser.id)
      .single();

    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const alreadyClaimed = !!profile.birthday_bonus_claimed_at;
    let bonusAwarded = 0;
    let newBalance: number | null = null;

    // 1. Mettre à jour le birthday côté Square (si on a un customer Square lié)
    if (profile.square_customer_id) {
      try {
        await squareFetch(`/v2/customers/${profile.square_customer_id}`, 'PUT', {
          birthday,
        });
      } catch (err) {
        console.error('[claim-birthday-bonus] Square customer update KO', err);
      }

      // 2. Si pas encore réclamé → ajuster les points loyalty Square
      if (!alreadyClaimed) {
        try {
          const loyaltyAccount = await findOrCreateLoyaltyAccount(
            profile.square_customer_id,
            profile.phone ?? authUser.phone ?? null,
          );

          if (loyaltyAccount?.id) {
            const adjust = await squareFetch(
              `/v2/loyalty/accounts/${loyaltyAccount.id}/adjust`,
              'POST',
              {
                idempotency_key: `birthday-${authUser.id}`,
                adjust_points: {
                  points: BIRTHDAY_BONUS_POINTS,
                  reason: 'Bonus anniversaire Teaven',
                },
              },
            );
            if (adjust.ok) {
              bonusAwarded = BIRTHDAY_BONUS_POINTS;
              newBalance = adjust.body?.event?.loyalty_account_id
                ? (loyaltyAccount.balance ?? 0) + BIRTHDAY_BONUS_POINTS
                : null;
            } else {
              console.error('[claim-birthday-bonus] adjust loyalty KO', adjust.body?.errors);
            }
          }
        } catch (err) {
          console.error('[claim-birthday-bonus] loyalty adjust threw', err);
        }
      }
    }

    // 3. Marquer le profil — toujours (même si Square indisponible) pour garder l'info localement
    const updatePayload: Record<string, unknown> = {
      id: authUser.id,
      birthday,
      updated_at: new Date().toISOString(),
    };
    if (!alreadyClaimed && bonusAwarded > 0) {
      updatePayload.birthday_bonus_claimed_at = new Date().toISOString();
      updatePayload.loyalty_points = (profile.loyalty_points ?? 0) + bonusAwarded;
    }
    await supabase.from('profiles').upsert(updatePayload, { onConflict: 'id' });

    return new Response(
      JSON.stringify({
        success: true,
        bonusAwarded,
        alreadyClaimed,
        newBalance,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[claim-birthday-bonus] error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
