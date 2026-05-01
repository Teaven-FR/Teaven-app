// Page Défis Teaven — Wallet stack vrai pattern Apple Wallet
// 1 card active full + rabats des cards rangées dessous
import { useState, useEffect, useMemo } from 'react';
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

const CATEGORY_GRADIENT: Record<string, [string, string, string]> = {
  fidelite: ['#1F3027', '#2D5A3D', '#3A6642'],
  boissons: ['#A56843', '#C4845C', '#D89F76'],
  food: ['#9B8540', '#C4A962', '#D8C285'],
  social: ['#5C8580', '#7EA5A0', '#9DBDB9'],
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

// ─── Card ACTIVE — totalement visible, tous les détails ───
function WalletCardActive({ challenge: ch, onClaim }: { challenge: Challenge; onClaim: () => void }) {
  const Icon = ICON_MAP[ch.icon] ?? Trophy;
  const isMorning = ch.type === 'morning_bonus';
  const isDone = ch.completed || (!isMorning && ch.progress >= ch.target);
  const isReadyToClaim = !ch.locked && !ch.claimed && isDone && !isMorning;
  const pct = isMorning ? 100 : Math.min(100, Math.round((ch.progress / Math.max(ch.target, 1)) * 100));

  const gradient = CATEGORY_GRADIENT[ch.uiCategory] ?? CATEGORY_GRADIENT.fidelite;
  const categoryLabel = CATEGORY_LABELS[ch.uiCategory] ?? 'Défi';

  if (ch.locked) {
    return (
      <View style={[styles.activeCard, styles.activeCardLocked]}>
        <View style={styles.activeIconWrapLocked}>
          <Lock size={22} color={colors.textMuted} strokeWidth={1.8} />
        </View>
        <Text style={styles.activeCategoryLocked}>{categoryLabel}</Text>
        <Text style={styles.activeTitleLocked}>{ch.title}</Text>
        <Text style={styles.activeLockedDesc}>Ce défi se débloque après en avoir terminé un autre</Text>
      </View>
    );
  }

  if (ch.claimed) {
    return (
      <View style={[styles.activeCard, styles.activeCardClaimed]}>
        <View style={styles.activeIconWrapClaimed}>
          <Check size={26} color="#2D5A3D" strokeWidth={2.5} />
        </View>
        <Text style={[styles.activeCategoryActive, { color: colors.textSecondary }]}>{categoryLabel}</Text>
        <Text style={styles.activeTitleClaimed}>{ch.title}</Text>
        <Text style={styles.activeClaimedReward}>+{ch.reward} pts crédités</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.activeCard}
    >
      <View style={styles.activeDecor} />
      <View style={styles.activeDecor2} />

      {/* Header */}
      <View style={styles.activeHeader}>
        <View style={styles.activeIconWrap}>
          <Icon size={20} color="#FFF" strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.activeCategoryActive}>{categoryLabel}</Text>
          <Text style={styles.activeTitleActive}>{ch.title}</Text>
        </View>
        <View style={styles.activeRewardBadge}>
          <Text style={styles.activeRewardText}>+{ch.reward}</Text>
          <Text style={styles.activeRewardLabel}>pts</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.activeDescription}>{ch.description}</Text>

      {/* Progress */}
      {!isMorning && (
        <View style={styles.activeProgressBlock}>
          <View style={styles.activeProgressRow}>
            <Text style={styles.activeProgressFraction}>
              {ch.progress}<Text style={styles.activeProgressFractionDim}>/{ch.target}</Text>
            </Text>
            <Text style={styles.activeProgressPct}>{pct}%</Text>
          </View>
          <View style={styles.activeProgressBar}>
            <View style={[styles.activeProgressFill, { width: `${Math.max(8, pct)}%` as any }]} />
          </View>
        </View>
      )}

      {/* Status / CTA */}
      {isReadyToClaim ? (
        <Pressable onPress={onClaim} style={styles.activeClaimBtn}>
          <Text style={styles.activeClaimText}>Réclamer {ch.reward} pts</Text>
        </Pressable>
      ) : isMorning ? (
        <View style={styles.activeStatusRow}>
          <Flame size={12} color="#FFD89A" strokeWidth={2.4} />
          <Text style={styles.activeStatusText}>
            Actif chaque matin entre 8h et 11h · {ch.progress} commande{ch.progress > 1 ? 's' : ''}
          </Text>
        </View>
      ) : (
        <Text style={styles.activeRecurrenceText}>
          {ch.isRecurring ? 'Mensuel · se réinitialise chaque mois' : 'À compléter une fois'}
        </Text>
      )}
    </LinearGradient>
  );
}

