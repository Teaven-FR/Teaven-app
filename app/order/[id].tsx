// Écran de suivi de commande — progression animée en temps réel (simulé)
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, MapPin, Clock, ChevronRight, Star, RefreshCw } from 'lucide-react-native';
import { useOrderStore } from '@/stores/orderStore';
import { useCartStore } from '@/stores/cartStore';
import { useCatalog } from '@/hooks/useCatalog';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/hooks/useUser';
import { useLocation } from '@/hooks/useLocation';
import { colors, fonts, spacing, shadows } from '@/constants/theme';
import type { OrderStatus } from '@/lib/types';

// Étapes de progression click & collect
const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'payment_confirmed', label: 'Confirmée' },
  { status: 'accepted', label: 'Acceptée' },
  { status: 'preparing', label: 'Préparation' },
  { status: 'ready', label: 'Prête' },
  { status: 'picked_up', label: 'Récupérée' },
];

// Labels lisibles pour les toasts
const STATUS_LABELS: Record<string, string> = {
  order_created: 'Commande créée',
  accepted: 'Commande acceptée',
  preparing: 'En préparation',
  ready: 'Votre commande est prête !',
  picked_up: 'Commande récupérée',
};

// Timing de simulation (ms depuis la création)
const SIMULATION_DELAYS: { status: OrderStatus; delay: number }[] = [
  { status: 'order_created', delay: 3000 },
  { status: 'accepted', delay: 6000 },
  { status: 'preparing', delay: 10000 },
  { status: 'ready', delay: 20000 },
];

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { location: storeLocation } = useLocation();

  const currentOrder = useOrderStore((s) => s.currentOrder);
  const getOrderById = useOrderStore((s) => s.getOrderById);
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);

  const order = currentOrder?.id === id ? currentOrder : getOrderById(id ?? '');

  // Animations
  const checkScale = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [isReady, setIsReady] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { loyalty, updateProfile } = useUser();

  // Animation d'entrée
  useEffect(() => {
    Animated.sequence([
      Animated.spring(checkScale, {
        toValue: 1,
        damping: 12,
        stiffness: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [checkScale, fadeIn]);

  // Simulation de progression des statuts
  useEffect(() => {
    if (!order?.id) return;

    const timers = SIMULATION_DELAYS.map(({ status, delay }) =>
      setTimeout(() => {
        updateOrderStatus(order.id, status);
        const label = STATUS_LABELS[status];
        if (label) showToast(label);

        if (status === 'ready') {
          setIsReady(true);
        }
      }, delay),
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  // Animation pulse quand la commande est prête
  useEffect(() => {
    if (!isReady) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isReady, pulseAnim]);

  if (!order) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Commande introuvable</Text>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Retour à l'accueil</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  // Index de l'étape active
  const activeStepIndex = STEPS.findIndex((s) => s.status === order.status);
  const currentStep = activeStepIndex >= 0 ? activeStepIndex : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Icône succès animée */}
        <Animated.View
          style={[
            styles.checkCircle,
            { transform: [{ scale: isReady ? pulseAnim : checkScale }] },
          ]}
        >
          <LinearGradient
            colors={isReady ? ['#2C8B3D', '#75967F'] : ['#4A6B50', '#75967F']}
            style={styles.checkGradient}
          >
            <Check size={48} color="#FFFFFF" strokeWidth={1.5} />
          </LinearGradient>
        </Animated.View>

        {/* Texte principal */}
        <Animated.View style={[styles.textBlock, { opacity: fadeIn }]}>
          <Text style={styles.title}>
            {isReady ? 'Votre commande est prête !' : 'Commande confirmée !'}
          </Text>
          <Text style={styles.orderNumber}>{order.id}</Text>

          {/* Récap compact */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {order.items.length} article{order.items.length > 1 ? 's' : ''}
              </Text>
              <Text style={styles.summaryValue}>{formatPrice(order.total)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <MapPin size={14} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.infoText}>
                {storeLocation.addressFormatted || 'Chargement...'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={14} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.infoText}>Prête dans environ 15 min</Text>
            </View>
          </View>

          {/* Barre de progression */}
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>STATUT</Text>
            <View style={styles.steps}>
              {STEPS.map((step, index) => {
                const isPast = index < currentStep;
                const isActive = index === currentStep;
                const isFuture = index > currentStep;

                return (
                  <View key={step.status} style={styles.stepRow}>
                    {/* Ligne avant le dot (sauf premier) */}
                    {index > 0 && (
                      <View
                        style={[
                          styles.stepLine,
                          (isPast || isActive) && styles.stepLineDone,
                        ]}
                      />
                    )}

                    {/* Dot */}
                    <View style={styles.stepItem}>
                      <View
                        style={[
                          styles.stepDot,
                          (isPast || isActive) && styles.stepDotDone,
                          isFuture && styles.stepDotFuture,
                        ]}
                      >
                        {(isPast || isActive) && (
                          <View style={styles.stepDotInner} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          (isPast || isActive) && styles.stepLabelDone,
                        ]}
                        numberOfLines={1}
                      >
                        {step.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Boutons */}
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel="Retour à l'accueil"
          >
            <Text style={styles.primaryButtonText}>Retour à l'accueil</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              // Commander à nouveau : ajouter les articles au panier
              if (order) {
                const addItem = useCartStore.getState().addItem;
                const { allProducts } = useCatalog();
                let added = 0;
                for (const item of order.items) {
                  const product = allProducts.find((p) => p.id === item.productId || p.name === item.name);
                  if (product) {
                    addItem(product, item.quantity);
                    added++;
                  }
                }
                if (added > 0) {
                  showToast(`${added} article${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} au panier`);
                  router.replace('/(tabs)/panier');
                } else {
                  showToast('Produits non disponibles');
                }
              }
            }}
            style={styles.secondaryButton}
            accessibilityRole="button"
            accessibilityLabel="Commander à nouveau"
          >
            <RefreshCw size={14} color={colors.green} strokeWidth={2} />
            <Text style={styles.secondaryButtonText}>Commander à nouveau</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(tabs)/carte')}
            style={styles.secondaryButton}
            accessibilityRole="button"
            accessibilityLabel="Commander autre chose"
          >
            <Text style={styles.secondaryButtonText}>Commander autre chose</Text>
            <ChevronRight size={16} color={colors.green} strokeWidth={2} />
          </Pressable>

          {/* ──── Avis + Points ──── */}
          {isReady && !reviewSubmitted && (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>Donnez votre avis</Text>
              <Text style={styles.reviewSub}>+10 pts offerts pour votre retour</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    hitSlop={8}
                    accessibilityLabel={`${star} étoile${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      size={28}
                      color={colors.gold}
                      fill={star <= rating ? colors.gold : 'transparent'}
                      strokeWidth={1.5}
                    />
                  </Pressable>
                ))}
              </View>
              {rating > 0 && (
                <Pressable
                  style={styles.reviewSubmitBtn}
                  onPress={() => {
                    setReviewSubmitted(true);
                    updateProfile({ loyaltyPoints: loyalty.points + 10 });
                    showToast('+10 pts crédités, merci !');
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.reviewSubmitText}>Envoyer mon avis</Text>
                </Pressable>
              )}
            </View>
          )}
          {reviewSubmitted && (
            <View style={styles.reviewThanks}>
              <Check size={16} color={colors.green} strokeWidth={2} />
              <Text style={styles.reviewThanksText}>Merci pour votre avis ! +10 pts crédités.</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Check icon
  checkCircle: {
    marginBottom: spacing.xxl,
  },
  checkGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.loyalty,
  },

  // Text
  textBlock: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  orderNumber: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },

  // Summary card
  summaryCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xxl,
    ...shadows.card,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 16,
    color: colors.green,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Progress
  progressSection: {
    width: '100%',
    marginBottom: spacing.xxxl,
  },
  progressLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  stepDotDone: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  stepDotFuture: {
    borderColor: colors.border,
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  stepLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  stepLabelDone: {
    color: colors.green,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginTop: 9,
    marginHorizontal: -4,
  },
  stepLineDone: {
    backgroundColor: colors.green,
  },

  // Buttons
  primaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: colors.green,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secondaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.green,
  },

  // Avis
  reviewCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxl,
    ...shadows.card,
  },
  reviewTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  reviewSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.green,
    marginTop: -spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reviewSubmitBtn: {
    height: 40,
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.green,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewSubmitText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  reviewThanks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    backgroundColor: colors.greenLight,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  reviewThanksText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.green,
  },
});
