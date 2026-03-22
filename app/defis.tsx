// Page Défis Teaven — philosophie, liste des défis actifs, progression
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
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
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { colors, fonts, spacing, shadows, radii } from '@/constants/theme';

interface Challenge {
  id: string;
  icon: 'flame' | 'trophy' | 'leaf' | 'coffee' | 'heart' | 'star' | 'users';
  title: string;
  description: string;
  objective: string;
  progress: number;
  target: number;
  reward: number;
  duration: string;
  claimed: boolean;
  category: 'boissons' | 'food' | 'fidelite' | 'social';
}

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
  users: '#5B7FBF',
};

const INITIAL_CHALLENGES: Challenge[] = [
  {
    id: 'c1',
    icon: 'coffee',
    title: 'Découverte Matcha',
    description: 'Commandez 3 boissons matcha différentes',
    objective: '3 matchas distincts',
    progress: 1,
    target: 3,
    reward: 150,
    duration: '14 jours',
    claimed: false,
    category: 'boissons',
  },
  {
    id: 'c2',
    icon: 'trophy',
    title: 'Brunch Addict',
    description: 'Commandez 5 formules brunch',
    objective: '5 formules',
    progress: 2,
    target: 5,
    reward: 200,
    duration: '30 jours',
    claimed: false,
    category: 'food',
  },
  {
    id: 'c3',
    icon: 'leaf',
    title: 'Tea Explorer',
    description: 'Goûtez 4 thés différents de notre carte',
    objective: '4 thés distincts',
    progress: 4,
    target: 4,
    reward: 120,
    duration: '21 jours',
    claimed: false,
    category: 'boissons',
  },
  {
    id: 'c4',
    icon: 'heart',
    title: 'Sweet Tooth',
    description: 'Commandez 3 pâtisseries différentes',
    objective: '3 pâtisseries',
    progress: 1,
    target: 3,
    reward: 100,
    duration: '14 jours',
    claimed: false,
    category: 'food',
  },
  {
    id: 'c5',
    icon: 'flame',
    title: 'Fidèle du matin',
    description: 'Passez commande 7 jours consécutifs',
    objective: '7 jours streak',
    progress: 3,
    target: 7,
    reward: 300,
    duration: '7 jours',
    claimed: false,
    category: 'fidelite',
  },
  {
    id: 'c6',
    icon: 'users',
    title: 'Ambassadeur',
    description: 'Parrainez 3 amis qui créent leur compte',
    objective: '3 parrainages',
    progress: 0,
    target: 3,
    reward: 500,
    duration: '60 jours',
    claimed: false,
    category: 'social',
  },
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
  const { loyalty, updateProfile } = useUser();
  const { showToast } = useToast();

  const [challenges, setChallenges] = useState<Challenge[]>(INITIAL_CHALLENGES);

  const claimChallenge = (ch: Challenge) => {
    if (ch.claimed || ch.progress < ch.target) return;
    setChallenges((prev) =>
      prev.map((c) => (c.id === ch.id ? { ...c, claimed: true } : c)),
    );
    updateProfile({ loyaltyPoints: loyalty.points + ch.reward });
    showToast(`+${ch.reward} pts crédités !`);
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

      {/* Hero */}
      <LinearGradient
        colors={['#2C4A32', '#4A6B50']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroDecor} />
        <View style={styles.heroDecor2} />
        <Trophy size={36} color="rgba(255,255,255,0.9)" strokeWidth={1.3} style={{ marginBottom: spacing.lg }} />
        <Text style={styles.heroTitle}>Relevez nos défis</Text>
        <Text style={styles.heroText}>
          Chez Teaven, on croit que chaque découverte mérite d'être célébrée. Relevez nos défis, explorez notre carte et gagnez des points bonus à chaque étape.
        </Text>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>
            {challenges.filter((c) => c.progress > 0 && !c.claimed).length} défis en cours
          </Text>
        </View>
      </LinearGradient>

      {/* Défis en cours */}
      <Text style={styles.sectionTitle}>Défis en cours</Text>
      <View style={styles.challengesList}>
        {challenges.map((ch) => {
          const Icon = ICON_MAP[ch.icon] ?? Trophy;
          const isDone = ch.progress >= ch.target;
          const pct = Math.min(100, Math.round((ch.progress / ch.target) * 100));

          return (
            <View
              key={ch.id}
              style={[styles.challengeCard, ch.claimed && styles.challengeClaimed]}
            >
              {/* Top row */}
              <View style={styles.cardTop}>
                <View style={[styles.iconWrap, { backgroundColor: ICON_BG[ch.icon] }]}>
                  <Icon size={20} color={ICON_COLOR[ch.icon]} strokeWidth={1.5} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{ch.title}</Text>
                  <Text style={styles.cardDesc}>{ch.description}</Text>
                </View>
                <View style={styles.rewardBadge}>
                  <Text style={styles.rewardText}>+{ch.reward}</Text>
                  <Text style={styles.rewardLabel}>pts</Text>
                </View>
              </View>

              {/* Progress */}
              <View style={styles.progressRow}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                </View>
                <Text style={styles.progressCount}>{ch.progress}/{ch.target}</Text>
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.durationText}>{ch.duration}</Text>
                {isDone && !ch.claimed ? (
                  <Pressable
                    onPress={() => claimChallenge(ch)}
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
                ) : ch.progress === 0 ? (
                  <View style={styles.notStartedRow}>
                    <Lock size={12} color={colors.textMuted} strokeWidth={1.5} />
                    <Text style={styles.notStartedText}>Non commencé</Text>
                  </View>
                ) : (
                  <Text style={styles.inProgressText}>En cours ({pct}%)</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Pourquoi des défis */}
      <Text style={styles.sectionTitle}>Pourquoi des défis ?</Text>
      <View style={styles.whyCard}>
        {WHY_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <View key={i} style={[styles.whyRow, i < WHY_ITEMS.length - 1 && styles.whyRowBorder]}>
              <View style={styles.whyIcon}>
                <Icon size={16} color={colors.green} strokeWidth={1.8} />
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
    borderRadius: 20,
    padding: spacing.xxl,
    marginBottom: spacing.xxxl,
    overflow: 'hidden',
    alignItems: 'center',
    ...shadows.loyalty,
  },
  heroDecor: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  heroText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Section title
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
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
  progressCount: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
    minWidth: 32,
    textAlign: 'right',
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
    backgroundColor: colors.greenLight,
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
