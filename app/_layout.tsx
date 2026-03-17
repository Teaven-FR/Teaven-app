// Root layout — chargement des fonts Bw Modelica et providers
import { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from '@/components/layout/StatusBar';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'BwModelica-Thin': require('@/assets/fonts/BwModelica-Thin.otf'),
    'BwModelica-Regular': require('@/assets/fonts/BwModelica-Regular.otf'),
    'BwModelica-Bold': require('@/assets/fonts/BwModelica-Bold.otf'),
  });

  // Tant que les fonts ne sont pas chargées, ne rien rendre
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
