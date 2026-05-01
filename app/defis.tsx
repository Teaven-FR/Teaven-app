// Page Défis Teaven — Mosaïque magazine avec photos (Option C+)
// Layout 2 colonnes, cards immersives avec photo en arrière-plan + overlay.
import { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ImageBackground,
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

// Photos Unsplash food/café — une par défi pour visuel diversifié.
// URLs avec query params pour optimiser taille (w=600&q=70).
const CHALLENGE_IMAGES: Record<string, string> = {
  // Régularité (fidelite)
  default_fidelite: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=70', // café latte
  // Variations par défi spécifique
  'serie-de-3': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=70', // café latte
  'serie-de-5': 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&q=70', // table cafe
  'marathonien': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=70', // running cafe
  '3-commandes-cette-semaine': 'https://images.unsplash.com/photo-1525629857904-35e84e6f6b3a?w=600&q=70', // matcha
  'rituel-du-matin': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=70', // matin
  'rechargez-votre-wallet': 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=600&q=70', // pastry
  'premier-parrainage': 'https://images.unsplash.com/photo-1542059404-149f8a4f3edd?w=600&q=70', // friends cafe
  // Catégories fallback
  default_boissons: 'https://images.unsplash.com/photo-1525629857904-35e84e6f6b3a?w=600&q=70',
  'decouverte-matcha': 'https://images.unsplash.com/photo-1525629857904-35e84e6f6b3a?w=600&q=70', // matcha
  default_food: 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=600&q=70',
  default_social: 'https://images.unsplash.com/photo-1542059404-149f8a4f3edd?w=600&q=70',
};

function imageForChallenge(ch: Challenge): string {
  // Slug-ify le titre pour matcher les clés
  const slug = ch.title.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return CHALLENGE_IMAGES[slug]
    ?? CHALLENGE_IMAGES[`default_${ch.uiCategory}`]
    ?? CHALLENGE_IMAGES.default_fidelite;
}

const CATEGORY_LABELS: Record<string, string> = {
  fidelite: 'Régularité',
  boissons: 'Explorateur',
  food: 'Mensuel',
  social: 'Social',
};

const CATEGORY_ACCENT: Record<string, string> = {
  fidelite: '#2D5A3D',
  boissons: '#C4845C',
  food: '#C4A962',
  social: '#7EA5A0',
};

const WHY_ITEMS = [
  { icon: Leaf, title: 'Découverte', text: 'Explorer notre carte et oser de nouvelles saveurs.' },
  { icon: Flame, title: 'Régularité', text: 'Récompenser votre fidélité au quotidien.' },
  { icon: Star, title: 'Ludique', text: 'Rendre chaque commande une petite aventure.' },
  { icon: Zap, title: 'Bonus', text: 'Gagner des points en plus de la fidélité classique.' },
];

function cardHeight(ch: Challenge): number {
  if (ch.locked) return 110;
  if (ch.claimed) return 120;
  if (ch.type === 'morning_bonus') return 200;
  const pct = ch.progress / Math.max(ch.target, 1);
  if (pct >= 0.6) return 220; // tall pour les défis presque finis
  if (pct >= 0.3) return 190;
  if (pct > 0) return 170;
  return 150;
}

function distributeCards(challenges: Challenge[]): { left: Challenge[]; right: Challenge[] } {
  const left: Challenge[] = [];
  const right: Challenge[] = [];
  let leftH = 0;
  let rightH = 0;
  for (const ch of challenges) {
    const h = cardHeight(ch);
    if (leftH <= rightH) {
      left.push(ch);
      leftH += h + 12;
    } else {
      right.push(ch);
      rightH += h + 12;
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

// ─── Card avec photo ───
function PhotoCard({
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

  const categoryLabel = CATEGORY_LABELS[ch.uiCategory] ?? 'Défi';
  const accent = CATEGORY_ACCENT[ch.uiCategory] ?? '#2D5A3D';
  const height = cardHeight(ch);

  // Variante locked : carte sombre avec lock + titre
  if (ch.locked) {
    return (
      <View style={[styles.card, styles.cardLocked, { height }]}>
        <View style={styles.lockedContent}>
          <Lock size={20} color={colors.textMuted} strokeWidth={1.8} />
          <Text style={styles.lockedTitle} numberOfLines={2}>{ch.title}</Text>
          <Text style={styles.lockedHint}>Verrouillé</Text>
        </View>
      </View>
    );
  }

  // Variante claimed : carte blanche bordée + check
  if (ch.claimed) {
    return (
      <View style={[styles.card, styles.cardClaimed, { height, borderColor: accent }]}>
        <View style={styles.claimedContent}>
          <View style={[styles.claimedCheckCircle, { backgroundColor: accent }]}>
            <Check size={20} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text style={styles.claimedTitleText} numberOfLines={2}>{ch.title}</Text>
          <Text style={[styles.claimedReward, { color: accent }]}>+{ch.reward} pts</Text>
        </View>
      </View>
    );
  }

  // Active card : ImageBackground avec photo + overlay gradient + texte devant
  return (
    <Pressable onPress={isReadyToClaim ? onClaim : undefined}>
      <ImageBackground
        source={{ uri: imageForChallenge(ch) }}
        style={[styles.card, styles.cardActive, { height }]}
        imageStyle={{ borderRadius: 18 }}
        resizeMode="cover"
      >
        {/* Overlay gradient bottom→top pour lisibilité du texte */}
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top row : icone catégorie + reward */}
        <View style={styles.topRow}>
          <View style={[styles.iconCircle, { backgroundColor: accent }]}>
            <Icon size={14} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>+{ch.reward}</Text>
            <Text style={styles.rewardLabel}>pts</Text>
          </View>
        </View>

        {/* Bottom : catégorie + titre + progress */}
        <View style={styles.bottomBlock}>
          <Text style={styles.categoryLabel}>{categoryLabel}</Text>
          <Text style={styles.title} numberOfLines={2}>{ch.title}</Text>

          {!isMorning ? (
            <>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${Math.max(8, pct)}%` as any, backgroundColor: '#FFFFFF' }]}
                />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressFraction}>
                  {ch.progress}<Text style={styles.progressFractionDim}>/{ch.target}</Text>
                </Text>
                <Text style={styles.progressPct}>{pct}%</Text>
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
              <Text style={styles.morningText}>Tous les matins · 8h-11h</Text>
            </View>
          )}
        </View>
      </ImageBackground>
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

      {!loading && sorted.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Vos cartes défis</Text>
          <Text style={styles.sectionDesc}>
            Toutes actives. Les plus avancées sont mises en avant.
          </Text>

          <View style={styles.mosaicWrap}>
            <View style={styles.mosaicColumn}>
              {left.map((ch) => (
                <PhotoCard
                  key={ch.id}
                  challenge={ch}
                  onClaim={() => showToast(`+${ch.reward} pts crédités !`)}
                />
              ))}
            </View>
            <View style={styles.mosaicColumn}>
              {right.map((ch) => (
                <PhotoCard
                  key={ch.id}
                  challenge={ch}
                  onClaim={() => showToast(`+${ch.reward} pts crédités !`)}
                />
              ))}
            </View>
          </View>
        </>
      )}

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

  // ─── Card avec photo ───
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
    backgroundColor: '#1F3027', // fallback si image ne charge pas
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rewardText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 12,
    color: '#1F3027',
  },
  rewardLabel: {
    fontFamily: fonts.regular,
    fontSize: 8.5,
    color: '#1F3027',
    marginTop: -2,
  },

  bottomBlock: { gap: 5 },
  categoryLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    lineHeight: 19,
    marginBottom: 4,
  },
  progressBar: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 2,
  },
  progressFraction: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  progressFractionDim: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10.5,
  },
  progressPct: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  claimCTA: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 6,
  },
  claimCTAText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#1F3027',
  },
  morningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  morningText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ─── Variantes ───
  cardLocked: {
    backgroundColor: '#EFEEE7',
    padding: 14,
    justifyContent: 'center',
  },
  lockedContent: {
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
  lockedHint: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  cardClaimed: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  claimedContent: {
    alignItems: 'center',
    gap: 6,
  },
  claimedCheckCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
