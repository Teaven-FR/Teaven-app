// Banner suivi commande Teaven — overlay informationnel discret.
//
// Doctrine UX (révisée) :
// - Position absolute en haut, MASQUE le contenu derrière (overlay).
// - Compact uniquement, ne se déploie PAS.
// - Tap → navigation directe vers l'écran de suivi détaillé.
// - Couleur signature : gradient vert Teaven (cohérent bannière "Première commande").
// - Apparaît avec slide-down animé, disparaît avec slide-up.

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Truck, Package, ChevronRight, Clock } from 'lucide-react-native';
import { useActiveOrder } from '@/contexts/ActiveOrderContext';
import { colors, fonts, spacing } from '@/constants/theme';

function getContextualMessage(status: string, mode: 'pickup' | 'delivery'): string {
  if (mode === 'pickup') {
    switch (status) {
      case 'payment_confirmed':
      case 'pending':
        return 'On s\'y met tout de suite';
      case 'preparing':
        return 'Votre commande est en cuisine';
      case 'ready':
        return 'Prête au comptoir';
      case 'delivered':
      case 'completed':
        return 'Belle parenthèse';
      case 'cancelled':
        return 'Annulée';
      default:
        return 'En cours';
    }
  }
  switch (status) {
    case 'payment_confirmed':
    case 'pending':
      return 'Commande confirmée';
    case 'courier_assigned':
      return 'Livreur affecté';
    case 'preparing':
      return 'On prépare votre commande';
    case 'picked_up':
      return 'Votre commande est en route';
    case 'en_route':
      return 'Le livreur arrive bientôt';
    case 'delivered':
      return 'Livrée. Bon moment Teaven.';
    case 'cancelled':
    case 'returned':
      return 'Annulée';
    default:
      return 'En cours';
  }
}

function getStatusTitle(status: string, mode: 'pickup' | 'delivery'): string {
  if (mode === 'pickup') {
    if (status === 'ready') return 'Votre commande est prête';
    if (status === 'preparing') return 'En préparation';
    if (status === 'delivered' || status === 'completed') return 'Récupérée';
    if (status === 'cancelled') return 'Annulée';
    return 'Commande confirmée';
  }
  if (status === 'en_route') return 'Livreur en route';
  if (status === 'picked_up') return 'En route';
  if (status === 'preparing') return 'En préparation';
  if (status === 'courier_assigned') return 'Livreur affecté';
  if (status === 'delivered') return 'Livrée';
  if (status === 'cancelled' || status === 'returned') return 'Annulée';
  return 'Commande confirmée';
}

export function OrderTrackingBanner() {
  const { activeOrder } = useActiveOrder();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(activeOrder ? 0 : -200)).current;
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeOrder ? 0 : -200,
      damping: 22,
      stiffness: 220,
      useNativeDriver: useNative,
    }).start();
  }, [!!activeOrder]);

  if (!activeOrder) return null;

  const isDelivery = activeOrder.mode === 'delivery';
  const Icon = isDelivery ? Truck : Package;
  const route = isDelivery
    ? `/delivery/${activeOrder.orderId}`
    : `/order/${activeOrder.orderId}`;

  const title = getStatusTitle(activeOrder.status, activeOrder.mode);
  const subtitle = getContextualMessage(activeOrder.status, activeOrder.mode);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 4,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => router.push(route)}
        accessibilityRole="button"
        accessibilityLabel={`Suivi commande : ${title}. Toucher pour ouvrir le suivi détaillé.`}
        style={styles.tapWrap}
      >
        <LinearGradient
          colors={[colors.green, colors.greenDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          {/* Icon circle */}
          <View style={styles.iconCircle}>
            <Icon size={16} color={colors.greenDark} strokeWidth={2.4} />
          </View>

          {/* Texts */}
          <View style={styles.textWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {activeOrder.eta && (
                <View style={styles.etaPill}>
                  <Clock size={9} color={colors.greenDark} strokeWidth={2.6} />
                  <Text style={styles.etaText}>{activeOrder.eta}</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
            {/* Mini progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(8, activeOrder.progressPercent)}%` },
                ]}
              />
            </View>
          </View>

          <ChevronRight size={16} color="rgba(255,255,255,0.85)" strokeWidth={2.2} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: spacing.md,
  },
  tapWrap: {
    borderRadius: 14,
    shadowColor: '#1F3027',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderRadius: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFF',
    flex: 1,
  },
  etaPill: {
    backgroundColor: '#FFF',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  etaText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 9,
    color: colors.greenDark,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 13,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 3,
  },
  progressFill: {
    height: 2,
    backgroundColor: '#FFF',
    borderRadius: 1.5,
  },
});
