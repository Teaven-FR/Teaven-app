// Edge Function — Vérifier et avancer la progression des défis après une commande
// Appelée par square-webhook quand une commande est payée
// POST { user_id, order_total, line_items?, order_time? }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const squareBaseUrl = (Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox') === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { user_id, order_total, line_items, order_time } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const orderHour = order_time ? new Date(order_time).getHours() : new Date().getHours();

    // Récupérer les défis actifs
    const { data: activeChallenges } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true);

    if (!activeChallenges?.length) {
      return new Response(JSON.stringify({ updated: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer la progression actuelle du client pour tous les défis
    const challengeIds = activeChallenges.map((c: { id: string }) => c.id);
    const { data: existingProgress } = await supabase
      .from('challenge_progress')
      .select('*')
      .eq('user_id', user_id)
      .in('challenge_id', challengeIds);

    const progressMap = new Map(
      (existingProgress ?? []).map((p: { challenge_id: string }) => [p.challenge_id, p])
    );

    const results: Array<{ challenge: string; completed: boolean; pointsAwarded: number }> = [];

    for (const challenge of activeChallenges) {
      let progress = progressMap.get(challenge.id) as {
        id: string;
        current_value: number;
        streak_current: number;
        last_increment_date: string | null;
        completed_at: string | null;
        points_awarded: boolean;
      } | undefined;

      // Ignorer les défis déjà complétés et récompensés
      if (progress?.completed_at && progress?.points_awarded) continue;

      // Créer la progression si elle n'existe pas
      if (!progress) {
        const { data: newProgress } = await supabase
          .from('challenge_progress')
          .insert({ user_id, challenge_id: challenge.id, current_value: 0, streak_current: 0 })
          .select()
          .single();
        if (!newProgress) continue;
        progress = newProgress;
      }

      let shouldIncrement = false;
      let newValue = progress.current_value;
      let newStreak = progress.streak_current;

      switch (challenge.type) {
        case 'streak': {
          const lastDate = progress.last_increment_date;
          if (lastDate === today) {
            // Déjà compté aujourd'hui
            break;
          }
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastDate === yesterdayStr) {
            newStreak = progress.streak_current + 1;
          } else {
            newStreak = 1; // Reset
          }
          newValue = newStreak;
          shouldIncrement = true;
          break;
        }

        case 'frequency': {
          // Rituel du matin : seulement avant 11h
          if (challenge.title.includes('matin') && orderHour >= 11) break;
          newValue = progress.current_value + 1;
          shouldIncrement = true;
          break;
        }

        case 'category': {
          // Vérifier si les line_items contiennent la catégorie cible
          if (line_items && challenge.target_category) {
            const hasCategory = line_items.some(
              (item: { name?: string; category?: string }) =>
                (item.name ?? '').toLowerCase().includes(challenge.target_category!.toLowerCase()) ||
                (item.category ?? '').toLowerCase().includes(challenge.target_category!.toLowerCase())
            );
            if (hasCategory) {
              newValue = progress.current_value + 1;
              shouldIncrement = true;
            }
          }
          break;
        }

        case 'amount': {
          newValue = progress.current_value + (order_total ?? 0);
          shouldIncrement = true;
          break;
        }

        case 'wallet': {
          // Géré séparément (sur recharge wallet, pas commande)
          break;
        }

        case 'first_action': {
          // Parrainage — géré séparément
          break;
        }
      }

      if (!shouldIncrement) continue;

      const isCompleted = newValue >= challenge.target_value;

      // Mettre à jour la progression
      await supabase
        .from('challenge_progress')
        .update({
          current_value: newValue,
          streak_current: newStreak,
          last_increment_date: today,
          ...(isCompleted && !progress.completed_at ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', progress.id);

      // Si complété → créditer les points
      if (isCompleted && !progress.points_awarded) {
        // Marquer comme récompensé
        await supabase
          .from('challenge_progress')
          .update({ points_awarded: true })
          .eq('id', progress.id);

        // Créditer les points dans profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('loyalty_points, square_customer_id')
          .eq('id', user_id)
          .single();

        if (profile) {
          const newPts = (profile.loyalty_points ?? 0) + challenge.reward_points;
          await supabase
            .from('profiles')
            .update({ loyalty_points: newPts })
            .eq('id', user_id);

          // Transaction fidélité
          await supabase
            .from('loyalty_transactions')
            .insert({
              user_id,
              points: challenge.reward_points,
              type: 'earn',
              reason: `Défi complété : ${challenge.title}`,
            });

          // Square Loyalty adjust
          if (profile.square_customer_id) {
            try {
              const searchRes = await fetch(`${squareBaseUrl}/v2/loyalty/accounts/search`, {
                method: 'POST',
                headers: {
                  'Square-Version': '2025-01-23',
                  'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  query: { customer_ids: [profile.square_customer_id] },
                }),
              });
              const searchData = await searchRes.json();
              const loyaltyAccountId = searchData.loyalty_accounts?.[0]?.id;

              if (loyaltyAccountId) {
                await fetch(`${squareBaseUrl}/v2/loyalty/accounts/${loyaltyAccountId}/adjust`, {
                  method: 'POST',
                  headers: {
                    'Square-Version': '2025-01-23',
                    'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    idempotency_key: crypto.randomUUID(),
                    adjust_points: {
                      points: challenge.reward_points,
                      reason: `Défi complété : ${challenge.title}`,
                    },
                  }),
                });
              }
            } catch (e) {
              console.error('Square loyalty adjust for challenge (non-fatal):', e);
            }
          }
        }

        results.push({ challenge: challenge.title, completed: true, pointsAwarded: challenge.reward_points });
      } else {
        results.push({ challenge: challenge.title, completed: false, pointsAwarded: 0 });
      }
    }

    return new Response(JSON.stringify({ updated: results.length, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('challenge-check error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
