import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveOrder } from '@/contexts/ActiveOrderContext';

/**
 * Padding top à appliquer au container racine d'un écran de l'app.
 * Quand le OrderTrackingBanner est visible, il consomme déjà le safe area top
 * (notch / dynamic island) — l'écran ne doit pas l'ajouter à nouveau.
 */
export function useScreenTopPadding(): number {
  const insets = useSafeAreaInsets();
  const { bannerHeight } = useActiveOrder();
  return bannerHeight > 0 ? 0 : insets.top;
}
