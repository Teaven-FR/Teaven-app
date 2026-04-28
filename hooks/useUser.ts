// Hook utilisateur — centralise infos profil, fidélité et wallet
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { fetchCustomer, fetchLoyalty, callEdgeFunction } from '@/lib/square';
import { mockUser } from '@/constants/mockData';
import type { User, LoyaltyLevel, LoyaltyInfo, WalletInfo, Reward } from '@/lib/types';

// Seuils du programme Les Parenthèses
const LOYALTY_THRESHOLDS: Record<string, number> = {
  'Première Parenthèse': 0,
  'Habitude': 2000,
  'Rituel': 5000,
  'Sérénité': 10000,
  'Essentia': 20000,
};

// Multiplicateurs de points par niveau (base = 10 pts/€)
export const LEVEL_MULTIPLIERS: Record<string, number> = {
  'Première Parenthèse': 1,
  'Habitude': 1,
  'Rituel': 1.5,
  'Sérénité': 1.7,
  'Essentia': 2,
};

const LOYALTY_ORDER = ['Première Parenthèse', 'Habitude', 'Rituel', 'Sérénité', 'Essentia'] as const;

/** Calcule le niveau de fidélité à partir des points */
function getLoyaltyLevel(points: number): LoyaltyLevel {
  if (points >= 20000) return 'Essentia';
  if (points >= 10000) return 'Sérénité';
  if (points >= 5000) return 'Rituel';
  if (points >= 2000) return 'Habitude';
  return 'Première Parenthèse';
}

/** Calcule la progression vers le prochain palier */
function getLoyaltyProgress(points: number): number {
  const level = getLoyaltyLevel(points);
  const currentIdx = LOYALTY_ORDER.indexOf(level);
  const nextIdx = currentIdx + 1;

  if (nextIdx >= LOYALTY_ORDER.length) return 100; // Essentia = max

  const currentThreshold = LOYALTY_THRESHOLDS[level];
  const nextThreshold = LOYALTY_THRESHOLDS[LOYALTY_ORDER[nextIdx]];
  const progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(Math.round(progress), 100);
}

