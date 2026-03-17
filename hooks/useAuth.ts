// Hook d'authentification — gère login OTP via Supabase
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    // Vérifier la session active au montage
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name ?? '',
          phone: session.user.phone ?? '',
          loyaltyPoints: 0,
          loyaltyLevel: 'Bronze',
          walletBalance: 0,
        });
      } else {
        setUser(null);
      }
    };

    checkSession();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name ?? '',
          phone: session.user.phone ?? '',
          loyaltyPoints: 0,
          loyaltyLevel: 'Bronze',
          walletBalance: 0,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  /** Envoyer un OTP par SMS */
  const sendOtp = async (phone: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    return { error };
  };

  /** Vérifier le code OTP */
  const verifyOtp = async (phone: string, token: string) => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    setLoading(false);
    return { error };
  };

  /** Déconnexion */
  const signOut = async () => {
    await supabase.auth.signOut();
    logout();
  };

  return { user, isAuthenticated, isLoading, sendOtp, verifyOtp, signOut };
}
