// Banner suivi de commande Teaven — pièce iconique de l'expérience.
//
// Doctrine UX :
// - Inline dans le layout (push le contenu, ne masque rien).
// - Couleur signature terracotta wallet, distinct des défis (vert) et de la fidélité.
// - Message contextuel warm pour chaque étape (différenciation vs Uber Eats sec).
// - Tap → écran de suivi détaillé.

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Truck, Package, ChevronRight } from 'lucide-react-native';
import { useActiveOrder } from '@/contexts/ActiveOrderContext';
import { colors, fonts, spacing } from '@/constants/theme';

// Pillar color wallet (terracotta) — chaleureuse, gourmande, distincte du vert défis.
const TERRACOTTA = '#C4845C';
const TERRACOTTA_DARK = '#A56843';
const TERRACOTTA_TINT_BG = '#FBF2EB'; // fond crème terracotta très doux

/**
 * Micro-copie warm Teaven par statut.
 * Pas générique, jamais sec, toujours humain.
 */
function getContextualMessage(status: string, mode: 'pickup' | 'delivery'): string {
  if (mode === 'pickup') {
    switch (status) {
      case 'payment_confirmed':
      case 'pending':
        return 'On s\'y met tout de suite';
      case 'preparing':
        return 'Votre commande est en cuisine';
      case 'ready':
        return 'Prête au comptoir, on vous attend';
      case 'delivered':
      case 'completed':
        return 'Belle parenthèse Teaven';
      case 'cancelled':
        return 'Commande annulée';
      default:
        return 'En cours';
    }
  }
  // delivery
  switch (status) {
    case 'payment_confirmed':
    case 'pending':
      return 'Commande confirmée, on prépare';
    case 'courier_assigned':
      return 'Un livreur arrive chez nous';
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
      return 'Commande annulée';
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

  const heightAnim = useRef(new Animated.Value(activeOrder ? 1 : 0)).current;
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: activeOrder ? 1 : 0,
      damping: 22,
      stiffness: 220,
      useNativeDriver: false, // height anim
    }).start();
  }, [!!activeOrder]);

  if (!activeOrder && (heightAnim as any)._value === 0) return null;

  const isDelivery = activeOrder?.mode === 'delivery';
  const Icon = isDelivery ? Truck : Package;
  const route = activeOrder
    ? (isDelivery ? `/delivery/${activeOrder.orderId}` : `/order/${activeOrder.orderId}`)
    : '/';

  const title = activeOrder ? getStatusTitle(activeOrder.status, activeOrder.mode) : '';
  const subtitle = activeOrder ? getContextualMessage(activeOrder.status, activeOrder.mode) : '';

  // Hauteur banner = safeAreaTop + contenu (~64px)
  const contentHeight = 64;
  const totalHeight = insets.top + contentHeight;

  const animatedHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, totalHeight],
  });

  return (
    <Animated.View style={[styles.outer, { height: animatedHeight }]}>
      {activeOrder && (
        <View style={[styles.banner, { paddingTop: insets.top + 6 }]}>
          <Pressable
            style={styles.tapArea}
            onPress={() => router.push(route)}
            accessibilityRole="button"
            accessibilityLabel={`Suivi commande : ${title}`}
            android_ripple={{ color: 'rgba(196,132,92,0.12)' }}
          >
            {/* Icon circle terracotta */}
            <View style={styles.iconCircle}>
              <Icon size={18} color="#FFF" strokeWidth={2.2} />
            </View>

            {/* Texts */}
            <View style={styles.textWrap}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                {activeOrder.eta && (
                  <View style={styles.etaPill}>
                    <Text style={styles.etaText}>{activeOrder.eta}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
                {activeOrder.courierName ? ` · ${activeOrder.courierName}` : ''}
              </Text>
              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(8, activeOrder.progressPercent)}%` },
                  ]}
                />
              </View>
            </View>

            <ChevronRight size={18} color={TERRACOTTA_DARK} strokeWidth={2} />
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    backgroundColor: TERRACOTTA_TINT_BG,
  },
  banner: {
    flex: 1,
    backgroundColor: TERRACOTTA_TINT_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196,132,92,0.18)',
  },
  tapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TERRACOTTA,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TERRACOTTA_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#3A2A20', // brun foncé warm, lisible sur le fond crème
    flex: 1,
  },
  etaPill: {
    backgroundColor: TERRACOTTA,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  etaText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 10,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#7A5847',
    lineHeight: 14,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(196,132,92,0.18)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: 3,
    backgroundColor: TERRACOTTA,
    borderRadius: 2,
  },
});
