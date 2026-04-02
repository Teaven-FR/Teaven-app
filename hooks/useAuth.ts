// Hook d'authentification — wrapper autour de authStore
// Conservé pour compatibilité, authStore est maintenant le source of truth
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    // Vérifier la session active au montage
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            fullName: session.user.user_metadata?.full_name ?? '',
            phone: session.user.phone ?? '',
            email: session.user.email,
            dietaryPreferences: [],
            loyaltyPoints: 0,
            loyaltyLevel: 'Première Parenthèse',
            walletBalance: 0,
            createdAt: session.user.created_at,
            updatedAt: new Date().toISOString(),
          });
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };

    checkSession();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          fullName: session.user.user_metadata?.full_name ?? '',
          phone: session.user.phone ?? '',
          email: session.user.email,
          dietaryPreferences: [],
          loyaltyPoints: 0,
          loyaltyLevel: 'Première Parenthèse',
          walletBalance: 0,
          createdAt: session.user.created_at,
          updatedAt: new Date().toISOString(),
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
    // Only run once on mount — setUser/setLoading are stable store refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Envoyer un OTP par SMS */
  const sendOtp = async (phone: string) => {
    return useAuthStore.getState().signInWithPhone(phone);
  };

  /** Vérifier le code OTP */
  const verifyOtp = async (phone: string, token: string) => {
    return useAuthStore.getState().verifyOtp(phone, token);
  };

  /** Déconnexion */
  const signOut = async () => {
    await useAuthStore.getState().signOut();
  };

  return { user, isAuthenticated, isLoading, sendOtp, verifyOtp, signOut };
}