export function useUser() {
  const storeUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [remoteRewards, setRemoteRewards] = useState<Reward[]>([]);
  const [loyaltyAccountId, setLoyaltyAccountId] = useState<string | null>(null);
  const [accrualRules, setAccrualRules] = useState<Array<{ type: string; points: number; spendAmount?: number }>>([]);
  const [walletLoading, setWalletLoading] = useState(true);

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
    if (!isAuthenticated) { setWalletLoading(false); return; }
    setWalletLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) { setWalletLoading(false); return; }
      const storeUser = useAuthStore.getState().user;
      callEdgeFunction<{ success: boolean; balance: number; giftCardId?: string }>(
        'manage-wallet',
        { action: 'balance', userId: session.user?.id, phone: storeUser?.phone },
        session.access_token,
      ).then((result) => {
        // eslint-disable-next-line no-console
        console.log('[useUser][wallet] manage-wallet response:', JSON.stringify(result, null, 2));
        // eslint-disable-next-line no-console
        console.log('[useUser][wallet] storeUser before update:', {
          walletBalance: useAuthStore.getState().user?.walletBalance,
          squareCustomerId: useAuthStore.getState().user?.squareCustomerId,
          squareGiftCardId: useAuthStore.getState().user?.squareGiftCardId,
          phone: useAuthStore.getState().user?.phone,
        });
        if (result.error) { setWalletLoading(false); return; }
        if (result.data?.success) {
          const { setUser } = useAuthStore.getState();
          const current = useAuthStore.getState().user;
          if (current) {
            const updates: Partial<User> = {};
            if (result.data.balance !== current.walletBalance) updates.walletBalance = result.data.balance;
            if (result.data.giftCardId && result.data.giftCardId !== current.squareGiftCardId) updates.squareGiftCardId = result.data.giftCardId;
            if (Object.keys(updates).length > 0) {
              // eslint-disable-next-line no-console
              console.log('[useUser][wallet] applying updates:', updates);
              setUser({ ...current, ...updates });
            }
          }
        }
        setWalletLoading(false);
      });
    });
  }, [isAuthenticated]);

  // Charger les données de fidélité depuis Square si connecté
  // Fallback : charger depuis Supabase si pas de squareCustomerId
  useEffect(() => {
    if (!isAuthenticated) return;

    if (user.squareCustomerId) {
      // Route principale : Square Loyalty API
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
          if (result.data.loyaltyAccountId) {
            setLoyaltyAccountId(result.data.loyaltyAccountId);
          }
          if (result.data.accrualRules) {
            setAccrualRules(result.data.accrualRules);
          }
        }
      });
    }
    // Pas de fallback Supabase : si pas de squareCustomerId, les points restent
    // indéterminés. Doctrine Square = source de vérité : mieux ne rien afficher
    // qu'un chiffre stocké dans Supabase qui pourrait diverger de Square.
  }, [isAuthenticated, user.squareCustomerId]);

  // Infos fidélité calculées
  const loyalty: LoyaltyInfo = useMemo(() => {
    const points = user.loyaltyPoints;
    const level = getLoyaltyLevel(points);
    const progress = getLoyaltyProgress(points);

    const nextRewards: Record<string, string> = {
      'Première Parenthèse': 'Boisson offerte à 2 000 pts',
      'Habitude': 'Plat offert à 5 000 pts',
      'Rituel': '-5% permanent à 10 000 pts',
      'Sérénité': 'Le Cercle Intérieur à 20 000 pts',
      'Essentia': 'Le Cercle Intérieur — ×2 pts',
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

  // Mise à jour du profil — store local + Supabase (champs non-financiers uniquement).
  // Doctrine : wallet_balance et loyalty_points NE SONT PLUS écrits depuis le client.
  // Source de vérité = Square ; cache Supabase mis à jour uniquement par les edge functions.
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const { setUser } = useAuthStore.getState();
    if (storeUser) {
      setUser({ ...storeUser, ...updates } as User);
    }

    // Persister dans Supabase profiles (champs profil uniquement)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const dbFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (updates.fullName !== undefined) dbFields.full_name = updates.fullName;
        if (updates.email !== undefined) dbFields.email = updates.email;
        if (updates.dietaryPreferences !== undefined) dbFields.dietary_preferences = updates.dietaryPreferences;
        // NE PAS écrire loyalty_points, wallet_balance, loyalty_level : Square = source de vérité
        await supabase
          .from('profiles')
          .upsert({ id: session.user.id, ...dbFields }, { onConflict: 'id' });
      }
    } catch { /* non bloquant */ }
  }, [storeUser]);

  // Rafraîchir le solde wallet depuis Square (source de vérité).
  // Appelé après une recharge réussie ou un paiement pour sync le cache local.
  // Le paramètre `amount` est ignoré (rétrocompat API) — on relit toujours Square.
  const refreshWallet = useCallback(async (_ignored?: number) => {
    if (!isAuthenticated) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const result = await callEdgeFunction<{ success: boolean; balance: number; giftCardId?: string }>(
        'manage-wallet',
        { action: 'balance' },
        session.access_token,
      );
      if (result.data?.success) {
        const { setUser } = useAuthStore.getState();
        const current = useAuthStore.getState().user;
        if (current) {
          const updates: Partial<User> = {};
          if (result.data.balance !== current.walletBalance) updates.walletBalance = result.data.balance;
          if (result.data.giftCardId && result.data.giftCardId !== current.squareGiftCardId) {
            updates.squareGiftCardId = result.data.giftCardId;
          }
          if (Object.keys(updates).length > 0) setUser({ ...current, ...updates });
        }
      }
    } catch { /* non bloquant */ }
  }, [isAuthenticated]);

  // Alias de compat — même signature qu'avant, mais re-fetch Square au lieu d'ajouter.
  const rechargeWallet = refreshWallet;

  return {
    user,
    isGuest,
    loyalty,
    loyaltyAccountId,
    wallet,
    walletLoading,
    rewards: remoteRewards,
    accrualRules,
    updateProfile,
    rechargeWallet,
    refreshWallet,
  };
}
