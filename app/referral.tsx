// Écran parrainage — code de parrainage, partage, explication du programme
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Share,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Copy,
  Share2,
  Users,
  Gift,
  Send,
  UserPlus,
} from 'lucide-react-native';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/hooks/useUser';
import { colors, fonts, spacing, radii, shadows } from '@/constants/theme';

/** Génère un code de parrainage à partir du numéro de téléphone */
function generateReferralCode(phone: string, name: string): string {
  const suffix = phone.replace(/\D/g, '').slice(-4);
  const prefix = name ? name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'T') : 'TAVT';
  return `${prefix}-${suffix}`;
}

/** Étapes du programme de parrainage */
const STEPS = [
  {
    icon: Share2,
    title: 'Partagez votre code',
    description: 'Envoyez votre code unique à vos amis par SMS, email ou réseaux sociaux.',
  },
  {
    icon: UserPlus,
    title: 'Votre ami s\'inscrit',
    description: 'Il crée son compte Teaven et saisit votre code lors de l\'inscription.',
  },
  {
    icon: Gift,
    title: 'Vous êtes récompensés',
    description: 'Vous recevez 200 pts et votre ami reçoit 100 pts de bienvenue.',
  },
] as const;

export default function ReferralScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useUser();

  const REFERRAL_CODE = generateReferralCode(user.phone, user.fullName ?? '');

  /** Copier le code — partage via Share API (pas de clipboard sans expo-clipboard) */
  const handleCopy = async () => {
    try {
      await Share.share({ message: REFERRAL_CODE });
    } catch {
      // fallback silencieux
    }
    showToast('Code copié !');
  };

  /** Partager le code via la feuille de partage native */
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Rejoignez Teaven avec mon code ${REFERRAL_CODE} et recevez 100 pts de bienvenue ! 🍵`,
      });
    } catch {
      // L'utilisateur a annulé le partage
    }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ──── Header ──── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={colors.text} strokeWidth={1.3} />
        </Pressable>
        <Text style={styles.headerTitle}>Parrainage</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ──── Carte premium avec gradient ──── */}
      <View style={styles.cardWrapper}>
        <LinearGradient
          colors={['#5A6F96', '#7B8EB5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumCard}
        >
          <View style={styles.decorCircle} />
          <View style={styles.decorCircle2} />

          <View style={styles.premiumIconWrap}>
            <Gift size={28} color="#FFFFFF" strokeWidth={1.3} />
          </View>

          <Text style={styles.premiumTitle}>Parrainez vos amis</Text>
          <Text style={styles.premiumSubtitle}>
            Invitez vos proches à découvrir Teaven et gagnez des points ensemble.
          </Text>

          {/* Code de parrainage */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>VOTRE CODE</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{REFERRAL_CODE}</Text>
              <Pressable
                onPress={handleCopy}
                style={styles.copyButton}
                accessibilityLabel="Copier le code"
                accessibilityRole="button"
              >
                <Copy size={16} color="#FFFFFF" strokeWidth={1.3} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ──── Bouton partager ──── */}
      <Pressable
        style={styles.shareButton}
        onPress={handleShare}
        accessibilityLabel="Partager le code"
        accessibilityRole="button"
      >
        <Send size={18} color="#FFFFFF" strokeWidth={1.3} />
        <Text style={styles.shareButtonText}>Partager mon code</Text>
      </Pressable>

      {/* ──── Statistiques ──── */}
      {/* TODO PRE-LAUNCH: charger les stats réelles depuis Supabase (table referrals) */}
      <View style={styles.statsCard}>
        <View style={styles.statsIconWrap}>
          <Users size={20} color={colors.green} strokeWidth={1.3} />
        </View>
        <View>
          <Text style={styles.statsValue}>0 ami parrainé</Text>
          <Text style={styles.statsDetail}>Partagez votre code pour commencer !</Text>
        </View>
      </View>

      {/* ──── Récompenses ──── */}
      <View style={styles.rewardRow}>
        <View style={styles.rewardCard}>
          <Text style={styles.rewardEmoji}>🎁</Text>
          <Text style={styles.rewardAmount}>200 pts</Text>
          <Text style={styles.rewardLabel}>Pour vous</Text>
        </View>
        <View style={styles.rewardCard}>
          <Text style={styles.rewardEmoji}>👋</Text>
          <Text style={styles.rewardAmount}>100 pts</Text>
          <Text style={styles.rewardLabel}>Pour votre ami</Text>
        </View>
      </View>

      {/* ──── Comment ça marche ──── */}
      <Text style={styles.sectionTitle}>Comment ça marche</Text>

      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepIndicator}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                {index < STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepIconWrap}>
                  <Icon size={18} color={colors.green} strokeWidth={1.3} />
                </View>
                <View style={styles.stepTextWrap}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  headerSpacer: {
    width: 24,
  },

  // Carte premium
  cardWrapper: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  premiumCard: {
    borderRadius: 20,
    padding: spacing.xxl,
    overflow: 'hidden',
    alignItems: 'center',
    ...shadows.loyalty,
  },
  decorCircle: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  premiumIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  premiumTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  premiumSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xxl,
  },

  // Code
  codeContainer: {
    alignItems: 'center',
    width: '100%',
  },
  codeLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.sm,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  codeText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bouton partager
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.green,
    borderRadius: radii.card,
    paddingVertical: 14,
    marginBottom: spacing.xxl,
    ...shadows.card,
  },
  shareButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },

  // Statistiques
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  statsDetail: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Récompenses
  rewardRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xxxl,
  },
  rewardCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  rewardEmoji: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  rewardAmount: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 18,
    color: colors.green,
    marginBottom: 2,
  },
  rewardLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Comment ça marche
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  stepsContainer: {
    paddingHorizontal: spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 90,
  },
  stepIndicator: {
    alignItems: 'center',
    width: 32,
    marginRight: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  stepContent: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  stepDescription: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});
