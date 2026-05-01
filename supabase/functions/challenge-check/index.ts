// Edge Function — Vérifier et avancer la progression des défis après une commande
// Appelée par square-webhook quand une commande est payée
// POST { user_id, order_total, line_items?, order_time? }
//
// Types de défis supportés :
//   morning_bonus     — bonus récurrent à chaque commande avant 11h
//   category          — commander un produit d'une catégorie (one-shot ou récurrent)
//   category_distinct — commander N produits DIFFÉRENTS d'une catégorie
//   referral          — parrainage (géré par un appel séparé, pas ici)
//   streak / frequency / amount / wallet — hérités, conservés pour compatibilité

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

/** Sync bonus points to Square Loyalty via /adjust */
async function syncPointsToSquare(squareCustomerId: string, points: number, reason: string) {
  try {
    const searchRes = await fetch(`${squareBaseUrl}/v2/loyalty/accounts/search`, {
      method: 'POST',
      headers: {
        'Square-Version': '2025-01-23',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: { customer_ids: [squareCustomerId] } }),
    });
    const searchData = await searchRes.json();
    const loyaltyAccountId = searchData.loyalty_accounts?.[0]?.id;
    if (!loyaltyAccountId) return;

    await fetch(`${squareBaseUrl}/v2/loyalty/accounts/${loyaltyAccountId}/adjust`, {
      method: 'POST',
      headers: {
        'Square-Version': '2025-01-23',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        adjust_points: { points, reason },
      }),
    });
  } catch (e) {
    console.error('Square loyalty adjust (non-fatal):', e);
  }
}

