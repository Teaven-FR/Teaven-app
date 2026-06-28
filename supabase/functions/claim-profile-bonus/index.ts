// Edge Function — Bonus de complétion de profil (one-shot par champ).
//
// Doctrine Teaven : Square = source de vérité pour les points loyalty.
// Supabase stocke seulement la liste des bonus déjà attribués (idempotence).
//
// POST { field: 'name' | 'email' | 'address' }
//   → +50 pts si le champ vient d'être rempli ET pas encore réclamé.
//   → 0 pts sinon (déjà réclamé / champ inconnu).
//
// Le bonus 'birthday' (+100 pts) est géré séparément par claim-birthday-bonus.

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

const FIELD_BONUS_POINTS = 50;
const VALID_FIELDS = new Set(['name', 'email', 'address']);

const REASON_BY_FIELD: Record<string, string> = {
  name: 'Profil complété : nom',
  email: 'Profil complété : email',
  address: 'Profil complété : adresse',
};

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

async function adjustLoyaltyPoints(squareCustomerId: string, points: number, reason: string) {
  const search = await fetch(`${SQUARE_BASE_URL}/v2/loyalty/accounts/search`, {
    method: 'POST',
    headers: {
      'Square-Version': SQUARE_VERSION,
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: { customer_ids: [squareCustomerId] } }),
  });
  const data = await search.json();
  const loyaltyAccountId = data?.loyalty_accounts?.[0]?.id;
  if (!loyaltyAccountId) return false;

  const adjust = await fetch(`${SQUARE_BASE_URL}/v2/loyalty/accounts/${loyaltyAccountId}/adjust`, {
    method: 'POST',
    headers: {
      'Square-Version': SQUARE_VERSION,
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      adjust_points: { points, reason },
    }),
  });
  return adjust.ok;
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

    const { field } = await req.json() as { field?: string };
    if (!field || !VALID_FIELDS.has(field)) {
      return new Response(
        JSON.stringify({ error: 'Champ invalide (attendu: name, email ou address)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('square_customer_id, loyalty_points, profile_bonuses_claimed')
      .eq('id', authUser.id)
      .single();

    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const claimed: string[] = profile.profile_bonuses_claimed ?? [];
    if (claimed.includes(field)) {
      return new Response(
        JSON.stringify({ bonusAwarded: 0, alreadyClaimed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let bonusAwarded = 0;
    if (profile.square_customer_id) {
      const ok = await adjustLoyaltyPoints(
        profile.square_customer_id,
        FIELD_BONUS_POINTS,
        REASON_BY_FIELD[field],
      );
      if (ok) bonusAwarded = FIELD_BONUS_POINTS;
    }

    // Marquer comme réclamé même si Square indispo (évite spam au prochain save).
    // Les points seront re-tentés via une route admin si besoin.
    const newClaimed = [...claimed, field];
    const update: Record<string, unknown> = {
      profile_bonuses_claimed: newClaimed,
      updated_at: new Date().toISOString(),
    };
    if (bonusAwarded > 0) {
      update.loyalty_points = (profile.loyalty_points ?? 0) + bonusAwarded;
    }
    await supabase.from('profiles').update(update).eq('id', authUser.id);

    return new Response(
      JSON.stringify({ bonusAwarded, alreadyClaimed: false, claimed: newClaimed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[claim-profile-bonus] error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
