// Hook — Défis réels depuis Supabase (challenges + challenge_progress)
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export interface ChallengeRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  target_value: number;
  target_category: string | null;
  reward_points: number;
  difficulty: string;
  is_recurring: boolean;
  recurrence: string | null;
  icon: string;
  ui_category: string;
  prerequisite_challenge_id: string | null;
}

export interface ChallengeProgressRow {
  id: string;
  challenge_id: string;
  current_value: number;
  streak_current: number;
  completed_at: string | null;
  points_awarded: boolean;
  distinct_items: string[];
}

export interface Challenge {
  id: string;
  icon: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  type: string;
  uiCategory: string;
  isRecurring: boolean;
  claimed: boolean;
  completed: boolean;
  locked: boolean; // true si le prérequis n'est pas rempli
}

export function useChallenges() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!isAuthenticated) {
      setChallenges([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const userId = session.user.id;

      // Fetch challenges + user progress in parallel
      const [challengesRes, progressRes] = await Promise.all([
        supabase.from('challenges').select('*').eq('is_active', true),
        supabase.from('challenge_progress').select('*').eq('user_id', userId),
      ]);

      const rows = (challengesRes.data ?? []) as ChallengeRow[];
      const progressRows = (progressRes.data ?? []) as ChallengeProgressRow[];
      const progressMap = new Map(progressRows.map((p) => [p.challenge_id, p]));

      // Set of completed challenge IDs (for prerequisite checks)
      const completedIds = new Set(
        progressRows
          .filter((p) => p.completed_at && p.points_awarded)
          .map((p) => p.challenge_id),
      );

      const mapped: Challenge[] = rows.map((ch) => {
        const prog = progressMap.get(ch.id);
        const locked = !!ch.prerequisite_challenge_id && !completedIds.has(ch.prerequisite_challenge_id);
        const completed = !!prog?.completed_at;
        const claimed = !!prog?.points_awarded && completed;

        // For morning_bonus (recurring), progress is cumulative count
        let progressValue = prog?.current_value ?? 0;
        let target = ch.target_value;

        // morning_bonus has no "completion" — show cumulative count, target = 1 for display
        if (ch.type === 'morning_bonus') {
          target = 1; // display as "ongoing"
        }

        return {
          id: ch.id,
          icon: ch.icon ?? 'trophy',
          title: ch.title,
          description: ch.description ?? '',
          progress: progressValue,
          target,
          reward: ch.reward_points,
          type: ch.type,
          uiCategory: ch.ui_category ?? 'fidelite',
          isRecurring: ch.is_recurring,
          claimed,
          completed,
          locked,
        };
      });

      setChallenges(mapped);
    } catch (e) {
      console.error('useChallenges fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetch(); }, [fetch]);

  return { challenges, loading, refetch: fetch };
}
