// Helper : Live Activity Teaven (iOS) — TEMPORAIREMENT DÉSACTIVÉ.
//
// La lib `expo-live-activity` est désinstallée pour le build #16 (mosaïque
// défis livrée sans Live Activity). À réactiver dès que les credentials
// Widget Extension iOS sont configurés (interactive eas build).
//
// Toutes les fonctions sont des no-op silencieux pour ne pas casser
// l'intégration dans ActiveOrderProvider.

export interface OrderActivityState {
  orderId: string;
  title: string;
  subtitle: string;
  progress: number;
  etaTimestamp?: number;
}

export async function startOrderActivity(_s: OrderActivityState): Promise<string | undefined> {
  return undefined;
}

export async function updateOrderActivity(_s: OrderActivityState): Promise<void> {
  // no-op
}

export async function stopOrderActivity(
  _orderId: string,
  _finalState: { title: string; subtitle: string; progress: number },
): Promise<void> {
  // no-op
}
