// Page Défis Teaven — philosophie, liste des défis actifs, progression
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Flame,
  Trophy,
  Leaf,
  Coffee,
  Heart,
  Star,
  Users,
  Lock,
  Check,
  Zap,
} from 'lucide-react-native';
import { useChallenges, type Challenge } from '@/hooks/useChallenges';
import { useToast } from '@/contexts/ToastContext';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  flame: Flame,
  trophy: Trophy,
  leaf: Leaf,
  coffee: Coffee,
  heart: Heart,
  star: Star,
  users: Users,
};

const ICON_BG: Record<string, string> = {
  flame: '#FFF0D6',
  trophy: '#F0F0EE',
  leaf: '#E8F0EA',
  coffee: '#F5ECE5',
  heart: '#FDECEA',
  star: '#F5F0E1',
  users: '#E8EDF7',
};

const ICON_COLOR: Record<string, string> = {
  flame: colors.gold,
  trophy: '#8A8A82',
  leaf: colors.green,
  coffee: '#C4845C',
  heart: colors.error,
  star: colors.gold,
  users: colors.greenSecondary,
};

const CATEGORY_SECTIONS = [
  { key: 'fidelite', label: 'Régularité', desc: 'Récompensez vos bonnes habitudes' },
  { key: 'boissons', label: 'Explorateur', desc: 'Découvrez notre carte sous toutes ses formes' },
  { key: 'food', label: 'Challenge du mois', desc: 'Défi mensuel unique' },
  { key: 'social', label: 'Social', desc: "Partagez l'expérience Teaven" },
];

const WHY_ITEMS = [
  {
    icon: Leaf,
    title: 'Découverte',
    text: 'Explorer notre carte et oser de nouvelles saveurs.',
  },
  {
    icon: Flame,
    title: 'Régularité',
    text: 'Récompenser votre fidélité au quotidien.',
  },
  {
    icon: Star,
    title: 'Ludique',
    text: 'Rendre chaque commande une petite aventure.',
  },
  {
    icon: Zap,
    title: 'Bonus',
    text: 'Gagner des points en plus de la fidélité classique.',
  },
];

