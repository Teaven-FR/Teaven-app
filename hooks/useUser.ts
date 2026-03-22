// Hook utilisateur — centralise infos profil, fidélité et wallet
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { fetchCustomer, fetchLoyalty, fetchWalletBalance } from '@/lib/square';
import { mockUser } from '@/constants/mockData';
import type { User, LoyaltyLevel, LoyaltyInfo, WalletInfo, Reward } from '@/lib/types';

// Seuils de fidélité
const LOYALTY_THRESHOLDS = {
  Bronze: 0,
  Argent: 200,
  Or: 500,
  Platine: 1000,
} as const;

/** Calcule le niveau de fidélité à partir des points */
function getLoyaltyLevel(points: number): User['loyaltyLevel'] {
  if (points >= LOYALTY_THRESHOLDS.Platine) return 'Platine';
  if (points >= LOYALTY_THRESHOLDS.Or) return 'Or';
  if (points >= LOYALTY_THRESHOLDS.Argent) return 'Argent';
  return 'Bronze';
}

/** Calcule la progression vers le prochain palier */
function getLoyaltyProgress(points: number): number {
  const level = getLoyaltyLevel(points);
  const thresholds = Object.values(LOYALTY_THRESHOLDS);
  const currentIdx = Object.keys(LOYALTY_THRESHOLDS).indexOf(level);
  const nextIdx = currentIdx + 1;

  if (nextIdx >= thresholds.length) return 100; // Platine = max

  const currentThreshold = thresholds[currentIdx];
  const nextThreshold = thresholds[nextIdx];
  const progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(Math.round(progress), 100);
}

export function useUser() {
  const storeUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [remoteRewards, setRemoteRewards] = useState<Reward[]>([]);
  const [accrualRules, setAccrualRules] = useState<Array<{ type: string; points: number; spendAmount?: number }>>([]);

  // En mode invité ou non connecté, utiliser le mockUser
  const user = storeUser ?? mockUser;
  const isGuest = !isAuthenticated;

  // Charger le profil Square si nom ou customerId manquant
  useEffect(() => {
    if (!isAuthenticated || !user.phone) return;
    if (user.fullName && user.squareCustomerId) return;

    // Passer le token pour que fetch-customer puisse mettre à jour profiles
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchCustomer(user.phone, session?.access_token).then((result) => {
        if (result.data?.customer) {
          const { updateProfile } = useAuthStore.getState();
          updateProfile({
            fullName: result.data.customer.fullName || user.fullName,
            squareCustomerId: result.data.customer.squareCustomerId,
            email: result.data.customer.email || user.email,
          });
        }
      });
    });
  }, [isAuthenticated, user.phone, user.fullName, user.squareCustomerId]);

  // Charger le solde wallet depuis Square Gift Cards au montage
  useEffect(() => {
    if (!isAuthenticated) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return;
      fetchWalletBalance(session.access_token).then((result) => {
        if (result.data?.success && result.data.balance !== undefined) {
          const { setUser } = useAuthStore.getState();
          const current = useAuthStore.getState().user;
          if (current && result.data.balance !== current.walletBalance) {
            setUser({ ...current, walletBalance: result.data.balance });
          }
        }
      });
    });
  }, [isAuthenticated]);

  // Charger les données de fidélité depuis Square si connecté
  useEffect(() => {
    if (!user.squareCustomerId) return;
    fetchLoyalty(user.squareCustomerId, undefined, user.phone).then((result) => {
      if (result.data) {
        const { updateProfile } = useAuthStore.getState();
        if (result.data.points !== user.loyaltyPoints) {
          updateProfile({
            loyaltyPoints: result.data.points,
            loyaltyLevel: result.data.level as LoyaltyLevel,
          });
        }
        setRemoteRewards(
          result.data.rewards.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            pointsCost: r.pointsCost,
            icon: r.icon,
          })),
        );
        if (result.data.accrualRules) {
          setAccrualRules(result.data.accrualRules);
        }
      }
    });
  }, [user.squareCustomerId]);

  // Infos fidélité calculées
  const loyalty: LoyaltyInfo = useMemo(() => {
    const points = user.loyaltyPoints;
    const level = getLoyaltyLevel(points);
    const progress = getLoyaltyProgress(points);

    const nextRewards: Record<string, string> = {
      Bronze: 'Boisson offerte à 200 pts',
      Argent: 'Dessert offert à 500 pts',
      Or: 'Menu complet offert à 1000 pts',
      Platine: 'Vous êtes au niveau maximum !',
    };

    return {
      points,
      level,
      nextReward: nextRewards[level],
      progressPercent: progress,
    };
  }, [user.loyaltyPoints]);

  // Infos wallet
  const wallet: WalletInfo = useMemo(() => ({
    balance: user.walletBalance,
    giftCardId: user.squareGiftCardId,
    transactions: [],
  }), [user.walletBalance, user.squareGiftCardId]);

  // Mise à jour du profil — store local + Supabase
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const { setUser } = useAuthStore.getState();
    if (storeUser) {
      setUser({ ...storeUser, ...updates } as User);
    }

    // Persister dans Supabase profiles
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const dbFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (updates.fullName !== undefined) dbFields.full_name = updates.fullName;
        if (updates.email !== undefined) dbFields.email = updates.email;
        if (updates.dietaryPreferences !== undefined) dbFields.dietary_preferences = updates.dietaryPreferences;
        if (updates.loyaltyPoints !== undefined) dbFields.loyalty_points = updates.loyaltyPoints;
        if (updates.walletBalance !== undefined) dbFields.wallet_balance = updates.walletBalance;
        await supabase
          .from('profiles')
          .upsert({ id: session.user.id, ...dbFields }, { onConflict: 'id' });
      }
    } catch { /* non bloquant */ }
  }, [storeUser]);

  // Recharger le wallet — met à jour le store ET Supabase
  const rechargeWallet = useCallback(async (amount: number) => {
    const { setUser } = useAuthStore.getState();
    if (storeUser) {
      const newBalance = storeUser.walletBalance + amount;
      setUser({ ...storeUser, walletBalance: newBalance } as User);
      // Persister dans Supabase
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase
            .from('profiles')
            .upsert({ id: session.user.id, wallet_balance: newBalance, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        }
      } catch { /* non bloquant */ }
    }
  }, [storeUser]);

  return {
    user,
    isGuest,
    loyalty,
    wallet,
    rewards: remoteRewards,
    accrualRules,
    updateProfile,
    rechargeWallet,
  };
}
