// Root layout — chargement des fonts, auth flow, providers
import React, { useState, useEffect } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from '@/components/layout/StatusBar';
import { ToastProvider } from '@/contexts/ToastContext';
import { useAuthStore } from '@/stores/authStore';
import { syncCatalog } from '@/lib/square';

const ONBOARDING_KEY = '@teaven/onboarding_completed';

// Error boundary pour afficher les erreurs runtime sur web
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Erreur</Text>
          <Text style={errorStyles.message}>{this.state.error.message}</Text>
          <Text style={errorStyles.stack}>
            {this.state.error.stack?.slice(0, 500)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/** Composant interne qui gère la navigation conditionnelle */
function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isGuest, isLoading } = useAuthStore();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Vérifier si l'onboarding a été fait
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((val) => setOnboardingDone(val === 'true'))
      .catch(() => setOnboardingDone(false));
  }, []);

  // Charger la session au lancement
  useEffect(() => {
    useAuthStore.getState().loadSession();
  }, []);

  // Synchroniser le catalogue Square → Supabase au démarrage
  useEffect(() => {
    syncCatalog().then((result) => {
      if (result.error) {
        console.log('Sync catalogue ignorée:', result.error);
      } else {
        console.log('Catalogue synchronisé:', result.data);
      }
    });
  }, []);

  // Redirection conditionnelle basée sur l'état auth
  useEffect(() => {
    if (onboardingDone === null || isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    // Si onboarding pas vu → /onboarding
    if (!onboardingDone && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    // Si pas authentifié et pas invité → /auth/login
    if (onboardingDone && !isAuthenticated && !isGuest && !inAuthGroup) {
      router.replace('/auth/login');
      return;
    }

    // Si authentifié ou invité et dans auth → /(tabs)
    if ((isAuthenticated || isGuest) && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isGuest, isLoading, onboardingDone, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen
        name="produit/[id]"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="article/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/otp" />
      <Stack.Screen
        name="order/[id]"
        options={{
          presentation: 'modal',
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="order-confirmation"
        options={{
          presentation: 'modal',
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="profil/informations"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="profil/adresses"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="profil/paiement"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="profil/cgu"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'BwModelica-Thin': require('@/assets/fonts/BwModelica-Thin.otf'),
    'BwModelica-Regular': require('@/assets/fonts/BwModelica-Regular.otf'),
    'BwModelica-Bold': require('@/assets/fonts/BwModelica-Bold.otf'),
    'JetBrains Mono': require('@/assets/fonts/JetBrainsMono-Regular.ttf'),
    'JetBrains Mono SemiBold': require('@/assets/fonts/JetBrainsMono-SemiBold.ttf'),
  });

  // Tant que les fonts ne sont pas prêtes
  const fontsReady = fontsLoaded || fontError || Platform.OS === 'web';
  if (!fontsReady) {
    return (
      <View style={loadingStyles.container}>
        <Text style={loadingStyles.text}>TEAVEN</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ToastProvider>
          <StatusBar />
          <RootNavigator />
        </ToastProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F1EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 32,
    letterSpacing: 6,
    color: '#6B8F71',
  },
});

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF0F0',
    padding: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#CC0000',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  stack: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
});
