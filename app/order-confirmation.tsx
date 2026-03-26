// Écran Confirmation de commande — cercle animé + succès
import { useEffect, useRef } from 'react';
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
import { MapPin, Clock, ChevronRight, Check } from 'lucide-react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '@/stores/cartStore';
import { useLocation } from '@/hooks/useLocation';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);
const CIRCLE_SIZE = 96;
const CIRCLE_R = 40;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clearCart = useCartStore((s) => s.clearCart);
  const { location: storeLocation } = useLocation();
  const useNative = Platform.OS !== 'web';

  // Animations
  const circleProgress = useRef(new Animated.Value(CIRCUMFERENCE)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    clearCart();

    // Séquence : cercle se trace → check apparaît → contenu slide up
    Animated.sequence([
      // 1. Cercle se trace (1200ms)
      Animated.timing(circleProgress, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: useNative,
      }),
      // 2. Haptic + check
      Animated.parallel([
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: useNative,
        }),
      ]),
      // 3. Contenu
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 400,
          useNativeDriver: useNative,
        }),
        Animated.timing(slideUp, {
          toValue: 0,
          duration: 400,
          useNativeDriver: useNative,
        }),
      ]),
    ]).start();

    // Haptic au moment où le cercle se complète
    const hapticTimer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 1200);

    return () => clearTimeout(hapticTimer);
  }, [circleProgress, checkOpacity, fadeIn, slideUp, clearCart, useNative]);

  const orderNumber = `TEA-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Cercle animé */}
        <View style={styles.circleContainer}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}>
            {/* Track */}
            <SvgCircle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={CIRCLE_R}
              stroke="rgba(117,150,127,0.15)"
              strokeWidth={3}
              fill="none"
            />
            {/* Animated progress */}
            <AnimatedSvgCircle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={CIRCLE_R}
              stroke="#75967F"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeDashoffset={circleProgress}
              transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
            />
          </Svg>
          {/* Check icon au centre */}
          <Animated.View style={[styles.checkWrap, { opacity: checkOpacity }]}>
            <Check size={32} color="#75967F" strokeWidth={2.5} />
          </Animated.View>
        </View>

        {/* Texte + contenu */}
        <Animated.View
          style={[
            styles.textBlock,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          <Text style={styles.title}>Commande confirmée !</Text>
          <Text style={styles.subtitle}>
            Merci pour votre commande. Nous préparons tout avec soin.
          </Text>

          {/* Carte récapitulatif */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>N° COMMANDE</Text>
              <Text style={styles.summaryValue}>{orderNumber}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <View style={styles.infoRow}>
                <MapPin size={14} color={colors.textSecondary} strokeWidth={1.8} />
                <Text style={styles.infoText}>
                  {storeLocation.addressFormatted || 'Chargement...'}
                </Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.infoRow}>
                <Clock size={14} color={colors.textSecondary} strokeWidth={1.8} />
                <Text style={styles.infoText}>Prêt dans ~15 min</Text>
              </View>
            </View>
          </View>

          {/* Statut */}
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>STATUT</Text>
            <View style={styles.steps}>
              <StepDot active label="Confirmée" />
              <View style={styles.stepLine} />
              <StepDot active={false} label="En préparation" />
              <View style={styles.stepLine} />
              <StepDot active={false} label="Prête !" />
            </View>
          </View>

          {/* Boutons */}
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.primaryButtonText}>Retour à l'accueil</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(tabs)/carte')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Commander autre chose</Text>
            <ChevronRight size={16} color={colors.green} strokeWidth={2} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function StepDot({ active, label }: { active: boolean; label: string }) {
  return (
    <View style={styles.stepItem}>
      <View style={[styles.stepDot, active && styles.stepDotActive]}>
        {active && <View style={styles.stepDotInner} />}
      </View>
      <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
        {label}
      </Text>
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

  // Circle
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  checkWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text
  textBlock: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    letterSpacing: -0.3,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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
  summaryRow: {},
  summaryLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: 1,
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
  stepItem: {
    alignItems: 'center',
    width: 90,
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
  },
  stepDotActive: {
    borderColor: colors.green,
  },
  stepDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
  },
  stepLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  stepLabelActive: {
    fontFamily: fonts.bold,
    color: colors.green,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginTop: 9,
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
});
