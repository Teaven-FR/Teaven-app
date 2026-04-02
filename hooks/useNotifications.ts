// Hook — Enregistrement push token + gestion notifications
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// Config notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  } as Notifications.NotificationBehavior),
});

export function useNotifications() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const responseListener = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Enregistrer le push token
    void registerForPushNotifications(user.id);

    // Écouter les taps sur les notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.orderId) {
        router.push(`/order/${data.orderId}`);
      } else if (data?.screen) {
        router.push(data.screen as string);
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id, router]);
}

async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) return; // Pas de push en simulateur

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  // Android : configurer le channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Teaven',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-project-id', // TODO: remplacer par l'ID du projet Expo
  });

  // Sauvegarder dans Supabase
  await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: userId,
        expo_push_token: tokenData.data,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
}
