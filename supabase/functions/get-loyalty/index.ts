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

// Seuils du programme Les Parenthèses
const LOYALTY_THRESHOLDS: Record<string, number> = {
  'Première Parenthèse': 0,
  'Habitude': 2000,
  'Rituel': 5000,
  'Sérénité': 10000,
  'Essentia': 20000,
};

const LOYALTY_ORDER = ['Première Parenthèse', 'Habitude', 'Rituel', 'Sérénité', 'Essentia'];

// Multiplicateurs de points par niveau (base = 10 pts/€)
const LEVEL_MULTIPLIERS: Record<string, number> = {
  'Première Parenthèse': 1,
  'Habitude': 1,
  'Rituel': 1.5,
  'Sérénité': 1.7,
  'Essentia': 2,
};

function getLoyaltyLevel(points: number): string {
  if (points >= 20000) return 'Essentia';
  if (points >= 10000) return 'Sérénité';
  if (points >= 5000) return 'Rituel';
  if (points >= 2000) return 'Habitude';
  return 'Première Parenthèse';
}

function getLoyaltyProgress(points: number): number {
  const level = getLoyaltyLevel(points);
  const currentIdx = LOYALTY_ORDER.indexOf(level);
  const nextIdx = currentIdx + 1;
  if (nextIdx >= LOYALTY_ORDER.length) return 100;
  const currentThreshold = LOYALTY_THRESHOLDS[level];
  const nextThreshold = LOYALTY_THRESHOLDS[LOYALTY_ORDER[nextIdx]];
  return Math.min(Math.round(((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100), 100);
}

function getMultiplier(points: number): number {
  return LEVEL_MULTIPLIERS[getLoyaltyLevel(points)] ?? 1;
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
    // Authentification optionnelle (le customerId suffit)
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

    const { customerId } = body;

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'customerId est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let points = 0;
    let loyaltyAccountId: string | null = null;
    let programRewards: Array<{ id: string; name: string; description: string; pointsCost: number; icon: string }> = [];
    let accrualRules: Array<{ type: string; points: number; spendAmount?: number }> = [];

    // 1. Récupérer le programme de fidélité Square
    if (SQUARE_ACCESS_TOKEN) {
      // Récupérer le programme de fidélité Square
      try {
        const programResult = await squareFetch('/v2/loyalty/programs/main', 'GET');
        if (programResult.program) {
          const program = programResult.program;

          // Récompenses réelles depuis Square
          if (program.reward_tiers && program.reward_tiers.length > 0) {
            const iconMap: Record<string, string> = {
              'boisson': 'coffee', 'café': 'coffee', 'thé': 'coffee', 'drink': 'coffee',
              'dessert': 'gift', 'pâtisserie': 'gift', 'gâteau': 'gift',
              '%': 'percent', 'réduction': 'percent', 'remise': 'percent',
              'menu': 'star', 'complet': 'star',
            };
            programRewards = program.reward_tiers.map((tier: Record<string, unknown>) => {
              const name = (tier.name as string) ?? '';
              const nameLower = name.toLowerCase();
              let icon = 'gift';
              for (const [keyword, ic] of Object.entries(iconMap)) {
                if (nameLower.includes(keyword)) { icon = ic; break; }
              }
              return {
                id: tier.id as string,
                name,
                description: '',
                pointsCost: tier.points as number,
                icon,
              };
            });
          }

          // Règles d'accumulation
          if (program.accrual_rules) {
            accrualRules = (program.accrual_rules as Record<string, unknown>[]).map((rule) => {
              if (rule.accrual_type === 'SPEND') {
                const spendData = rule.spend_data as Record<string, unknown>;
                const money = spendData?.spend_threshold_money as Record<string, unknown>;
                return { type: 'SPEND', points: rule.points as number, spendAmount: money?.amount as number };
              }
              if (rule.accrual_type === 'VISIT') {
                return { type: 'VISIT', points: rule.points as number };
              }
              return { type: String(rule.accrual_type), points: rule.points as number };
            });
          }
        }
      } catch (err) {
        console.error('Erreur fetch programme Square:', err);
      }

      // Normaliser le téléphone (Supabase stocke sans + : "33768...")
      let rawPhone = authUser?.phone ?? (body.phone as string | undefined) ?? '';
      if (rawPhone && !rawPhone.startsWith('+')) rawPhone = '+' + rawPhone;

      try {
        // 1. Chercher par customer_id
        const searchResult = await squareFetch('/v2/loyalty/accounts/search', 'POST', {
          query: { customer_ids: [customerId] },
        });

        if (searchResult.loyalty_accounts && searchResult.loyalty_accounts.length > 0) {
          const account = searchResult.loyalty_accounts[0];
          points = account.balance ?? 0;
          loyaltyAccountId = account.id;
        } else if (rawPhone) {
          // 2. Fallback : chercher par téléphone (en magasin les points sont liés au tel)
          // Tester +33XXXXXXXX ET 0XXXXXXXX car Square peut stocker dans l'un ou l'autre
          const phoneVariants: string[] = [rawPhone];
          if (rawPhone.startsWith('+33')) {
            phoneVariants.push('0' + rawPhone.slice(3)); // +33768... → 0768...
          } else if (rawPhone.startsWith('0')) {
            phoneVariants.push('+33' + rawPhone.slice(1)); // 0768... → +33768...
          }

          let foundByPhone = false;
          for (const phoneVariant of phoneVariants) {
            const phoneSearchResult = await squareFetch('/v2/loyalty/accounts/search', 'POST', {
              query: { mappings: [{ type: 'PHONE', value: phoneVariant }] },
            });
            if (phoneSearchResult.loyalty_accounts && phoneSearchResult.loyalty_accounts.length > 0) {
              const account = phoneSearchResult.loyalty_accounts[0];
              points = account.balance ?? 0;
              loyaltyAccountId = account.id;
              foundByPhone = true;
              break;
            }
          }

          if (!foundByPhone) {
            // 3. Pas de compte fidélité — créer un compte lié au téléphone
            const programResult = await squareFetch('/v2/loyalty/programs/main', 'GET');
            if (programResult.program) {
              const createResult = await squareFetch('/v2/loyalty/accounts', 'POST', {
                idempotency_key: `loyalty-create-${customerId}`,
                loyalty_account: {
                  program_id: programResult.program.id,
                  mapping: { phone_number: rawPhone },
                },
              });
              if (createResult.loyalty_account) {
                points = createResult.loyalty_account.balance ?? 0;
                loyaltyAccountId = createResult.loyalty_account.id;
              }
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

    // Persister les points dans Supabase pour que loadSession les lise directement
    if (loyaltyAccountId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase
          .from('profiles')
          .update({ loyalty_points: points, loyalty_level: level, updated_at: new Date().toISOString() })
          .eq('square_customer_id', String(customerId));
      } catch { /* non bloquant */ }
    }

    // Récompenses disponibles selon le niveau
    const rewards = [
      { id: '1', name: 'Boisson offerte', description: 'Un thé ou café au choix', pointsCost: 200, icon: 'coffee' },
      { id: '2', name: 'Dessert offert', description: 'Une pâtisserie au choix', pointsCost: 500, icon: 'gift' },
      { id: '3', name: 'Formule offerte', description: 'Plat + boisson au choix', pointsCost: 750, icon: 'gift' },
      { id: '4', name: 'Menu complet offert', description: 'Bowl + boisson + dessert', pointsCost: 1000, icon: 'star' },
    ];

    return new Response(
      JSON.stringify({
        success: true,
        points,
        level,
        progress,
        loyaltyAccountId,
        rewards: programRewards.length > 0 ? programRewards : rewards,
      accrualRules,
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
