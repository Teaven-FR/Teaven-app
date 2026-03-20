// Hook utilisateur — centralise infos profil, fidélité et wallet
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { fetchLoyalty } from '@/lib/square';
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

  // En mode invité ou non connecté, utiliser le mockUser
  const user = storeUser ?? mockUser;
  const isGuest = !isAuthenticated;

  // Charger les données de fidélité depuis Square si connecté
  useEffect(() => {
    if (!user.squareCustomerId) return;
    fetchLoyalty(user.squareCustomerId).then((result) => {
      if (result.data) {
        // Mettre à jour les points en local si différents
        const { updateProfile } = useAuthStore.getState();
        if (result.data.points !== user.loyaltyPoints) {
          updateProfile({
            loyaltyPoints: result.data.points,
            loyaltyLevel: result.data.level as LoyaltyLevel,
          });
        }
        // Stocker les récompenses
        setRemoteRewards(
          result.data.rewards.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            pointsCost: r.pointsCost,
            icon: r.icon,
          })),
        );
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

  // Mise à jour du profil
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const { setUser } = useAuthStore.getState();
    if (storeUser) {
      setUser({ ...storeUser, ...updates } as User);
    }
  }, [storeUser]);

  // Recharger le wallet
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
    rewards: remoteRewards,
    updateProfile,
    rechargeWallet,
  };
}
