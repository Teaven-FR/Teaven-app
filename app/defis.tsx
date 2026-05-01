// Page Défis Teaven — Mosaïque magazine (Consortium 2026-05-01, Option C)
// Layout 2 colonnes, hauteurs variables selon importance, distribution équilibrée.
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

/**
 * Hauteur d'une card selon son état — pour l'effet mosaïque magazine.
 * Plus la card est importante (en cours, presque finie), plus elle est haute.
 */
function cardHeight(ch: Challenge): number {
  if (ch.locked) return 90;
  if (ch.claimed) return 100;
  if (ch.type === 'morning_bonus') return 170; // toujours actif, mise en avant
  const pct = ch.progress / Math.max(ch.target, 1);
  if (pct >= 0.6) return 200; // presque fini = grand
  if (pct >= 0.3) return 170;
  if (pct > 0) return 150;
  return 130; // non commencé
}

/**
 * Distribution greedy en 2 colonnes pour équilibrer la mosaïque.
 * À chaque step, ajouter la card à la colonne avec la hauteur cumulée la + petite.
 */
function distributeCards(challenges: Challenge[]): { left: Challenge[]; right: Challenge[] } {
  const left: Challenge[] = [];
  const right: Challenge[] = [];
  let leftH = 0;
  let rightH = 0;
  const SPACING = 12;
  for (const ch of challenges) {
    const h = cardHeight(ch);
    if (leftH <= rightH) {
      left.push(ch);
      leftH += h + SPACING;
    } else {
      right.push(ch);
      rightH += h + SPACING;
    }
  }
  return { left, right };
}

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

// ─── Card mosaïque ───
function MosaicCard({
  challenge: ch,
  onClaim,
}: {
  challenge: Challenge;
  onClaim: () => void;
}) {
  const Icon = ICON_MAP[ch.icon] ?? Trophy;
  const isMorning = ch.type === 'morning_bonus';
  const isDone = ch.completed || (!isMorning && ch.progress >= ch.target);
  const isReadyToClaim = !ch.locked && !ch.claimed && isDone && !isMorning;
  const pct = isMorning ? 100 : Math.min(100, Math.round((ch.progress / Math.max(ch.target, 1)) * 100));

  const gradient = CATEGORY_GRADIENT[ch.uiCategory] ?? CATEGORY_GRADIENT.fidelite;
  const categoryLabel = CATEGORY_LABELS[ch.uiCategory] ?? 'Défi';
  const height = cardHeight(ch);

  if (ch.locked) {
    return (
      <View style={[styles.card, styles.cardLocked, { height }]}>
        <View style={styles.lockedCenter}>
          <Lock size={18} color={colors.textMuted} strokeWidth={1.8} />
          <Text style={styles.lockedTitle} numberOfLines={2}>{ch.title}</Text>
        </View>
      </View>
    );
  }

  if (ch.claimed) {
    return (
      <View style={[styles.card, styles.cardClaimed, { height }]}>
        <View style={styles.claimedCenter}>
          <View style={styles.claimedCheckCircle}>
            <Check size={18} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text style={styles.claimedTitleText} numberOfLines={2}>{ch.title}</Text>
          <Text style={styles.claimedReward}>+{ch.reward} pts</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable onPress={isReadyToClaim ? onClaim : undefined} style={[{ height }]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, styles.cardActive]}
      >
        {/* Decor */}
        <View style={styles.decorIconWrap} pointerEvents="none">
          <Icon
            size={Math.round(height * 0.7)}
            color="rgba(255,255,255,0.10)"
            strokeWidth={1.2}
          />
        </View>
        <View style={[styles.decorDot, styles.decorDot1]} />
        <View style={[styles.decorDot, styles.decorDot2]} />

        {/* Top : reward badge */}
        <View style={styles.topRow}>
          <View style={styles.categoryPill}>
            <Sparkles size={8} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.categoryPillText}>{categoryLabel}</Text>
          </View>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>+{ch.reward}</Text>
          </View>
        </View>

        {/* Centre : titre */}
        <View style={styles.centerBlock}>
          <Text style={styles.title} numberOfLines={3}>{ch.title}</Text>
        </View>

        {/* Bottom : progress + status */}
        <View style={styles.bottomBlock}>
          {!isMorning ? (
            <>
              <View style={styles.progressRow}>
                <Text style={styles.progressFraction}>
                  {ch.progress}<Text style={styles.progressFractionDim}>/{ch.target}</Text>
                </Text>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.max(8, pct)}%` as any }]} />
              </View>
              {isReadyToClaim && (
                <View style={styles.claimCTA}>
                  <Text style={styles.claimCTAText}>Réclamer</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.morningBadge}>
              <Flame size={10} color="#FFD89A" strokeWidth={2.4} />
              <Text style={styles.morningText}>8h-11h</Text>
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
  const { left, right } = useMemo(() => distributeCards(sorted), [sorted]);

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

      {/* Mosaïque */}
      {!loading && sorted.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Vos cartes défis</Text>
          <Text style={styles.sectionDesc}>
            Toutes actives. Les plus avancées sont mises en avant.
          </Text>

          <View style={styles.mosaicWrap}>
            <View style={styles.mosaicColumn}>
              {left.map((ch) => (
                <MosaicCard
                  key={ch.id}
                  challenge={ch}
                  onClaim={() => showToast(`+${ch.reward} pts crédités !`)}
                />
              ))}
            </View>
            <View style={styles.mosaicColumn}>
              {right.map((ch) => (
                <MosaicCard
                  key={ch.id}
                  challenge={ch}
                  onClaim={() => showToast(`+${ch.reward} pts crédités !`)}
                />
              ))}
            </View>
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

  // Stats hero
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

  // Section
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#2D5A3D',
    paddingHorizontal: spacing.xl,
    marginBottom: 4,
    marginTop: spacing.md,
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

  // ─── Mosaïque ───
  mosaicWrap: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: 12,
    marginBottom: spacing.xxxl,
  },
  mosaicColumn: {
    flex: 1,
    gap: 12,
  },

  // Card commune
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#1F3027',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cardActive: {
    padding: 14,
    justifyContent: 'space-between',
  },

  // Decor
  decorIconWrap: {
    position: 'absolute',
    top: -10,
    right: -20,
    transform: [{ rotate: '-12deg' }],
  },
  decorDot: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  decorDot1: { width: 30, height: 30, top: 12, left: -8 },
  decorDot2: { width: 20, height: 20, bottom: 25, right: 25 },

  // Top
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    fontFamily: fonts.bold,
    fontSize: 8.5,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rewardBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  rewardText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
    color: '#1F3027',
  },

  // Center
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    lineHeight: 18,
  },

  // Bottom
  bottomBlock: { gap: 6 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressFraction: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  progressFractionDim: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
  },
  progressPct: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  claimCTA: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  claimCTAText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: '#1F3027',
  },
  morningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  morningText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // ─── Variantes ───
  cardLocked: {
    backgroundColor: '#EFEEE7',
    padding: 12,
    justifyContent: 'center',
  },
  lockedCenter: {
    alignItems: 'center',
    gap: 6,
  },
  lockedTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },

  cardClaimed: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(45,90,61,0.20)',
    justifyContent: 'center',
  },
  claimedCenter: {
    alignItems: 'center',
    gap: 6,
  },
  claimedCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2D5A3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedTitleText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 15,
  },
  claimedReward: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
    color: '#2D5A3D',
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
