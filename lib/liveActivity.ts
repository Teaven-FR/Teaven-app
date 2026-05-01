// Helper : Live Activity Teaven (iOS) — suivi de commande sur Lock Screen.
//
// Doctrine : la Live Activity est démarrée au paiement de la commande,
// mise à jour à chaque changement de statut, et terminée à la livraison.
// Cohérence visuelle avec le toast suivi : gradient vert Teaven.

import * as LiveActivity from 'expo-live-activity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TEAVEN_GREEN = '#75967F';
const TEAVEN_WHITE = '#FFFFFF';
const TEAVEN_WHITE_85 = 'rgba(255,255,255,0.85)';

const STORAGE_KEY = '@teaven/live_activity_ids';

interface StoredActivities {
  [orderId: string]: string;
}

async function getStored(): Promise<StoredActivities> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function setStored(map: StoredActivities): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch { /* non bloquant */ }
}

export interface OrderActivityState {
  orderId: string;
  title: string;
  subtitle: string;
  progress: number;
  etaTimestamp?: number;
}

export async function startOrderActivity(s: OrderActivityState): Promise<string | undefined> {
  if (Platform.OS !== 'ios') return undefined;
  try {
    const id = LiveActivity.startActivity(
      {
        title: s.title,
        subtitle: s.subtitle,
        progressBar: s.etaTimestamp
          ? { date: s.etaTimestamp }
          : { progress: Math.max(0.02, Math.min(1, s.progress)) },
      },
      {
        backgroundColor: TEAVEN_GREEN,
        titleColor: TEAVEN_WHITE,
        subtitleColor: TEAVEN_WHITE_85,
        progressViewTint: TEAVEN_WHITE,
        progressViewLabelColor: TEAVEN_WHITE,
        deepLinkUrl: `/delivery/${s.orderId}`,
        timerType: 'circular',
      },
    );
    if (id) {
      const map = await getStored();
      map[s.orderId] = id;
      await setStored(map);
    }
    return id ?? undefined;
  } catch (e) {
    console.warn('[LiveActivity] start error:', e);
    return undefined;
  }
}

export async function updateOrderActivity(s: OrderActivityState): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const map = await getStored();
    const id = map[s.orderId];
    if (!id) return;
    LiveActivity.updateActivity(id, {
      title: s.title,
      subtitle: s.subtitle,
      progressBar: s.etaTimestamp
        ? { date: s.etaTimestamp }
        : { progress: Math.max(0.02, Math.min(1, s.progress)) },
    });
  } catch (e) {
    console.warn('[LiveActivity] update error:', e);
  }
}

export async function stopOrderActivity(
  orderId: string,
  finalState: { title: string; subtitle: string; progress: number },
): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const map = await getStored();
    const id = map[orderId];
    if (!id) return;
    LiveActivity.stopActivity(id, {
      title: finalState.title,
      subtitle: finalState.subtitle,
      progressBar: { progress: Math.max(0.02, Math.min(1, finalState.progress)) },
    });
    delete map[orderId];
    await setStored(map);
  } catch (e) {
    console.warn('[LiveActivity] stop error:', e);
  }
}