/** Créditer les points dans Supabase profiles + loyalty_transactions + Square */
async function awardPoints(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  points: number,
  reason: string,
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('loyalty_points, square_customer_id')
    .eq('id', userId)
    .single();

  if (!profile) return;

  const newPts = (profile.loyalty_points ?? 0) + points;
  await supabase.from('profiles').update({ loyalty_points: newPts }).eq('id', userId);
  await supabase.from('loyalty_transactions').insert({
    user_id: userId,
    points,
    type: 'earn',
    reason,
  });

  if (profile.square_customer_id) {
    await syncPointsToSquare(profile.square_customer_id, points, reason);
  }
}

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
    const currentMonth = today.slice(0, 7); // YYYY-MM

    // Heure de la commande en TZ Europe/Paris (Deno tourne en UTC par défaut).
    // Important pour `morning_bonus` : la fenêtre est définie en heure locale boutique.
    const orderDate = order_time ? new Date(order_time) : new Date();
    const orderHour = parseInt(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Paris',
        hour: 'numeric',
        hourCycle: 'h23',
      }).format(orderDate),
      10,
    );

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
      (existingProgress ?? []).map((p: { challenge_id: string }) => [p.challenge_id, p]),
    );

    // Map d'ID défi → progression complétée (pour vérifier les prérequis)
    const completedChallengeIds = new Set(
      (existingProgress ?? [])
        .filter((p: { completed_at: string | null; points_awarded: boolean }) => p.completed_at && p.points_awarded)
        .map((p: { challenge_id: string }) => p.challenge_id),
    );

    const results: Array<{ challenge: string; completed: boolean; pointsAwarded: number }> = [];

    for (const challenge of activeChallenges) {
      // Vérifier le prérequis
      if (challenge.prerequisite_challenge_id && !completedChallengeIds.has(challenge.prerequisite_challenge_id)) {
        continue;
      }

      let progress = progressMap.get(challenge.id) as {
        id: string;
        current_value: number;
        streak_current: number;
        last_increment_date: string | null;
        completed_at: string | null;
        points_awarded: boolean;
        distinct_items: string[];
      } | undefined;

      // Créer la progression si elle n'existe pas
      if (!progress) {
        const { data: newProgress } = await supabase
          .from('challenge_progress')
          .insert({ user_id, challenge_id: challenge.id, current_value: 0, streak_current: 0, distinct_items: [] })
          .select()
          .single();
        if (!newProgress) continue;
        progress = newProgress;
      }

      // Reset mensuel pour les défis category_distinct récurrents mensuels
      if (
        challenge.type === 'category_distinct' &&
        challenge.recurrence === 'monthly' &&
        progress.last_increment_date &&
        progress.last_increment_date.slice(0, 7) !== currentMonth
      ) {
        // Nouveau mois → réinitialiser la progression
        await supabase
          .from('challenge_progress')
          .update({
            current_value: 0,
            distinct_items: [],
            completed_at: null,
            points_awarded: false,
            last_increment_date: null,
          })
          .eq('id', progress.id);
        progress = { ...progress, current_value: 0, distinct_items: [], completed_at: null, points_awarded: false, last_increment_date: null };
      }

      // Ignorer les défis déjà complétés et récompensés (sauf récurrents type morning_bonus)
      if (challenge.type !== 'morning_bonus' && progress.completed_at && progress.points_awarded) continue;

      let shouldIncrement = false;
      let newValue = progress.current_value;
      let newStreak = progress.streak_current;
      let newDistinctItems = [...(progress.distinct_items ?? [])];

      switch (challenge.type) {
        // ── Bonus récurrent commande du matin ──
        case 'morning_bonus': {
          // Créneau matinal Teaven : 8h-11h heure de Paris (boutique).
          if (orderHour >= 8 && orderHour < 11) {
            // Bonus direct — pas de "completion", juste award à chaque commande qualifiante
            await awardPoints(supabase, user_id, challenge.reward_points, `Défi : ${challenge.title}`);
            // Incrémenter le compteur pour l'affichage
            newValue = progress.current_value + 1;
            await supabase
              .from('challenge_progress')
              .update({ current_value: newValue, last_increment_date: today })
              .eq('id', progress.id);
            results.push({ challenge: challenge.title, completed: true, pointsAwarded: challenge.reward_points });
          }
          // Ne pas continuer dans la logique d'incrémentation classique
          continue;
        }

        // ── Catégorie simple (1 produit de la catégorie) ──
        case 'category': {
          if (line_items && challenge.target_category) {
            const hasCategory = line_items.some(
              (item: { name?: string; category?: string }) =>
                (item.name ?? '').toLowerCase().includes(challenge.target_category!.toLowerCase()) ||
                (item.category ?? '').toLowerCase().includes(challenge.target_category!.toLowerCase()),
            );
            if (hasCategory) {
              newValue = progress.current_value + 1;
              shouldIncrement = true;
            }
          }
          break;
        }

        // ── Catégorie distinct (N produits DIFFÉRENTS de la catégorie) ──
        case 'category_distinct': {
          if (line_items && challenge.target_category) {
            const matchingItems = line_items.filter(
              (item: { name?: string; category?: string }) =>
                (item.name ?? '').toLowerCase().includes(challenge.target_category!.toLowerCase()) ||
                (item.category ?? '').toLowerCase().includes(challenge.target_category!.toLowerCase()),
            );
            for (const item of matchingItems) {
              const itemKey = (item.name ?? '').toLowerCase().trim();
              if (itemKey && !newDistinctItems.includes(itemKey)) {
                newDistinctItems.push(itemKey);
                newValue = newDistinctItems.length;
                shouldIncrement = true;
              }
            }
          }
          break;
        }

        // ── Types hérités (compatibilité anciens défis) ──
        case 'streak': {
          const lastDate = progress.last_increment_date;
          if (lastDate === today) break;
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          if (lastDate === yesterdayStr) {
            newStreak = progress.streak_current + 1;
          } else {
            newStreak = 1;
          }
          newValue = newStreak;
          shouldIncrement = true;
          break;
        }

        case 'frequency': {
          if (challenge.title.includes('matin') && orderHour >= 11) break;
          newValue = progress.current_value + 1;
          shouldIncrement = true;
          break;
        }

        case 'amount': {
          newValue = progress.current_value + (order_total ?? 0);
          shouldIncrement = true;
          break;
        }

        case 'wallet':
        case 'first_action':
        case 'referral':
          // Gérés séparément (pas dans le flux commande)
          break;
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
          distinct_items: newDistinctItems,
          ...(isCompleted && !progress.completed_at ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', progress.id);

      // Si complété → créditer les points
      if (isCompleted && !progress.points_awarded) {
        await supabase
          .from('challenge_progress')
          .update({ points_awarded: true })
          .eq('id', progress.id);

        await awardPoints(supabase, user_id, challenge.reward_points, `Défi complété : ${challenge.title}`);
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
