// État d'authentification — Zustand store avec persistance
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { fetchCustomer, fetchLoyalty, fetchWalletBalance } from '@/lib/square';
import { mockUser } from '@/constants/mockData';
import type { User, LoyaltyLevel } from '@/lib/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  onboardingCompleted: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  completeOnboarding: () => Promise<void>;
  signInWithPhone: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;
  enterGuestMode: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  logout: () => void;
}

/** Récupère les données Square (client + fidélité) et enrichit le user */
async function enrichWithSquareData(user: User, accessToken?: string): Promise<User> {
  try {
    const customerResult = await fetchCustomer(user.phone, accessToken);
    const customer = customerResult.data?.customer;

    if (customer) {
      user = {
        ...user,
        squareCustomerId: customer.squareCustomerId,
        fullName: user.fullName || customer.fullName || '',
        email: user.email || customer.email || undefined,
      };

      const loyaltyResult = await fetchLoyalty(customer.squareCustomerId, accessToken);
      if (loyaltyResult.data) {
        user = {
          ...user,
          loyaltyPoints: loyaltyResult.data.points,
          loyaltyLevel: loyaltyResult.data.level as LoyaltyLevel,
        };
      }
    }
  } catch (err) {
    console.log('Square data enrichment skipped:', err);
  }
  return user;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isGuest: false,
      onboardingCompleted: false,

      setUser: (user: User | null) =>
        set({
          user,
          isAuthenticated: user !== null,
          isLoading: false,
          isGuest: false,
        }),

      setLoading: (isLoading: boolean) => set({ isLoading }),

      completeOnboarding: async () => {
        await AsyncStorage.setItem('@teaven/onboarding_completed', 'true');
        set({ onboardingCompleted: true });
      },

      // Envoyer un OTP par téléphone
      signInWithPhone: async (phone: string) => {
        set({ isLoading: true });
        try {
          const { error } = await supabase.auth.signInWithOtp({ phone });
          set({ isLoading: false });
          if (error) {
            console.error('OTP send error:', error.message);
            return { error: error.message };
          }
          return { error: null };
        } catch (err) {
          set({ isLoading: false });
          console.error('OTP send failed:', err);
          return { error: String(err) };
        }
      },

      // Vérifier le code OTP
      verifyOtp: async (phone: string, otp: string) => {
        set({ isLoading: true });
        try {
          // Mode développement : le code "000000" est toujours accepté
          if (otp === '000000') {
            const baseUser = { ...mockUser, phone };
            set({ user: baseUser, isAuthenticated: true, isLoading: false, isGuest: false });
            // Enrichir en arrière-plan avec les données Square
            enrichWithSquareData(baseUser).then((enriched) => {
              set({ user: enriched });
            });
            return true;
          }

          const { data, error } = await supabase.auth.verifyOtp({
            phone,
            token: otp,
            type: 'sms',
          });

          if (error || !data.session) {
            set({ isLoading: false });
            return false;
          }

          const session = data.session;

          // Lire le profil Supabase immédiatement après login
          let profileFullName = '';
          let profileSquareCustomerId: string | undefined;
          let profileLoyaltyPoints: number | undefined;
          let profileLoyaltyLevel: string | undefined;
          let profileWalletBalance: number | undefined;
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, square_customer_id, loyalty_points, loyalty_level, wallet_balance')
              .eq('id', session.user.id)
              .single();
            if (profile) {
              profileFullName = profile.full_name || '';
              profileSquareCustomerId = profile.square_customer_id || undefined;
              profileLoyaltyPoints = profile.loyalty_points ?? undefined;
              profileLoyaltyLevel = profile.loyalty_level ?? undefined;
              profileWalletBalance = profile.wallet_balance ?? undefined;
            }
          } catch { /* profil peut ne pas exister encore */ }

          const baseUser: User = {
            id: session.user.id,
            fullName: profileFullName || session.user.user_metadata?.full_name || '',
            phone: session.user.phone ?? phone,
            email: session.user.email,
            dietaryPreferences: [],
            loyaltyPoints: profileLoyaltyPoints ?? 0,
            loyaltyLevel: (profileLoyaltyLevel ?? 'Première Parenthèse') as LoyaltyLevel,
            walletBalance: profileWalletBalance ?? 0,
            squareCustomerId: profileSquareCustomerId,
            createdAt: session.user.created_at,
            updatedAt: new Date().toISOString(),
          };
          set({ user: baseUser, isAuthenticated: true, isLoading: false, isGuest: false });
          enrichWithSquareData(baseUser, session.access_token).then(async (enriched) => {
            set({ user: enriched });
            // Persister dans Supabase les données récupérées depuis Square
            try {
              const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
              if (enriched.fullName) updates.full_name = enriched.fullName;
              if (enriched.squareCustomerId) updates.square_customer_id = enriched.squareCustomerId;
              if (enriched.loyaltyPoints !== undefined) updates.loyalty_points = enriched.loyaltyPoints;
              if (enriched.loyaltyLevel) updates.loyalty_level = enriched.loyaltyLevel;
              await supabase
                .from('profiles')
                .upsert({ id: session.user.id, ...updates }, { onConflict: 'id' });
            } catch { /* non bloquant */ }
          });
          return true;
        } catch (err) {
          console.log('verifyOtp error:', err);
          set({ isLoading: false });
          return false;
        }
      },

      // Déconnexion
      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignorer l'erreur si Supabase n'est pas configuré
        }
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isGuest: false,
        });
      },

      // Charger la session depuis AsyncStorage / Supabase
      loadSession: async () => {
        set({ isLoading: true });
        // Charger le flag onboarding
        try {
          const onboarding = await AsyncStorage.getItem('@teaven/onboarding_completed');
          if (onboarding === 'true') set({ onboardingCompleted: true });
        } catch {}
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const persistedUser = get().user;

          if (session?.user) {
            // Lire le profil Supabase directement (JWT valide → RLS autorisée)
            let profileFullName = '';
            let profileSquareCustomerId: string | undefined;
            let profileLoyaltyPoints: number | undefined;
            let profileLoyaltyLevel: string | undefined;
            let profileWalletBalance: number | undefined;
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, square_customer_id, loyalty_points, loyalty_level, wallet_balance')
                .eq('id', session.user.id)
                .single();
              if (profile) {
                profileFullName = profile.full_name || '';
                profileSquareCustomerId = profile.square_customer_id || undefined;
                profileLoyaltyPoints = profile.loyalty_points ?? undefined;
                profileLoyaltyLevel = profile.loyalty_level ?? undefined;
                profileWalletBalance = profile.wallet_balance ?? undefined;
              }
            } catch { /* ignore si la table n'a pas encore de ligne */ }

            // Fusionner : profil Supabase > persisté > metadata Supabase
            const baseUser: User = {
              id: session.user.id,
              fullName: profileFullName || persistedUser?.fullName || session.user.user_metadata?.full_name || '',
              phone: session.user.phone ?? persistedUser?.phone ?? '',
              email: session.user.email || persistedUser?.email,
              dietaryPreferences: persistedUser?.dietaryPreferences ?? [],
              loyaltyPoints: profileLoyaltyPoints ?? persistedUser?.loyaltyPoints ?? 0,
              loyaltyLevel: (profileLoyaltyLevel ?? persistedUser?.loyaltyLevel ?? 'Première Parenthèse') as LoyaltyLevel,
              walletBalance: profileWalletBalance ?? persistedUser?.walletBalance ?? 0,
              squareCustomerId: profileSquareCustomerId || persistedUser?.squareCustomerId,
              squareGiftCardId: persistedUser?.squareGiftCardId,
              createdAt: session.user.created_at,
              updatedAt: new Date().toISOString(),
            };
            set({ user: baseUser, isAuthenticated: true, isLoading: false });
            // Rafraîchir les données Square en arrière-plan
            enrichWithSquareData(baseUser, session.access_token).then(async (enriched) => {
              set({ user: enriched });
              // Synchroniser le solde wallet depuis Square Gift Cards
              fetchWalletBalance(session.access_token).then((walletResult) => {
                if (walletResult.data?.success) {
                  set((s) => ({
                    user: s.user ? { ...s.user, walletBalance: walletResult.data!.balance } : s.user,
                  }));
                }
              });
              // Persister dans Supabase les données récupérées depuis Square
              try {
                const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
                if (enriched.fullName) updates.full_name = enriched.fullName;
                if (enriched.squareCustomerId) updates.square_customer_id = enriched.squareCustomerId;
                if (enriched.loyaltyPoints !== undefined) updates.loyalty_points = enriched.loyaltyPoints;
                if (enriched.loyaltyLevel) updates.loyalty_level = enriched.loyaltyLevel;
                if (enriched.walletBalance !== undefined) updates.wallet_balance = enriched.walletBalance;
                await supabase
                  .from('profiles')
                  .upsert({ id: session.user.id, ...updates }, { onConflict: 'id' });
              } catch { /* non bloquant */ }
            });
          } else if (persistedUser) {
            // Pas de session Supabase mais un user persisté → rafraîchir Square
            set({ isLoading: false });
            enrichWithSquareData(persistedUser).then((enriched) => {
              set({ user: enriched });
            });
          } else {
            set({ isLoading: false });
          }
        } catch {
          // Supabase non configuré : garder l'état existant
          set({ isLoading: false });
        }
      },

      // Mode invité
      enterGuestMode: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isGuest: true,
        }),

      // Mise à jour du profil
      updateProfile: async (updates: Partial<User>) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...updates, updatedAt: new Date().toISOString() } });
      },

      // Alias pour la déconnexion (compatibilité)
      logout: () => {
        void get().signOut();
      },
    }),
    {
      name: '@teaven/auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
        onboardingCompleted: state.onboardingCompleted,
      }),
    },
  ),
);
