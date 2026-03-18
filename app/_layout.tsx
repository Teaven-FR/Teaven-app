// Root layout — chargement des fonts, onboarding check, providers
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from '@/components/layout/StatusBar';
import { ToastProvider } from '@/contexts/ToastContext';

const ONBOARDING_KEY = '@teaven/onboarding_completed';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'BwModelica-Thin': require('@/assets/fonts/BwModelica-Thin.otf'),
    'BwModelica-Regular': require('@/assets/fonts/BwModelica-Regular.otf'),
    'BwModelica-Bold': require('@/assets/fonts/BwModelica-Bold.otf'),
  });

  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Vérifier si l'onboarding a été fait
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((val) => {
        setOnboardingDone(val === 'true');
      })
      .catch(() => {
        // Fallback si AsyncStorage échoue (web)
        setOnboardingDone(false);
      });
  }, []);

  // Tant que les fonts ou l'état onboarding ne sont pas prêts
  // Sur web, on n'attend pas les fonts pour éviter un écran blanc
  const fontsReady = fontsLoaded || fontError || Platform.OS === 'web';
  if (!fontsReady || onboardingDone === null) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <StatusBar />
        <Stack screenOptions={{ headerShown: false }}>
          {!onboardingDone ? (
            <Stack.Screen name="onboarding" />
          ) : (
            <Stack.Screen name="(tabs)" />
          )}
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
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
            name="order-confirmation"
            options={{
              presentation: 'modal',
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
        </Stack>
      </ToastProvider>
    </GestureHandlerRootView>
  );
}
