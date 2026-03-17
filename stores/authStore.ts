// État d'authentification — Zustand store
import { create } from 'zustand';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user: User | null) =>
    set({ user, isAuthenticated: user !== null, isLoading: false }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
}));
