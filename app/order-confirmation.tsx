// Écran Confirmation de commande — design premium Teaven, pickup + livraison
// Affiche les VRAIS articles commandés, le montant payé, l'adresse réelle
import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Clock, ChevronRight, Check, Truck, Sparkles, Navigation, ShoppingBag } from 'lucide-react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useOrderStore } from '@/stores/orderStore';
import { useLocation } from '@/hooks/useLocation';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);
const CIRCLE_SIZE = 100;
const CIRCLE_R = 42;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;

const DELIVERY_STEPS = [
  { label: 'Confirmée', icon: Check },
  { label: 'Préparation', icon: Sparkles },
  { label: 'En route', icon: Navigation },
  { label: 'Livrée', icon: Truck },
];

const PICKUP_STEPS = [
  { label: 'Confirmée', icon: Check },
  { label: 'Préparation', icon: Sparkles },
  { label: 'Prête !', icon: Check },
];

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentOrder = useOrderStore((s) => s.currentOrder);
  const { location: storeLocation } = useLocation();
  const useNative = Platform.OS !== 'web';

  const isDelivery = currentOrder?.mode === 'delivery';
  const steps = isDelivery ? DELIVERY_STEPS : PICKUP_STEPS;

  // Animations
  const circleProgress = useRef(new Animated.Value(CIRCUMFERENCE)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(circleProgress, { toValue: 0, duration: 1000, useNativeDriver: useNative }),
      Animated.spring(checkScale, { toValue: 1, damping: 12, stiffness: 200, useNativeDriver: useNative }),
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: useNative }),
        Animated.timing(slideUp, { toValue: 0, duration: 400, useNativeDriver: useNative }),
      ]),
    ]).start();

    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
  }, []);

  const fmt = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <View style={styles.hero}>
        <View style={styles.circleContainer}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}>
            <SvgCircle
              cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={CIRCLE_R}
              stroke="rgba(117,150,127,0.15)" strokeWidth={3} fill="none"
            />
            <AnimatedSvgCircle
              cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={CIRCLE_R}
              stroke={colors.green} strokeWidth={3} fill="none" strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE}`} strokeDashoffset={circleProgress}
              transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
            />
          </Svg>
          <Animated.View style={[styles.checkWrap, { transform: [{ scale: checkScale }] }]}>
            {isDelivery
              ? <Truck size={34} color={colors.green} strokeWidth={1.8} />
              : <Check size={34} color={colors.green} strokeWidth={2.5} />
            }
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }], alignItems: 'center' }}>
          <Text style={styles.heroTitle}>
            {isDelivery ? 'Votre parenthèse arrive bientôt' : 'Votre parenthèse est en route'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isDelivery
              ? 'Commande confirmée. Un livreur viendra la chercher chez Teaven.'
              : 'Commande confirmée. Nous la préparons avec soin.'}
          </Text>
        </Animated.View>
      </View>

      {/* ── Progression ── */}
      <Animated.View style={[styles.card, { opacity: fadeIn }]}>
        <View style={styles.stepsRow}>
          {steps.map((step, i) => {
            const isActive = i === 0;
            const Icon = step.icon;
            return (
              <View key={i} style={styles.stepItem}>
                <View style={[styles.stepDot, isActive && styles.stepDotActive]}>
                  <Icon size={11} color={isActive ? '#FFFFFF' : colors.textMuted} strokeWidth={2} />
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step.label}</Text>
                {i < steps.length - 1 && (
                  <View style={[styles.stepLine, isActive && styles.stepLineActive]} />
                )}
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* ── Récapitulatif commande (articles réels) ── */}
      {currentOrder && (
        <Animated.View style={[styles.card, { opacity: fadeIn }]}>
          <View style={styles.cardHeader}>
            <ShoppingBag size={14} color={colors.green} strokeWidth={1.8} />
            <Text style={styles.cardTitle}>Votre commande</Text>
          </View>
          {currentOrder.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}×</Text>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemPrice}>{fmt(item.totalPrice)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.itemRow}>
            <Text style={styles.totalLabel}>Total payé</Text>
            <Text style={styles.totalValue}>{fmt(currentOrder.total)}</Text>
          </View>
          {isDelivery && currentOrder.deliveryFee != null && currentOrder.deliveryFee > 0 && (
            <Text style={styles.feeNote}>dont {fmt(currentOrder.deliveryFee)} de livraison</Text>
          )}
        </Animated.View>
      )}

      {/* ── Livraison ou Retrait ── */}
      <Animated.View style={[styles.card, { opacity: fadeIn }]}>
        {isDelivery && currentOrder?.deliveryAddress ? (
          <>
            <View style={styles.cardHeader}>
              <Truck size={14} color={colors.green} strokeWidth={1.8} />
              <Text style={styles.cardTitle}>Livraison</Text>
            </View>
            <Text style={styles.addressText}>
              {currentOrder.deliveryAddress.street}
              {currentOrder.deliveryAddress.complement ? `, ${currentOrder.deliveryAddress.complement}` : ''}
            </Text>
            <Text style={styles.addressCity}>
              {currentOrder.deliveryAddress.postalCode} {currentOrder.deliveryAddress.city}
            </Text>
            <View style={styles.etaRow}>
              <Clock size={13} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.etaText}>Estimé : 25–40 min</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.cardHeader}>
              <MapPin size={14} color={colors.green} strokeWidth={1.8} />
              <Text style={styles.cardTitle}>Click & Collect</Text>
            </View>
            <Text style={styles.addressText}>
              {storeLocation.addressFormatted || 'Teaven Franconville'}
            </Text>
            <View style={styles.etaRow}>
              <Clock size={13} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.etaText}>Prêt dans ~15 min</Text>
            </View>
          </>
        )}
      </Animated.View>

      {/* ── CTA Suivi ── */}
      {isDelivery && currentOrder?.id && (
        <Pressable
          onPress={() => router.push(`/delivery/${currentOrder.id}`)}
          style={({ pressed }) => [styles.trackingCta, pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={['#2C4A32', '#3A6642']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.trackingCtaInner}
          >
            <Truck size={17} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.trackingCtaText}>Suivre ma livraison</Text>
            <ChevronRight size={15} color="rgba(255,255,255,0.5)" strokeWidth={2} />
          </LinearGradient>
        </Pressable>
      )}

      {/* ── Actions ── */}
      <Pressable
        onPress={() => router.replace('/(tabs)')}
        style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.secondaryBtnText}>Retour à l'accueil</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/(tabs)/carte')} style={styles.linkBtn}>
        <Text style={styles.linkBtnText}>Commander autre chose</Text>
        <ChevronRight size={15} color={colors.green} strokeWidth={2} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 60, paddingHorizontal: spacing.xl },

  // Hero
  hero: { alignItems: 'center', paddingTop: 40, paddingBottom: spacing.xxl },
  circleContainer: {
    width: CIRCLE_SIZE, height: CIRCLE_SIZE,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
  },
  checkWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  heroTitle: {
    fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.3,
    color: colors.text, textAlign: 'center', marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.md,
  },

  // Cards
  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 18,
    marginBottom: spacing.md, ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md,
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  divider: { height: 0.5, backgroundColor: colors.border, marginVertical: spacing.sm },

  // Steps
  stepsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 5,
  },
  stepDotActive: { backgroundColor: colors.green },
  stepLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  stepLabelActive: { fontFamily: fonts.bold, color: colors.green },
  stepLine: {
    position: 'absolute', top: 12, left: '60%', right: '-40%',
    height: 2, backgroundColor: colors.border, borderRadius: 1,
  },
  stepLineActive: { backgroundColor: colors.green },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  itemQty: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted, width: 26 },
  itemName: { fontFamily: fonts.regular, fontSize: 13, color: colors.text, flex: 1 },
  itemPrice: { fontFamily: fonts.monoSemiBold, fontSize: 12, color: colors.textSecondary },
  totalLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.text, flex: 1 },
  totalValue: { fontFamily: fonts.monoSemiBold, fontSize: 16, color: colors.green },
  feeNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 4 },

  // Address
  addressText: { fontFamily: fonts.regular, fontSize: 13, color: colors.text, lineHeight: 20 },
  addressCity: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  etaText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },

  // CTA
  trackingCta: { marginBottom: spacing.md },
  trackingCtaInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: 16, paddingVertical: 15,
    ...shadows.card,
  },
  trackingCtaText: { fontFamily: fonts.bold, fontSize: 15, color: '#FFFFFF' },

  // Actions
  secondaryBtn: {
    height: 48, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    ...shadows.subtle,
  },
  secondaryBtnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: spacing.sm },
  linkBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.green },
});
