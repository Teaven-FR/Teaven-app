// État d'authentification — Zustand store avec persistance
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { fetchCustomer, fetchLoyalty } from '@/lib/square';
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
async function enrichWithSquareData(user: User): Promise<User> {
  try {
    // 1. Récupérer ou créer le client Square
    const customerResult = await fetchCustomer(user.phone);
    const customer = customerResult.data?.customer;

    if (customer) {
      user = {
        ...user,
        squareCustomerId: customer.squareCustomerId,
        fullName: user.fullName || customer.fullName || '',
        email: user.email || customer.email || undefined,
      };

      // 2. Récupérer les données de fidélité
      const loyaltyResult = await fetchLoyalty(customer.squareCustomerId);
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
          if (error) return { error: error.message };
          return { error: null };
        } catch {
          set({ isLoading: false });
          // Mode dev : simuler l'envoi
          return { error: null };
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

          const { error } = await supabase.auth.verifyOtp({
            phone,
            token: otp,
            type: 'sms',
          });

          if (error) {
            set({ isLoading: false });
            return false;
          }

          // Récupérer les infos utilisateur depuis Supabase
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const baseUser: User = {
              id: session.user.id,
              fullName: session.user.user_metadata?.full_name ?? '',
              phone: session.user.phone ?? phone,
              email: session.user.email,
              dietaryPreferences: [],
              loyaltyPoints: 0,
              loyaltyLevel: 'Bronze',
              walletBalance: 0,
              createdAt: session.user.created_at,
              updatedAt: new Date().toISOString(),
            };
            set({ user: baseUser, isAuthenticated: true, isLoading: false, isGuest: false });
            // Enrichir avec les données Square
            enrichWithSquareData(baseUser).then((enriched) => {
              set({ user: enriched });
            });
          }
          return true;
        } catch {
          // Mode dev : accepter le code mock
          if (otp === '000000') {
            set({
              user: { ...mockUser, phone },
              isAuthenticated: true,
              isLoading: false,
              isGuest: false,
            });
            return true;
          }
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
          if (session?.user) {
            set({
              user: {
                id: session.user.id,
                fullName: session.user.user_metadata?.full_name ?? '',
                phone: session.user.phone ?? '',
                email: session.user.email,
                dietaryPreferences: [],
                loyaltyPoints: 0,
                loyaltyLevel: 'Bronze',
                walletBalance: 0,
                createdAt: session.user.created_at,
                updatedAt: new Date().toISOString(),
              },
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Vérifier si on a un user persisté
            const state = get();
            if (!state.user) {
              set({ isLoading: false });
            } else {
              set({ isLoading: false });
            }
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
        get().signOut();
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