// ─── Card COLLAPSED — rabat (60-70px) avec juste le top ───
function WalletCardCollapsed({
  challenge: ch,
  onTap,
  index,
}: {
  challenge: Challenge;
  onTap: () => void;
  index: number;
}) {
  const Icon = ICON_MAP[ch.icon] ?? Trophy;
  const gradient = CATEGORY_GRADIENT[ch.uiCategory] ?? CATEGORY_GRADIENT.fidelite;
  const categoryLabel = CATEGORY_LABELS[ch.uiCategory] ?? 'Défi';
  const pct = ch.type === 'morning_bonus' ? 100 : Math.min(100, Math.round((ch.progress / Math.max(ch.target, 1)) * 100));

  // Effet stack : décalage léger croissant pour donner l'illusion de profondeur
  const stackOffset = index * 1.5;

  if (ch.locked) {
    return (
      <Pressable onPress={onTap} style={[styles.collapsedCard, styles.collapsedCardLocked, { transform: [{ scale: 1 - stackOffset / 100 }] }]}>
        <View style={styles.collapsedRow}>
          <View style={styles.collapsedIconLocked}>
            <Lock size={13} color={colors.textMuted} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.collapsedCategoryLocked}>{categoryLabel}</Text>
            <Text style={styles.collapsedTitleLocked} numberOfLines={1}>{ch.title}</Text>
          </View>
          <Text style={styles.collapsedLockedHint}>Verrouillé</Text>
        </View>
      </Pressable>
    );
  }

  if (ch.claimed) {
    return (
      <Pressable onPress={onTap} style={[styles.collapsedCard, styles.collapsedCardClaimed]}>
        <View style={styles.collapsedRow}>
          <View style={styles.collapsedIconClaimed}>
            <Check size={13} color="#2D5A3D" strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.collapsedCategoryClaimed}>{categoryLabel}</Text>
            <Text style={styles.collapsedTitleClaimed} numberOfLines={1}>{ch.title}</Text>
          </View>
          <Text style={styles.collapsedClaimedReward}>+{ch.reward}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onTap} accessibilityRole="button" accessibilityLabel={`Activer la carte ${ch.title}`}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.collapsedCard}
      >
        <View style={styles.collapsedRow}>
          <View style={styles.collapsedIconActive}>
            <Icon size={14} color="#FFF" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.collapsedCategoryActive}>{categoryLabel}</Text>
            <Text style={styles.collapsedTitleActive} numberOfLines={1}>{ch.title}</Text>
          </View>
          <View style={styles.collapsedRight}>
            <Text style={styles.collapsedReward}>+{ch.reward}</Text>
            {ch.type !== 'morning_bonus' && (
              <Text style={styles.collapsedPct}>{pct}%</Text>
            )}
          </View>
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

  const [activeId, setActiveId] = useState<string | null>(null);

  // Au premier chargement, sélectionner la première card (ou laisser null)
  useEffect(() => {
    if (!activeId && sorted.length > 0) {
      setActiveId(sorted[0].id);
    }
  }, [sorted, activeId]);

  const activeChallenge = sorted.find((c) => c.id === activeId) ?? sorted[0];
  const collapsedChallenges = sorted.filter((c) => c.id !== activeChallenge?.id);

  const inProgressCount = challenges.filter((c) => c.progress > 0 && !c.claimed && !c.locked).length;
  const completedCount = challenges.filter((c) => c.claimed).length;
  const totalPointsFromChallenges = challenges
    .filter((c) => c.claimed)
    .reduce((sum, c) => sum + c.reward, 0);

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

      {/* Hero */}
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
          Vos défis du mois rangés dans votre portefeuille. Tapez une carte pour la mettre en avant.
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

      {/* Wallet section */}
      {!loading && activeChallenge && (
        <View style={styles.walletSection}>
          {/* Card active — totalement visible */}
          <WalletCardActive
            challenge={activeChallenge}
            onClaim={() => {
              showToast(`+${activeChallenge.reward} pts crédités !`);
            }}
          />

          {/* Stack des cards collapsed */}
          {collapsedChallenges.length > 0 && (
            <View style={styles.collapsedStack}>
              <Text style={styles.stackHint}>Vos {collapsedChallenges.length} autres cartes</Text>
              {collapsedChallenges.map((ch, i) => (
                <View
                  key={ch.id}
                  style={{
                    marginTop: i === 0 ? 0 : -10,
                    zIndex: collapsedChallenges.length - i,
                    elevation: collapsedChallenges.length - i,
                  }}
                >
                  <WalletCardCollapsed
                    challenge={ch}
                    onTap={() => setActiveId(ch.id)}
                    index={i}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
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

  // Wallet section
  walletSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxxl,
  },

  // ─── Card ACTIVE (full) ───
  activeCard: {
    borderRadius: 22,
    padding: spacing.xl,
    minHeight: 220,
    overflow: 'hidden',
    shadowColor: '#1F3027',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 14,
    gap: 14,
  },
  activeCardLocked: {
    backgroundColor: '#EFEEE7',
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  activeCardClaimed: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(45,90,61,0.25)',
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  activeDecor: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  activeDecor2: {
    position: 'absolute',
    bottom: -30,
    left: -25,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapLocked: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapClaimed: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(45,90,61,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCategoryActive: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  activeCategoryLocked: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  activeTitleActive: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  activeTitleLocked: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  activeTitleClaimed: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  activeLockedDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    fontStyle: 'italic',
  },
  activeClaimedReward: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#2D5A3D',
  },
  activeRewardBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeRewardText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 16,
    color: '#1F3027',
  },
  activeRewardLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#1F3027',
    marginTop: -2,
  },
  activeDescription: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  activeProgressBlock: {
    gap: 6,
  },
  activeProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  activeProgressFraction: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 24,
    color: '#FFFFFF',
  },
  activeProgressFractionDim: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  activeProgressPct: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFD89A',
    letterSpacing: 0.4,
  },
  activeProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  activeProgressFill: {
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  activeStatusText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  activeRecurrenceText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontStyle: 'italic',
  },
  activeClaimBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  activeClaimText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#1F3027',
    letterSpacing: 0.2,
  },

  // ─── Stack collapsed ───
  collapsedStack: {
    marginTop: spacing.lg,
    gap: 0,
  },
  stackHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },

  // Card collapsed (rabat)
  collapsedCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 60,
    overflow: 'hidden',
    shadowColor: '#1F3027',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  collapsedCardLocked: {
    backgroundColor: '#EFEEE7',
    opacity: 0.85,
  },
  collapsedCardClaimed: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(45,90,61,0.25)',
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  collapsedIconActive: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedIconLocked: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedIconClaimed: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(45,90,61,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedCategoryActive: {
    fontFamily: fonts.regular,
    fontSize: 8.5,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  collapsedCategoryLocked: {
    fontFamily: fonts.regular,
    fontSize: 8.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  collapsedCategoryClaimed: {
    fontFamily: fonts.regular,
    fontSize: 8.5,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  collapsedTitleActive: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 1,
  },
  collapsedTitleLocked: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  collapsedTitleClaimed: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
    marginTop: 1,
  },
  collapsedRight: {
    alignItems: 'flex-end',
    gap: 1,
  },
  collapsedReward: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  collapsedPct: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.7)',
  },
  collapsedLockedHint: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  collapsedClaimedReward: {
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
