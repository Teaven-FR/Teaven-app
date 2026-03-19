// Hook utilisateur — centralise infos profil, fidélité et wallet
import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { mockUser } from '@/constants/mockData';
import type { User, LoyaltyInfo, WalletInfo } from '@/lib/types';

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

  // En mode invité ou non connecté, utiliser le mockUser
  const user = storeUser ?? mockUser;
  const isGuest = !isAuthenticated;

  // Infos fidélité calculées
  const loyalty: LoyaltyInfo = useMemo(() => {
    const points = user.loyaltyPoints;
    const level = getLoyaltyLevel(points);
    const progress = getLoyaltyProgress(points);

    const nextRewards: Record<string, string> = {
      Bronze: 'Boisson offerte à 200 pts',
      Argent: 'Dessert offert à 500 pts',
      Or: 'Boisson offerte à 1500 pts',
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
    transactions: [], // Sera chargé depuis Supabase plus tard
  }), [user.walletBalance, user.squareGiftCardId]);

  // Mise à jour du profil (mock pour l'instant)
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const { setUser } = useAuthStore.getState();
    if (storeUser) {
      setUser({ ...storeUser, ...updates } as User);
    }
  }, [storeUser]);

  // Recharger le wallet (mock pour l'instant)
  const rechargeWallet = useCallback(async (amount: number) => {
    const { setUser } = useAuthStore.getState();
    if (storeUser) {
      setUser({
        ...storeUser,
        walletBalance: storeUser.walletBalance + amount,
      } as User);
    }
  }, [storeUser]);

  return {
    user,
    isGuest,
    loyalty,
    wallet,
    updateProfile,
    rechargeWallet,
  };
}
