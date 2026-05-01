// Page Défis Teaven — Cartes postales (pivot Consortium 2026-05-01)
// Liste aérée de cartes avec gradients riches, icones décoratives, hiérarchie claire.
import { useMemo } from 'react';
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
  Sparkles,
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

// Gradient par catégorie pillar (DS Teaven)
const CATEGORY_GRADIENT: Record<string, [string, string, string]> = {
  fidelite: ['#1F3027', '#2D5A3D', '#3A6642'],   // pillar défis vert profond
  boissons: ['#A56843', '#C4845C', '#D89F76'],   // pillar wallet terracotta
  food: ['#9B8540', '#C4A962', '#D8C285'],       // doré gold
  social: ['#5C8580', '#7EA5A0', '#9DBDB9'],     // pillar atmosphère
};

const CATEGORY_LABELS: Record<string, string> = {
  fidelite: 'Régularité',
  boissons: 'Explorateur',
  food: 'Mensuel',
  social: 'Social',
};

const WHY_ITEMS = [
  { icon: Leaf, title: 'Découverte', text: 'Explorer notre carte et oser de nouvelles saveurs.' },
  { icon: Flame, title: 'Régularité', text: 'Récompenser votre fidélité au quotidien.' },
  { icon: Star, title: 'Ludique', text: 'Rendre chaque commande une petite aventure.' },
  { icon: Zap, title: 'Bonus', text: 'Gagner des points en plus de la fidélité classique.' },
];

function sortChallenges(challenges: Challenge[]): Challenge[] {
  return [...challenges].sort((a, b) => {
    if (a.locked !== b.locked) return a.locked ? 1 : -1;
    if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
    const aInProgress = a.progress > 0 && !a.claimed;
    const bInProgress = b.progress > 0 && !b.claimed;
    if (aInProgress !== bInProgress) return aInProgress ? -1 : 1;
    const aPct = a.progress / Math.max(a.target, 1);
    const bPct = b.progress / Math.max(b.target, 1);
    return bPct - aPct;
  });
}

