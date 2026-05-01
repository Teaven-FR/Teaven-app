// Banner suivi commande Teaven — floating chip expandable.
//
// Doctrine UX (révision finale) :
// - Position absolute en haut (overlay flottant), MARGES horizontales pour
//   ne pas couvrir l'intégralité du contenu en dessous (chip floating).
// - Compact ~56px par défaut → tap court = expand vers widget complet (~340px).
// - Mode expanded affiche : timeline étapes, items, livreur, total, CTA.
// - CTA "voir suivi complet" = navigate vers la page tracking détaillée.
// - Tap court ne navigue PAS (évite re-mount + animation à chaque tap).
// - Couleur signature : gradient vert Teaven.

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Truck,
  Package,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  User,
  Check,
  X,
} from 'lucide-react-native';
import { useActiveOrder } from '@/contexts/ActiveOrderContext';
import { useOrderStore } from '@/stores/orderStore';
import { colors, fonts, spacing } from '@/constants/theme';

const COMPACT_HEIGHT = 56;
// Hauteur expanded calibrée sur le contenu réel : steps + cards row + CTA.
const EXPANDED_HEIGHT = 290;

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

function getSteps(mode: 'pickup' | 'delivery'): { key: string; label: string }[] {
  if (mode === 'pickup') {
    return [
      { key: 'payment_confirmed', label: 'Confirmée' },
      { key: 'preparing', label: 'Préparation' },
      { key: 'ready', label: 'Prête' },
      { key: 'delivered', label: 'Récupérée' },
    ];
  }
  return [
    { key: 'payment_confirmed', label: 'Confirmée' },
    { key: 'preparing', label: 'Préparation' },
    { key: 'picked_up', label: 'En route' },
    { key: 'delivered', label: 'Livrée' },
  ];
}

function isStepDone(stepKey: string, currentStatus: string, mode: 'pickup' | 'delivery'): boolean {
  const order = mode === 'pickup'
    ? ['payment_confirmed', 'pending', 'preparing', 'ready', 'delivered', 'completed']
    : ['payment_confirmed', 'pending', 'preparing', 'courier_assigned', 'picked_up', 'en_route', 'delivered'];
  const stepIdx = order.indexOf(stepKey);
  const currentIdx = order.indexOf(currentStatus);
  if (stepIdx === -1 || currentIdx === -1) return false;
  return currentIdx >= stepIdx;
}

