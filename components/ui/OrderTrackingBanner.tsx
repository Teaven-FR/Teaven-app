// Banner suivi de commande Teaven — widget signature de l'expérience.
//
// Doctrine UX :
// - Inline dans le layout (pousse le contenu, ne masque rien).
// - Gradient vert Teaven (cohérent avec bannière "Première commande").
// - Compact par défaut (~72px), expand au tap façon Live Activity / widget iOS.
// - Mode expanded affiche items, total, livreur, étapes — riche, aéré, premium.
// - Différenciateur fort vs Uber Eats sec.

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
  Circle,
} from 'lucide-react-native';
import { useActiveOrder } from '@/contexts/ActiveOrderContext';
import { useOrderStore } from '@/stores/orderStore';
import { colors, fonts, spacing } from '@/constants/theme';

const COMPACT_HEIGHT = 72;
const EXPANDED_HEIGHT_MAX = 360;

/**
 * Micro-copie warm Teaven par statut.
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

/** Étapes ordonnées selon le mode pour la timeline visuelle. */
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
  const visibleAnim = useRef(new Animated.Value(activeOrder ? 1 : 0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    Animated.spring(visibleAnim, {
      toValue: activeOrder ? 1 : 0,
      damping: 22,
      stiffness: 220,
      useNativeDriver: false,
    }).start();
    if (!activeOrder) setExpanded(false);
  }, [!!activeOrder]);

  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: expanded ? 1 : 0,
      damping: 18,
      stiffness: 200,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  if (!activeOrder && (visibleAnim as any)._value === 0) return null;

  const isDelivery = activeOrder?.mode === 'delivery';
  const Icon = isDelivery ? Truck : Package;
  const route = activeOrder
    ? (isDelivery ? `/delivery/${activeOrder.orderId}` : `/order/${activeOrder.orderId}`)
    : '/';

  const title = activeOrder ? getStatusTitle(activeOrder.status, activeOrder.mode) : '';
  const subtitle = activeOrder ? getContextualMessage(activeOrder.status, activeOrder.mode) : '';
  const steps = activeOrder ? getSteps(activeOrder.mode) : [];

  // Hauteur container = safeAreaTop + (compact OR expanded)
  const compactBlockHeight = COMPACT_HEIGHT;
  const expandedBlockHeight = EXPANDED_HEIGHT_MAX;

  const blockHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [compactBlockHeight, expandedBlockHeight],
  });

  const totalHeight = visibleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, insets.top + compactBlockHeight], // hauteur réservée fixe (compact)
  });

  const fmt = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

  return (
    <Animated.View style={[styles.outer, { height: totalHeight }]}>
      {activeOrder && (
        <Animated.View
          style={[
            styles.absoluteWrap,
            {
              top: 0,
              height: Animated.add(new Animated.Value(insets.top), blockHeight),
            },
          ]}
        >
          <LinearGradient
            colors={[colors.green, colors.greenDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.gradient]}
          />

          <View style={[styles.inner, { paddingTop: insets.top + 8 }]}>
            {/* === COMPACT ROW (tap to expand) === */}
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              style={styles.compactRow}
              accessibilityRole="button"
              accessibilityLabel={`Suivi commande : ${title}. ${expanded ? 'Replier' : 'Déplier'}.`}
            >
              <View style={styles.iconCircle}>
                <Icon size={18} color={colors.green} strokeWidth={2.4} />
              </View>

              <View style={styles.textWrap}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {title}
                  </Text>
                  {activeOrder.eta && (
                    <View style={styles.etaPill}>
                      <Clock size={10} color={colors.greenDark} strokeWidth={2.5} />
                      <Text style={styles.etaText}>{activeOrder.eta}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
                {/* Progress bar fine */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(8, activeOrder.progressPercent)}%` },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.expandBtn}>
                {expanded
                  ? <ChevronUp size={16} color="#FFF" strokeWidth={2.5} />
                  : <ChevronDown size={16} color="#FFF" strokeWidth={2.5} />}
              </View>
            </Pressable>

            {/* === EXPANDED CONTENT (widget style) === */}
            <Animated.View
              style={[
                styles.expandedContent,
                {
                  opacity: expandAnim,
                  transform: [
                    {
                      translateY: expandAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-8, 0],
                      }),
                    },
                  ],
                },
              ]}
              pointerEvents={expanded ? 'auto' : 'none'}
            >
              {/* Steps timeline */}
              <View style={styles.stepsRow}>
                {steps.map((step, i) => {
                  const done = isStepDone(step.key, activeOrder.status, activeOrder.mode);
                  const isLast = i === steps.length - 1;
                  return (
                    <View key={step.key} style={styles.stepCol}>
                      <View style={styles.stepCircleRow}>
                        <View style={[styles.stepCircle, done && styles.stepCircleDone]}>
                          {done
                            ? <Check size={10} color={colors.greenDark} strokeWidth={3} />
                            : <Circle size={6} color="rgba(255,255,255,0.45)" strokeWidth={2.5} />}
                        </View>
                        {!isLast && (
                          <View style={[styles.stepLine, done && styles.stepLineDone]} />
                        )}
                      </View>
                      <Text style={[styles.stepLabel, done && styles.stepLabelDone]} numberOfLines={1}>
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Cards : items + livreur/total */}
              <View style={styles.cardsRow}>
                {/* Items card */}
                {currentOrder && currentOrder.items.length > 0 && (
                  <View style={styles.itemsCard}>
                    <Text style={styles.cardLabel}>Votre commande</Text>
                    {currentOrder.items.slice(0, 3).map((item, i) => (
                      <Text key={i} style={styles.itemLine} numberOfLines={1}>
                        <Text style={styles.itemQty}>{item.quantity}× </Text>
                        {item.name}
                      </Text>
                    ))}
                    {currentOrder.items.length > 3 && (
                      <Text style={styles.itemMore}>
                        +{currentOrder.items.length - 3} autre{currentOrder.items.length - 3 > 1 ? 's' : ''}
                      </Text>
                    )}
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalValue}>{fmt(currentOrder.total)}</Text>
                    </View>
                  </View>
                )}

                {/* Side card : livreur (delivery) ou retrait (pickup) */}
                <View style={styles.sideCard}>
                  {isDelivery ? (
                    <>
                      <Text style={styles.cardLabel}>Livreur</Text>
                      {activeOrder.courierName ? (
                        <View style={styles.courierRow}>
                          <View style={styles.courierAvatar}>
                            <User size={16} color={colors.greenDark} strokeWidth={2.2} />
                          </View>
                          <Text style={styles.courierName} numberOfLines={1}>
                            {activeOrder.courierName}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.courierPending}>En attente</Text>
                      )}
                      {currentOrder?.deliveryAddress && (
                        <View style={styles.addressRow}>
                          <MapPin size={11} color="rgba(255,255,255,0.7)" strokeWidth={2} />
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
                          <Package size={16} color={colors.greenDark} strokeWidth={2.2} />
                        </View>
                        <Text style={styles.courierName}>Au comptoir</Text>
                      </View>
                      <Text style={styles.addressText}>
                        Présentez votre nom au comptoir
                      </Text>
                    </>
                  )}
                </View>
              </View>

              {/* CTA principal */}
              <Pressable
                onPress={() => router.push(route)}
                style={styles.cta}
                accessibilityRole="button"
              >
                <Text style={styles.ctaText}>Voir le suivi complet</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'visible',
  },
  absoluteWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    shadowColor: '#1F3027',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  gradient: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },

  // ── Compact row ──
  compactRow: {
    height: COMPACT_HEIGHT - 8, // -8 pour le paddingTop déjà appliqué
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
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
    color: '#FFF',
    flex: 1,
  },
  etaPill: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  etaText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 10,
    color: colors.greenDark,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 14,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: 3,
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  expandBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Expanded content (widget) ──
  expandedContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },

  // Steps timeline
  stepsRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  stepCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stepCircleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 0,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginLeft: 0,
  },
  stepLabelDone: {
    color: '#FFF',
    fontFamily: fonts.bold,
  },

  // Cards row
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  itemsCard: {
    flex: 1.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  sideCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  cardLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  itemLine: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#FFF',
    lineHeight: 16,
  },
  itemQty: {
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  itemMore: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  totalLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  totalValue: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 14,
    color: '#FFF',
  },
  courierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courierAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierName: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFF',
    flex: 1,
  },
  courierPending: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  addressText: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 14,
    flex: 1,
  },

  // CTA
  cta: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.greenDark,
    letterSpacing: 0.3,
  },
});
