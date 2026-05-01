// Page Défis Teaven — Mon wallet de défis (stack style Apple Wallet)
import { useState } from 'react';
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
  ChevronDown,
  ChevronUp,
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

// Couleur signature par CATÉGORIE de défi (pillar colors Teaven)
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

/**
 * Tri pour wallet stack :
 * 1. Locked → en bas
 * 2. Claimed → bas
 * 3. En cours (progress > 0) → top
 * 4. Par % progression décroissant
 */
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

interface WalletCardProps {
  challenge: Challenge;
  expanded: boolean;
  onTap: () => void;
  onClaim: () => void;
}

function WalletCard({ challenge: ch, expanded, onTap, onClaim }: WalletCardProps) {
  const Icon = ICON_MAP[ch.icon] ?? Trophy;
  const isMorning = ch.type === 'morning_bonus';
  const isDone = ch.completed || (!isMorning && ch.progress >= ch.target);
  const isReadyToClaim = !ch.locked && !ch.claimed && isDone && !isMorning;
  const pct = isMorning ? 100 : Math.min(100, Math.round((ch.progress / Math.max(ch.target, 1)) * 100));

  const gradient = CATEGORY_GRADIENT[ch.uiCategory] ?? CATEGORY_GRADIENT.fidelite;
  const categoryLabel = CATEGORY_LABELS[ch.uiCategory] ?? 'Défi';

  // Variantes visuelles selon état
  if (ch.locked) {
    return (
      <Pressable onPress={onTap} style={[styles.walletCard, styles.walletCardLocked]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircleLocked}>
            <Lock size={16} color={colors.textMuted} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardCategory}>{categoryLabel}</Text>
            <Text style={[styles.cardTitle, { color: colors.textMuted }]} numberOfLines={1}>
              {ch.title}
            </Text>
          </View>
          <Text style={styles.cardLockedHint}>Verrouillé</Text>
        </View>
      </Pressable>
    );
  }

  if (ch.claimed) {
    return (
      <Pressable onPress={onTap} style={[styles.walletCard, styles.walletCardClaimed]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircleClaimed}>
            <Check size={16} color={colors.green} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardCategory}>{categoryLabel}</Text>
            <Text style={styles.cardTitleClaimed} numberOfLines={1}>{ch.title}</Text>
          </View>
          <Text style={styles.cardClaimedReward}>+{ch.reward} pts</Text>
        </View>
      </Pressable>
    );
  }

  // Active card (en cours, non commencé, ou morning_bonus) : gradient catégorie
  return (
    <Pressable onPress={onTap}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.walletCard, styles.walletCardActive]}
      >
        <View style={styles.cardDecor} />
        <View style={styles.cardDecor2} />

        {/* Header — toujours visible */}
        <View style={styles.cardHeader}>
          <View style={styles.iconCircleActive}>
            <Icon size={16} color="#FFF" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardCategoryActive}>{categoryLabel}</Text>
            <Text style={styles.cardTitleActive} numberOfLines={1}>{ch.title}</Text>
          </View>
          <View style={styles.rewardBadgeActive}>
            <Text style={styles.rewardTextActive}>+{ch.reward}</Text>
            <Text style={styles.rewardLabelActive}>pts</Text>
          </View>
        </View>

        {/* Progress bar — toujours visible (la "tranche") */}
        {!isMorning && (
          <View style={styles.cardProgressRow}>
            <View style={styles.cardProgressBar}>
              <View style={[styles.cardProgressFill, { width: `${Math.max(8, pct)}%` as any }]} />
            </View>
            <Text style={styles.cardProgressFraction}>
              {ch.progress}<Text style={styles.cardProgressFractionDim}>/{ch.target}</Text>
            </Text>
          </View>
        )}

        {/* Bottom row — visible */}
        <View style={styles.cardBottomRow}>
          {isMorning ? (
            <View style={styles.cardStatusPill}>
              <Flame size={10} color="#FFD89A" strokeWidth={2.4} />
              <Text style={styles.cardStatusText}>Actif tous les matins</Text>
            </View>
          ) : isReadyToClaim ? (
            <View style={[styles.cardStatusPill, styles.cardStatusPillReady]}>
              <Star size={10} color="#FFF" strokeWidth={2.4} />
              <Text style={styles.cardStatusText}>Prêt à réclamer</Text>
            </View>
          ) : ch.progress > 0 ? (
            <View style={styles.cardStatusPill}>
              <Text style={styles.cardStatusText}>En cours · {pct}%</Text>
            </View>
          ) : (
            <View style={styles.cardStatusPill}>
              <Text style={styles.cardStatusText}>À démarrer</Text>
            </View>
          )}

          <View style={styles.cardChevron}>
            {expanded
              ? <ChevronUp size={14} color="#FFF" strokeWidth={2.5} />
              : <ChevronDown size={14} color="#FFF" strokeWidth={2.5} />}
          </View>
        </View>

        {/* Expanded zone — description + claim button */}
        {expanded && (
          <View style={styles.cardExpanded}>
            <Text style={styles.cardDescription}>{ch.description}</Text>
            <Text style={styles.cardRecurrence}>
              {isMorning
                ? 'Bonus à chaque commande entre 8h et 11h'
                : ch.isRecurring
                  ? 'Défi mensuel — se réinitialise chaque mois'
                  : 'Défi à compléter une fois'}
            </Text>
            {isReadyToClaim && (
              <Pressable
                onPress={(e) => { e.stopPropagation(); onClaim(); }}
                style={styles.claimBtnExpanded}
              >
                <Text style={styles.claimBtnExpandedText}>
                  Réclamer {ch.reward} pts
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export default function DefisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { challenges, loading } = useChallenges();
  const { showToast } = useToast();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const inProgressCount = challenges.filter((c) => c.progress > 0 && !c.claimed && !c.locked).length;
  const completedCount = challenges.filter((c) => c.claimed).length;
  const totalPointsFromChallenges = challenges
    .filter((c) => c.claimed)
    .reduce((sum, c) => sum + c.reward, 0);

  const sorted = sortChallenges(challenges);

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
        <Text style={styles.headerTitle}>Mes défis</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Hero — stats user iconiques */}
      <LinearGradient
        colors={['#1F3027', '#2D5A3D', '#3A6642']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroDecor} />
        <View style={styles.heroDecor2} />

        <View style={styles.heroIconWrap}>
          <Trophy size={26} color="#FFF" strokeWidth={1.5} />
        </View>
        <Text style={styles.heroTitle}>Votre wallet de défis</Text>
        <Text style={styles.heroText}>
          Vos défis du mois, toujours actifs. Chaque commande vous fait progresser.
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

      {/* Loading */}
      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#2D5A3D" />
          <Text style={styles.loadingText}>Chargement des défis…</Text>
        </View>
      )}

      {/* Wallet stack — défis empilés style Apple Wallet */}
      {!loading && sorted.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Vos cartes défis</Text>
          <Text style={styles.sectionDesc}>
            Toutes actives. La carte la plus avancée est en haut.
          </Text>

          <View style={styles.walletStack}>
            {sorted.map((ch, i) => (
              <View
                key={ch.id}
                style={{
                  marginTop: i === 0 ? 0 : (expandedId ? 12 : -100),
                  zIndex: sorted.length - i,
                  // elevation Android : croît avec i pour que les cards du dessous restent visibles derrière
                  elevation: sorted.length - i,
                }}
              >
                <WalletCard
                  challenge={ch}
                  expanded={expandedId === ch.id}
                  onTap={() => setExpandedId((curr) => (curr === ch.id ? null : ch.id))}
                  onClaim={() => {
                    showToast(`+${ch.reward} pts crédités !`);
                    setExpandedId(null);
                  }}
                />
              </View>
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

  // Hero
  hero: {
    marginHorizontal: spacing.xl,
    borderRadius: 22,
    padding: spacing.xxl,
    marginBottom: spacing.xl,
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
  heroText: {
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
  heroStatDivider: {
    width: 1,
    height: 24,
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

  // Section title
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

  // ─── Wallet stack ───
  walletStack: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxxl,
  },

  // Card commune
  walletCard: {
    borderRadius: 18,
    padding: spacing.lg,
    minHeight: 140,
    overflow: 'hidden',
    shadowColor: '#1F3027',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  walletCardActive: {
    // gradient appliqué via LinearGradient
  },
  walletCardLocked: {
    backgroundColor: '#EFEEE7',
    minHeight: 80,
    paddingVertical: 14,
    opacity: 0.7,
  },
  walletCardClaimed: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(45,90,61,0.25)',
    minHeight: 80,
    paddingVertical: 14,
  },

  // Decor
  cardDecor: {
    position: 'absolute',
    top: -30,
    right: -25,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  cardDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -15,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // Header card
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconCircleActive: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleLocked: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleClaimed: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(45,90,61,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCategory: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  cardCategoryActive: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    letterSpacing: -0.2,
  },
  cardTitleActive: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  cardTitleClaimed: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  cardLockedHint: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  cardClaimedReward: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 13,
    color: '#2D5A3D',
  },

  // Reward badge
  rewardBadgeActive: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  rewardTextActive: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 14,
    color: '#1F3027',
  },
  rewardLabelActive: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: '#1F3027',
    marginTop: -1,
  },

  // Progress
  cardProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cardProgressBar: {
    flex: 1,
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  cardProgressFraction: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 16,
    color: '#FFFFFF',
    minWidth: 50,
    textAlign: 'right',
  },
  cardProgressFractionDim: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },

  // Bottom
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardStatusPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardStatusPillReady: {
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  cardStatusText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  cardChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Expanded
  cardExpanded: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    gap: 6,
  },
  cardDescription: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 17,
  },
  cardRecurrence: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontStyle: 'italic',
  },
  claimBtnExpanded: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  claimBtnExpandedText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#1F3027',
    letterSpacing: 0.2,
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