export function OrderTrackingBanner() {
  const { activeOrder } = useActiveOrder();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentOrder = useOrderStore((s) => s.currentOrder);

  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const slideAnim = useRef(new Animated.Value(activeOrder ? 0 : -200)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const lastStatusRef = useRef<string | undefined>(activeOrder?.status);
  const useNative = Platform.OS !== 'web';

  // Quand le statut change, réinitialiser hidden (le banner réapparaît).
  useEffect(() => {
    if (activeOrder?.status && activeOrder.status !== lastStatusRef.current) {
      setHidden(false);
      lastStatusRef.current = activeOrder.status;
    }
  }, [activeOrder?.status]);

  useEffect(() => {
    const visible = !!activeOrder && !hidden;
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -200,
      damping: 22,
      stiffness: 220,
      useNativeDriver: useNative,
    }).start();
    if (!visible) setExpanded(false);
  }, [!!activeOrder, hidden]);

  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: expanded ? 1 : 0,
      damping: 18,
      stiffness: 180,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  if (!activeOrder) return null;

  const isDelivery = activeOrder.mode === 'delivery';
  const Icon = isDelivery ? Truck : Package;
  const route = isDelivery
    ? `/delivery/${activeOrder.orderId}`
    : `/order/${activeOrder.orderId}`;

  const title = getStatusTitle(activeOrder.status, activeOrder.mode);
  const subtitle = getContextualMessage(activeOrder.status, activeOrder.mode);
  const steps = getSteps(activeOrder.mode);

  const fmt = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

  const animatedHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COMPACT_HEIGHT, EXPANDED_HEIGHT],
  });

  const handleNavigateToTracking = () => {
    setExpanded(false);
    router.push(route);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 6,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <Animated.View style={[styles.chipShadow, { height: animatedHeight }]}>
        <LinearGradient
          colors={[colors.green, colors.greenDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chip}
        >
          {/* Compact row — toujours visible, tap = toggle expand */}
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${expanded ? 'Replier' : 'Voir le détail'}.`}
            style={styles.compactRow}
          >
            <View style={styles.iconCircle}>
              <Icon size={14} color={colors.greenDark} strokeWidth={2.4} />
            </View>

            <View style={styles.compactTexts}>
              <View style={styles.compactTopRow}>
                <Text style={styles.compactTitle} numberOfLines={1}>{title}</Text>
                {activeOrder.eta && (
                  <View style={styles.etaPill}>
                    <Clock size={9} color={colors.greenDark} strokeWidth={2.6} />
                    <Text style={styles.etaText}>{activeOrder.eta}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.compactSubtitle} numberOfLines={1}>{subtitle}</Text>
            </View>

            <View style={styles.expandBtn}>
              {expanded
                ? <ChevronUp size={14} color="#FFF" strokeWidth={2.4} />
                : <ChevronDown size={14} color="#FFF" strokeWidth={2.4} />}
            </View>
          </Pressable>

          {/* Expanded content — visible quand déplié */}
          <Animated.View
            style={[styles.expanded, { opacity: expandAnim }]}
            pointerEvents={expanded ? 'auto' : 'none'}
          >
            {/* Bouton X — réduit le banner (réapparaît au changement de statut) */}
            <Pressable
              onPress={() => setHidden(true)}
              style={styles.dismissBtn}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Réduire le banner de suivi"
            >
              <X size={12} color="#FFF" strokeWidth={2.4} />
            </Pressable>

            {/* Steps timeline */}
            <View style={styles.stepsRow}>
              {steps.map((step, i) => {
                const done = isStepDone(step.key, activeOrder.status, activeOrder.mode);
                const isLast = i === steps.length - 1;
                return (
                  <View key={step.key} style={styles.stepCol}>
                    <View style={styles.stepCircleRow}>
                      <View style={[styles.stepCircle, done && styles.stepCircleDone]}>
                        {done && <Check size={9} color={colors.greenDark} strokeWidth={3} />}
                      </View>
                      {!isLast && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
                    </View>
                    <Text style={[styles.stepLabel, done && styles.stepLabelDone]} numberOfLines={1}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Cards row : items + side info */}
            <View style={styles.cardsRow}>
              {currentOrder && currentOrder.items.length > 0 && (
                <View style={styles.itemsCard}>
                  <Text style={styles.cardLabel}>Votre commande</Text>
                  {currentOrder.items.slice(0, 2).map((item, i) => (
                    <Text key={i} style={styles.itemLine} numberOfLines={1}>
                      <Text style={styles.itemQty}>{item.quantity}× </Text>
                      {item.name}
                    </Text>
                  ))}
                  {currentOrder.items.length > 2 && (
                    <Text style={styles.itemMore}>+{currentOrder.items.length - 2} autre{currentOrder.items.length - 2 > 1 ? 's' : ''}</Text>
                  )}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>{fmt(currentOrder.total)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.sideCard}>
                {isDelivery ? (
                  <>
                    <Text style={styles.cardLabel}>Livreur</Text>
                    {activeOrder.courierName ? (
                      <View style={styles.courierRow}>
                        <View style={styles.courierAvatar}>
                          <User size={13} color={colors.greenDark} strokeWidth={2.2} />
                        </View>
                        <Text style={styles.courierName} numberOfLines={1}>{activeOrder.courierName}</Text>
                      </View>
                    ) : (
                      <Text style={styles.courierPending}>En attente</Text>
                    )}
                    {currentOrder?.deliveryAddress && (
                      <View style={styles.addressRow}>
                        <MapPin size={10} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                        <Text style={styles.addressText} numberOfLines={2}>
                          {currentOrder.deliveryAddress.street}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.cardLabel}>Retrait</Text>
                    <View style={styles.courierRow}>
                      <View style={styles.courierAvatar}>
                        <Package size={13} color={colors.greenDark} strokeWidth={2.2} />
                      </View>
                      <Text style={styles.courierName}>Au comptoir</Text>
                    </View>
                    <Text style={styles.addressText} numberOfLines={2}>
                      Présentez votre nom à l'arrivée
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* CTA pour ouvrir la page tracking complète */}
            <Pressable onPress={handleNavigateToTracking} style={styles.cta} accessibilityRole="button">
              <Text style={styles.ctaText}>Voir le suivi complet</Text>
            </Pressable>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
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
  chipShadow: {
    borderRadius: 16,
    shadowColor: '#1F3027',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
    overflow: 'hidden',
  },
  chip: {
    flex: 1,
    borderRadius: 16,
  },

  // Compact
  compactRow: {
    height: COMPACT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTexts: {
    flex: 1,
    gap: 2,
  },
  compactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactTitle: {
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
  compactSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 13,
  },
  expandBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Expanded
  expanded: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 10,
  },
  dismissBtn: {
    position: 'absolute',
    top: -2,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Steps timeline
  stepsRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  stepCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 5,
  },
  stepCircleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  stepCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  stepLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
  },
  stepLineDone: {
    backgroundColor: '#FFF',
  },
  stepLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
  },
  stepLabelDone: {
    color: '#FFF',
    fontFamily: fonts.bold,
  },

  // Cards
  cardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  itemsCard: {
    flex: 1.4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  sideCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 10,
    gap: 5,
  },
  cardLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  itemLine: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#FFF',
    lineHeight: 15,
  },
  itemQty: {
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  itemMore: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    marginTop: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  totalLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
  },
  totalValue: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 12,
    color: '#FFF',
  },
  courierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  courierAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierName: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFF',
    flex: 1,
  },
  courierPending: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  addressText: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 12,
    flex: 1,
  },

  // CTA
  cta: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.greenDark,
    letterSpacing: 0.3,
  },
});