// ─── Carte postale "défi" ───
// Card riche avec gradient catégorie + icone décorative large + texte devant.
function ChallengeCard({
  challenge: ch,
  isHero,
  onClaim,
}: {
  challenge: Challenge;
  isHero?: boolean;
  onClaim: () => void;
}) {
  const Icon = ICON_MAP[ch.icon] ?? Trophy;
  const isMorning = ch.type === 'morning_bonus';
  const isDone = ch.completed || (!isMorning && ch.progress >= ch.target);
  const isReadyToClaim = !ch.locked && !ch.claimed && isDone && !isMorning;
  const pct = isMorning ? 100 : Math.min(100, Math.round((ch.progress / Math.max(ch.target, 1)) * 100));

  const gradient = CATEGORY_GRADIENT[ch.uiCategory] ?? CATEGORY_GRADIENT.fidelite;
  const categoryLabel = CATEGORY_LABELS[ch.uiCategory] ?? 'Défi';

  // Variante locked
  if (ch.locked) {
    return (
      <View style={[styles.card, styles.cardLocked]}>
        <View style={styles.lockedContent}>
          <View style={styles.lockedIcon}>
            <Lock size={20} color={colors.textMuted} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.lockedCategory}>{categoryLabel}</Text>
            <Text style={styles.lockedTitle} numberOfLines={1}>{ch.title}</Text>
            <Text style={styles.lockedHint}>Terminez un autre défi pour débloquer</Text>
          </View>
        </View>
      </View>
    );
  }

  // Variante claimed
  if (ch.claimed) {
    return (
      <View style={[styles.card, styles.cardClaimed]}>
        <View style={styles.claimedAccent} />
        <View style={styles.claimedContent}>
          <View style={styles.claimedIcon}>
            <Check size={22} color="#2D5A3D" strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.claimedCategory}>{categoryLabel}</Text>
            <Text style={styles.claimedTitle} numberOfLines={1}>{ch.title}</Text>
          </View>
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedBadgeText}>+{ch.reward}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Active card (hero ou liste) — gradient catégorie + icone décorative large
  return (
    <Pressable onPress={isReadyToClaim ? onClaim : undefined}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, isHero ? styles.cardHero : styles.cardListItem]}
      >
        {/* Icone décorative large semi-transparente — donne de la matière visuelle */}
        <View style={styles.decorIcon}>
          <Icon
            size={isHero ? 140 : 100}
            color="rgba(255,255,255,0.08)"
            strokeWidth={1.2}
          />
        </View>
        {/* Pattern dots décoratifs */}
        <View style={[styles.decorDot, styles.decorDot1]} />
        <View style={[styles.decorDot, styles.decorDot2]} />
        {isHero && <View style={[styles.decorDot, styles.decorDot3]} />}

        {/* Top row : catégorie + reward */}
        <View style={styles.topRow}>
          <View style={styles.categoryPill}>
            <Sparkles size={9} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.categoryPillText}>{categoryLabel}</Text>
          </View>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>+{ch.reward}</Text>
            <Text style={styles.rewardLabel}>pts</Text>
          </View>
        </View>

        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={[styles.title, isHero && styles.titleHero]} numberOfLines={2}>
            {ch.title}
          </Text>
          {isHero && (
            <Text style={styles.description} numberOfLines={2}>
              {ch.description}
            </Text>
          )}
        </View>

        {/* Bottom : progress + status/CTA */}
        <View style={styles.bottomBlock}>
          {!isMorning && (
            <View style={styles.progressRow}>
              <Text style={styles.progressFraction}>
                {ch.progress}<Text style={styles.progressFractionDim}>/{ch.target}</Text>
              </Text>
              <Text style={styles.progressPct}>{pct}%</Text>
            </View>
          )}
          {!isMorning && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.max(8, pct)}%` as any }]} />
            </View>
          )}

          {isReadyToClaim && (
            <View style={styles.claimCTA}>
              <Text style={styles.claimCTAText}>Toucher pour réclamer</Text>
            </View>
          )}
          {isMorning && (
            <View style={styles.morningBadge}>
              <Flame size={10} color="#FFD89A" strokeWidth={2.4} />
              <Text style={styles.morningText}>
                Actif tous les matins · 8h-11h
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function DefisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { challenges, loading } = useChallenges();
  const { showToast } = useToast();

  const sorted = useMemo(() => sortChallenges(challenges), [challenges]);

  const inProgressCount = challenges.filter((c) => c.progress > 0 && !c.claimed && !c.locked).length;
  const completedCount = challenges.filter((c) => c.claimed).length;
  const totalPointsFromChallenges = challenges
    .filter((c) => c.claimed)
    .reduce((sum, c) => sum + c.reward, 0);

  const heroChallenge = sorted[0];
  const restChallenges = sorted.slice(1);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Mes défis</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Hero stats */}
      <LinearGradient
        colors={['#1F3027', '#2D5A3D', '#3A6642']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsHero}
      >
        <View style={styles.statsHeroDecor} />
        <View style={styles.statsHeroDecor2} />

        <View style={styles.heroIconWrap}>
          <Trophy size={26} color="#FFF" strokeWidth={1.5} />
        </View>
        <Text style={styles.heroTitle}>Vos défis Teaven</Text>
        <Text style={styles.heroSubtitle}>
          Chaque commande devient une parenthèse récompensée.
        </Text>

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

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#2D5A3D" />
          <Text style={styles.loadingText}>Chargement des défis…</Text>
        </View>
      )}

      {/* Hero challenge (le plus avancé) */}
      {!loading && heroChallenge && (
        <View style={styles.heroChallengeWrap}>
          <ChallengeCard
            challenge={heroChallenge}
            isHero
            onClaim={() => showToast(`+${heroChallenge.reward} pts crédités !`)}
          />
        </View>
      )}

      {/* Liste aérée des autres défis */}
      {!loading && restChallenges.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Vos {restChallenges.length} autres cartes</Text>
          <View style={styles.cardsList}>
            {restChallenges.map((ch) => (
              <ChallengeCard
                key={ch.id}
                challenge={ch}
                onClaim={() => showToast(`+${ch.reward} pts crédités !`)}
              />
            ))}
          </View>
        </>
      )}

      {/* L'esprit Teaven */}
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

  // Stats hero (en haut, données globales user)
  statsHero: {
    marginHorizontal: spacing.xl,
    borderRadius: 22,
    padding: spacing.xxl,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#1F3027',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  statsHeroDecor: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  statsHeroDecor2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    width: '100%',
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroStatLabel: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.18)' },

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

  // ─── Cartes postales défi ───
  heroChallengeWrap: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  cardsList: {
    paddingHorizontal: spacing.xl,
    gap: 14,
    marginBottom: spacing.xxxl,
  },

  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1F3027',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHero: {
    padding: spacing.xl,
    minHeight: 200,
    gap: 14,
  },
  cardListItem: {
    padding: spacing.lg,
    minHeight: 150,
    gap: 10,
  },

  // Decor
  decorIcon: {
    position: 'absolute',
    top: -20,
    right: -20,
    transform: [{ rotate: '-12deg' }],
  },
  decorDot: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  decorDot1: { width: 40, height: 40, top: 16, left: -10 },
  decorDot2: { width: 24, height: 24, bottom: 30, right: 30 },
  decorDot3: { width: 60, height: 60, bottom: -20, left: 60 },

  // Top row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryPillText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    color: '#FFFFFF',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  rewardBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  rewardText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 14,
    color: '#1F3027',
  },
  rewardLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: '#1F3027',
    marginTop: -2,
  },

  // Title block
  titleBlock: { gap: 6 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  titleHero: {
    fontSize: 22,
    lineHeight: 28,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },

  // Bottom
  bottomBlock: { gap: 8 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressFraction: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  progressFractionDim: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
  },
  progressPct: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  claimCTA: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  claimCTAText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: '#1F3027',
    letterSpacing: 0.2,
  },
  morningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  morningText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: '#FFFFFF',
  },

  // ─── Variante locked ───
  cardLocked: {
    backgroundColor: '#EFEEE7',
    padding: spacing.lg,
    minHeight: 90,
  },
  lockedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockedIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedCategory: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  lockedTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 2,
  },
  lockedHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // ─── Variante claimed ───
  cardClaimed: {
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    paddingLeft: spacing.lg + 4,
    borderWidth: 1,
    borderColor: 'rgba(45,90,61,0.20)',
  },
  claimedAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#2D5A3D',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  claimedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  claimedIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(45,90,61,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedCategory: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  claimedTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    marginTop: 2,
  },
  claimedBadge: {
    backgroundColor: 'rgba(45,90,61,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  claimedBadgeText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 12,
    color: '#2D5A3D',
  },

  // Section title
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#2D5A3D',
    paddingHorizontal: spacing.xl,
    marginBottom: 4,
    marginTop: spacing.sm,
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
  whyContent: { flex: 1 },
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
