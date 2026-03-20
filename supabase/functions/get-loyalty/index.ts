// Edge Function — Récupérer les points de fidélité via Square Loyalty API
// Appelle Square Loyalty API pour obtenir les vrais points du client
// Fallback sur les données Supabase si Square n'est pas configuré

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SQUARE_BASE_URL = Deno.env.get('SQUARE_ENVIRONMENT') === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN') ?? '';
const SQUARE_VERSION = '2025-01-23';

// Seuils de fidélité Teaven
const LOYALTY_THRESHOLDS = {
  Bronze: 0,
  Argent: 200,
  Or: 500,
  Platine: 1000,
};

function getLoyaltyLevel(points: number): string {
  if (points >= LOYALTY_THRESHOLDS.Platine) return 'Platine';
  if (points >= LOYALTY_THRESHOLDS.Or) return 'Or';
  if (points >= LOYALTY_THRESHOLDS.Argent) return 'Argent';
  return 'Bronze';
}

function getLoyaltyProgress(points: number): number {
  const level = getLoyaltyLevel(points);
  const entries = Object.entries(LOYALTY_THRESHOLDS);
  const currentIdx = entries.findIndex(([k]) => k === level);
  const nextIdx = currentIdx + 1;
  if (nextIdx >= entries.length) return 100;
  const currentThreshold = entries[currentIdx][1];
  const nextThreshold = entries[nextIdx][1];
  return Math.min(Math.round(((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100), 100);
}

/** Appel Square API */
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
  return res.json();
}

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
    // Authentification requise
    const authUser = await authenticateUser(req);
    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'Authentification requise' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'JSON invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { customerId } = body;

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'customerId est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let points = 0;
    let loyaltyAccountId: string | null = null;

    // 1. Récupérer le programme de fidélité Square
    if (SQUARE_ACCESS_TOKEN) {
      try {
        // Chercher le compte fidélité du client
        const searchResult = await squareFetch('/v2/loyalty/accounts/search', 'POST', {
          query: {
            customer_ids: [customerId],
          },
        });

        if (searchResult.loyalty_accounts && searchResult.loyalty_accounts.length > 0) {
          const account = searchResult.loyalty_accounts[0];
          points = account.balance ?? 0;
          loyaltyAccountId = account.id;
        } else {
          // Pas de compte fidélité — essayer d'en créer un
          const programResult = await squareFetch('/v2/loyalty/programs/main', 'GET');
          if (programResult.program) {
            const createResult = await squareFetch('/v2/loyalty/accounts', 'POST', {
              idempotency_key: crypto.randomUUID(),
              loyalty_account: {
                program_id: programResult.program.id,
                mapping: { phone_number: authUser.phone ?? '' },
              },
            });
            if (createResult.loyalty_account) {
              points = createResult.loyalty_account.balance ?? 0;
              loyaltyAccountId = createResult.loyalty_account.id;
            }
          }
        }
      } catch (err) {
        console.error('Erreur Square Loyalty API:', err);
        // Fallback : lire depuis Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data } = await supabase
          .from('profiles')
          .select('loyalty_points')
          .eq('square_customer_id', customerId)
          .single();

        if (data) {
          points = data.loyalty_points ?? 0;
        }
      }
    }

    const level = getLoyaltyLevel(points);
    const progress = getLoyaltyProgress(points);

    // Récompenses disponibles selon le niveau
    const rewards = [
      { id: '1', name: 'Boisson offerte', description: 'Un thé ou café au choix', pointsCost: 200, icon: 'coffee' },
      { id: '2', name: 'Dessert offert', description: 'Une pâtisserie au choix', pointsCost: 500, icon: 'gift' },
      { id: '3', name: '-20% sur la carte', description: 'Réduction sur votre commande', pointsCost: 750, icon: 'percent' },
      { id: '4', name: 'Menu complet offert', description: 'Bowl + boisson + dessert', pointsCost: 1000, icon: 'star' },
    ];

    return new Response(
      JSON.stringify({
        success: true,
        points,
        level,
        progress,
        loyaltyAccountId,
        rewards: rewards.filter((r) => r.pointsCost <= points + 500),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('get-loyalty error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
