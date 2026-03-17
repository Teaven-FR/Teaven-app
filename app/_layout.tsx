// Root layout — chargement des fonts Bw Modelica et providers
import { useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from '@/components/layout/StatusBar';

// Empêcher le splash screen de se cacher tant que les fonts ne sont pas prêtes
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'BwModelica-Thin': require('@/assets/fonts/BwModelica-Thin.otf'),
    'BwModelica-Regular': require('@/assets/fonts/BwModelica-Regular.otf'),
    'BwModelica-Bold': require('@/assets/fonts/BwModelica-Bold.otf'),
  });

  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayoutReady();
  }, [onLayoutReady]);

  // Tant que les fonts ne sont pas chargées, ne rien rendre (splash screen natif affiché)
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar />
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
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/otp" />
      </Stack>
    </GestureHandlerRootView>
  );
}