export default function DefisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { challenges, loading } = useChallenges();
  const { showToast } = useToast();

  // Statistiques user pour le hero
  const inProgressCount = challenges.filter((c) => c.progress > 0 && !c.claimed && !c.locked).length;
  const completedCount = challenges.filter((c) => c.claimed).length;
  const totalPointsFromChallenges = challenges
    .filter((c) => c.claimed)
    .reduce((sum, c) => sum + c.reward, 0);

  const renderChallenge = (ch: Challenge) => {
    const Icon = ICON_MAP[ch.icon] ?? Trophy;
    const isDone = ch.completed || (ch.type !== 'morning_bonus' && ch.progress >= ch.target);
    const pct = ch.type === 'morning_bonus'
      ? 100
      : Math.min(100, Math.round((ch.progress / ch.target) * 100));

    // Variantes visuelles selon l'état :
    // - locked : grisée, opacity réduite
    // - in-progress (progress > 0, !done, !claimed) : MISE EN AVANT vert foncé pillar
    // - done & !claimed : card avec halo vert, CTA "réclamer"
    // - claimed : check large, opacity légère
    // - non-commencé : neutre, fond blanc
    const isInProgress = !ch.locked && !ch.claimed && !isDone && ch.progress > 0 && ch.type !== 'morning_bonus';
    const isReadyToClaim = !ch.locked && !ch.claimed && isDone && ch.type !== 'morning_bonus';
    const isMorning = ch.type === 'morning_bonus';

    if (isInProgress) {
      // ── Variante hero : défi en cours, card vert foncé pillar ──
      return (
        <View key={ch.id} style={styles.cardInProgressWrap}>
          <LinearGradient
            colors={['#1F3027', '#2D5A3D', '#3A6642']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardInProgress}
          >
            <View style={styles.cardInProgressDecor} />
            <View style={styles.cardInProgressDecor2} />

            {/* Top row */}
            <View style={styles.cardTop}>
              <View style={styles.iconWrapHero}>
                <Icon size={22} color="#FFFFFF" strokeWidth={1.8} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitleHero}>{ch.title}</Text>
                <Text style={styles.cardDescHero}>{ch.description}</Text>
              </View>
              <View style={styles.rewardBadgeHero}>
                <Text style={styles.rewardTextHero}>+{ch.reward}</Text>
                <Text style={styles.rewardLabelHero}>pts</Text>
              </View>
            </View>

            {/* Progress bar massive + fraction */}
            <View style={styles.progressRowHero}>
              <View style={styles.progressBarHero}>
                <View style={[styles.progressFillHero, { width: `${pct}%` as any }]} />
              </View>
              <Text style={styles.progressFractionHero}>
                {ch.progress}<Text style={styles.progressFractionHeroDim}>/{ch.target}</Text>
              </Text>
            </View>

            <View style={styles.cardFooterHero}>
              <Text style={styles.cardFooterTextHero}>
                {ch.isRecurring ? 'Mensuel' : 'En cours'}
              </Text>
              <View style={styles.flameRow}>
                <Flame size={11} color="#FFD89A" strokeWidth={2.2} />
                <Text style={styles.cardFooterPctHero}>{pct}%</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      );
    }

    return (
      <View
        key={ch.id}
        style={[
          styles.challengeCard,
          ch.claimed && styles.challengeClaimed,
          ch.locked && styles.challengeLocked,
          isReadyToClaim && styles.challengeReady,
        ]}
      >
        {isReadyToClaim && <View style={styles.readyAccent} />}

        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={[styles.iconWrap, { backgroundColor: ICON_BG[ch.icon] ?? '#F0F0EE' }]}>
            {ch.locked
              ? <Lock size={20} color={colors.textMuted} strokeWidth={1.5} />
              : ch.claimed
                ? <Check size={20} color={colors.green} strokeWidth={2.5} />
                : <Icon size={20} color={ICON_COLOR[ch.icon] ?? colors.green} strokeWidth={1.5} />
            }
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, ch.locked && { color: colors.textMuted }]}>{ch.title}</Text>
            <Text style={styles.cardDesc}>{ch.description}</Text>
          </View>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>+{ch.reward}</Text>
            <Text style={styles.rewardLabel}>pts</Text>
            {isMorning && <Text style={styles.rewardRecurring}>par commande</Text>}
          </View>
        </View>

        {/* Progress (pour les défis non commencés) */}
        {!isMorning && !ch.locked && !ch.claimed && (
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
            </View>
            <Text style={styles.progressFractionText}>
              {ch.progress}<Text style={styles.progressFractionDim}>/{ch.target}</Text>
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          {isMorning ? (
            <Text style={styles.recurringText}>
              {ch.progress > 0 ? `${ch.progress} commande${ch.progress > 1 ? 's' : ''} matinale${ch.progress > 1 ? 's' : ''}` : 'Commandez entre 8h et 11h'}
            </Text>
          ) : ch.isRecurring && ch.type === 'referral' ? (
            <Text style={styles.recurringText}>Récurrent — chaque parrainage</Text>
          ) : (
            <Text style={styles.durationText}>
              {ch.isRecurring ? 'Mensuel' : 'One-shot'}
            </Text>
          )}

          {ch.locked ? (
            <View style={styles.notStartedRow}>
              <Lock size={12} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.notStartedText}>Prérequis requis</Text>
            </View>
          ) : isReadyToClaim ? (
            <Pressable
              onPress={() => showToast(`+${ch.reward} pts crédités !`)}
              style={styles.claimBtn}
              accessibilityRole="button"
            >
              <Text style={styles.claimBtnText}>Réclamer {ch.reward} pts</Text>
            </Pressable>
          ) : ch.claimed ? (
            <View style={styles.claimedRow}>
              <Check size={14} color={colors.green} strokeWidth={2.5} />
              <Text style={styles.claimedText}>Réclamé</Text>
            </View>
          ) : isMorning ? (
            <View style={styles.activeRow}>
              <Flame size={12} color={colors.gold} strokeWidth={2} />
              <Text style={styles.inProgressText}>Actif en permanence</Text>
            </View>
          ) : (
            <Text style={styles.notStartedText}>Non commencé</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Les Défis Teaven</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Hero — gradient pillar défis avec stats user */}
      <LinearGradient
        colors={['#1F3027', '#2D5A3D', '#3A6642']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroDecor} />
        <View style={styles.heroDecor2} />
        <View style={styles.heroDecor3} />

        <View style={styles.heroIconWrap}>
          <Trophy size={28} color="#FFF" strokeWidth={1.5} />
        </View>
        <Text style={styles.heroTitle}>Vos défis Teaven</Text>
        <Text style={styles.heroText}>
          Chaque commande devient une parenthèse récompensée. Explorez, savourez, gagnez.
        </Text>

        {/* Stats line — chiffres iconiques */}
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{loading ? '…' : inProgressCount}</Text>
            <Text style={styles.heroStatLabel}>en cours</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{loading ? '…' : completedCount}</Text>
            <Text style={styles.heroStatLabel}>réussis</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{loading ? '…' : totalPointsFromChallenges}</Text>
            <Text style={styles.heroStatLabel}>pts gagnés</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.green} />
          <Text style={styles.loadingText}>Chargement des défis…</Text>
        </View>
      )}

      {/* Défis par catégorie */}
      {!loading && CATEGORY_SECTIONS.map((cat) => {
        const catChallenges = challenges
          .filter((c) => c.uiCategory === cat.key)
          .sort((a, b) => {
            // Verrouillés en dernier, puis par progression décroissante
            if (a.locked !== b.locked) return a.locked ? 1 : -1;
            return (b.progress / Math.max(b.target, 1)) - (a.progress / Math.max(a.target, 1));
          });
        if (catChallenges.length === 0) return null;
        return (
          <View key={cat.key}>
            <Text style={styles.sectionTitle}>{cat.label}</Text>
            <Text style={styles.sectionDesc}>{cat.desc}</Text>
            <View style={styles.challengesList}>
              {catChallenges.map(renderChallenge)}
            </View>
          </View>
        );
      })}

      {/* Pourquoi des défis — section harmonisée pillar */}
      <Text style={styles.sectionTitle}>L'esprit Teaven</Text>
      <Text style={styles.sectionDesc}>Pourquoi nos défis vous accompagnent au quotidien</Text>
      <View style={styles.whyCard}>
        {WHY_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <View key={i} style={[styles.whyRow, i < WHY_ITEMS.length - 1 && styles.whyRowBorder]}>
              <View style={styles.whyIcon}>
                <Icon size={16} color="#2D5A3D" strokeWidth={1.8} />
              </View>
              <View style={styles.whyContent}>
                <Text style={styles.whyTitle}>{item.title}</Text>
                <Text style={styles.whyText}>{item.text}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 80 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },

  // Hero — gradient pillar défis avec stats
  hero: {
    marginHorizontal: spacing.xl,
    borderRadius: 22,
    padding: spacing.xxl,
    marginBottom: spacing.xxxl,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#1F3027',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },
  heroDecor: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroDecor2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroDecor3: {
    position: 'absolute',
    top: 30,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  heroText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroStatLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  // Loading
  loadingWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Section title — couleur pillar défis
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#2D5A3D',
    paddingHorizontal: spacing.xl,
    marginBottom: 4,
    marginTop: spacing.lg,
    letterSpacing: -0.2,
  },
  sectionDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    lineHeight: 17,
  },

  // Challenges
  challengesList: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  challengeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: spacing.md,
    ...shadows.card,
  },
  challengeClaimed: {
    opacity: 0.65,
  },
  challengeLocked: {
    opacity: 0.5,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  cardDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  rewardBadge: {
    alignItems: 'center',
    backgroundColor: colors.greenLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 0,
  },
  rewardText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 14,
    color: colors.green,
  },
  rewardLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.green,
    marginTop: -1,
  },
  rewardRecurring: {
    fontFamily: fonts.regular,
    fontSize: 8,
    color: colors.green,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.green,
    borderRadius: 3,
  },
  progressFractionText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 14,
    color: '#2D5A3D',
    minWidth: 44,
    textAlign: 'right',
  },
  progressFractionDim: {
    color: 'rgba(45,90,61,0.4)',
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  recurringText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  claimBtn: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderRadius: 10,
  },
  claimBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  claimedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  claimedText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.green,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notStartedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notStartedText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  inProgressText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.green,
  },

  // ── Variante "en cours" (mise en avant) ──
  cardInProgressWrap: {
    borderRadius: 18,
    shadowColor: '#1F3027',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },
  cardInProgress: {
    borderRadius: 18,
    padding: 18,
    overflow: 'hidden',
    gap: 14,
  },
  cardInProgressDecor: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardInProgressDecor2: {
    position: 'absolute',
    bottom: -25,
    left: -20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  iconWrapHero: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitleHero: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  cardDescHero: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 17,
  },
  rewardBadgeHero: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexShrink: 0,
  },
  rewardTextHero: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 15,
    color: '#1F3027',
  },
  rewardLabelHero: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: '#1F3027',
    marginTop: -1,
    letterSpacing: 0.4,
  },
  progressRowHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarHero: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFillHero: {
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressFractionHero: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 18,
    color: '#FFFFFF',
    minWidth: 50,
    textAlign: 'right',
  },
  progressFractionHeroDim: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
  },
  cardFooterHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFooterTextHero: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardFooterPctHero: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFD89A',
  },

  // ── Variante "prêt à réclamer" (border vert épais) ──
  challengeReady: {
    borderColor: '#2D5A3D',
    borderWidth: 1.5,
    shadowColor: '#2D5A3D',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  readyAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#2D5A3D',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  // Why card
  whyCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xxxl,
    ...shadows.subtle,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: 16,
  },
  whyRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  whyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(45,90,61,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  whyContent: {
    flex: 1,
  },
  whyTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  whyText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
