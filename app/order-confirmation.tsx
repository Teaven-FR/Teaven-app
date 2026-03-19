// Écran Confirmation de commande — succès après validation du panier
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
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, MapPin, Clock, ChevronRight } from 'lucide-react-native';
import { useCartStore } from '@/stores/cartStore';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clearCart = useCartStore((s) => s.clearCart);

  // Animations
  const checkScale = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Vider le panier
    clearCart();

    // Séquence d'animations
    Animated.sequence([
      Animated.spring(checkScale, {
        toValue: 1,
        damping: 12,
        stiffness: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 400,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideUp, {
          toValue: 0,
          duration: 400,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ]).start();
  }, [checkScale, fadeIn, slideUp, clearCart]);

  // Numéro de commande simulé
  const orderNumber = `TEA-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Icône succès animée */}
        <Animated.View
          style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}
        >
          <LinearGradient
            colors={['#4A6B50', '#6B8F71']}
            style={styles.checkGradient}
          >
            <CheckCircle size={48} color="#FFFFFF" strokeWidth={1.5} />
          </LinearGradient>
        </Animated.View>

        {/* Texte principal */}
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
              <Text style={styles.summaryLabel}>N° commande</Text>
              <Text style={styles.summaryValue}>{orderNumber}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <View style={styles.infoRow}>
                <MapPin size={14} color={colors.textSecondary} strokeWidth={1.8} />
                <Text style={styles.infoText}>
                  12 rue de la Gare, 95130 Franconville
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

          {/* Barre de progression */}
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
