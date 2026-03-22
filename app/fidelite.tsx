// Page Programme Fidélité — données dynamiques depuis Square
import { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Coffee, Gift, Percent, Star, Check, ChevronRight, Zap, Flame, Trophy, Lock } from 'lucide-react-native';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

interface Challenge {
  id: string;
  icon: 'flame' | 'trophy' | 'star';
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  claimed: boolean;
}

const INITIAL_CHALLENGES: Challenge[] = [
  { id: 'c1', icon: 'flame', title: 'Série en cours', description: 'Commander 5 jours consécutifs', progress: 3, target: 5, reward: 500, claimed: false },
  { id: 'c2', icon: 'trophy', title: 'Challenge Mars', description: '10 commandes ce mois-ci', progress: 4, target: 10, reward: 1000, claimed: false },
  { id: 'c3', icon: 'star', title: 'Explorateur', description: 'Essayer 3 catégories différentes', progress: 3, target: 3, reward: 300, claimed: false },
];

const LEVELS = [
  { name: 'Bronze', min: 0, color: '#C4845C', bg: '#F5ECE5' },
  { name: 'Argent', min: 200, color: '#8A8A82', bg: '#F0F0EE' },
  { name: 'Or', min: 500, color: '#C4A962', bg: '#F5F0E1' },
  { name: 'Platine', min: 1000, color: '#5B7FBF', bg: '#E8EDF7' },
];

const REWARD_COLORS = ['#C8D9CC', '#E8D5D0', '#F5EDD0', '#DDD5F0', '#D0E8F0'];

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  coffee: Coffee,
  gift: Gift,
  percent: Percent,
  star: Star,
};

const FALLBACK_REWARDS = [
  { id: '1', name: 'Boisson offerte', description: 'Thé, café ou infusion au choix', pointsCost: 200, icon: 'coffee' },
  { id: '2', name: 'Dessert offert', description: 'Pâtisserie maison au choix', pointsCost: 500, icon: 'gift' },
  { id: '3', name: '-20% sur la carte', description: 'Sur toute votre commande', pointsCost: 750, icon: 'percent' },
  { id: '4', name: 'Menu complet offert', description: 'Bowl + boisson + dessert', pointsCost: 1000, icon: 'star' },
];

export default function FideliteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isGuest, loyalty, rewards: squareRewards, accrualRules, updateProfile } = useUser();
  const { showToast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>(INITIAL_CHALLENGES);

  const displayRewards = squareRewards.length > 0 ? squareRewards : FALLBACK_REWARDS;

  const pointsAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [displayedPoints, setDisplayedPoints] = useState(0);

  useEffect(() => {
    Animated.timing(pointsAnim, {
      toValue: loyalty.points,
      duration: 1200,
      useNativeDriver: false,
    }).start();

    const listenerId = pointsAnim.addListener(({ value }) => {
      setDisplayedPoints(Math.round(value));
    });

    Animated.timing(progressAnim, {
      toValue: loyalty.progressPercent,
      duration: 1200,
      useNativeDriver: false,
    }).start();

    return () => pointsAnim.removeListener(listenerId);
  }, [loyalty.points, loyalty.progressPercent]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  /** Réclamer les points d'un défi complété */
  const claimChallenge = (challenge: Challenge) => {
    if (challenge.claimed || challenge.progress < challenge.target) return;
    setChallenges((prev) =>
      prev.map((c) => (c.id === challenge.id ? { ...c, claimed: true } : c)),
    );
    updateProfile({ loyaltyPoints: loyalty.points + challenge.reward });
    showToast(`+${challenge.reward} pts crédités !`);
  };

  const currentLevel = LEVELS.find((l) => l.name === loyalty.level) ?? LEVELS[0];
  const nextLevel = LEVELS.slice().reverse().find((l) => l.min > loyalty.points);
  const ptsToNext = nextLevel ? nextLevel.min - loyalty.points : 0;

  const displayName = isGuest ? 'Invité' : (user.fullName || 'Membre');

  // Générer les règles d'accumulation depuis Square ou fallback
  const earnItems: Array<{ pts: string; action: string }> = accrualRules.length > 0
    ? accrualRules.map((rule) => {
        if (rule.type === 'SPEND') {
          if (rule.spendAmount) {
            const euros = rule.spendAmount / 100;
            return { pts: `${rule.points} pt${rule.points > 1 ? 's' : ''}`, action: `par tranche de ${euros}€ dépensée` };
          }
          return { pts: `${rule.points} pts`, action: 'par euro dépensé' };
        }
        if (rule.type === 'VISIT') {
          return { pts: `${rule.points} pts`, action: 'par visite' };
        }
        return { pts: `${rule.points} pts`, action: 'par achat' };
      })
    : [
        { pts: '1 pt', action: 'par euro dépensé' },
        { pts: '50 pts', action: 'pour votre 1ère commande' },
        { pts: '100 pts', action: 'en parrainant un ami' },
      ];

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Programme Fidélité</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Carte membre */}
      <View style={styles.cardWrapper}>
        <LinearGradient
          colors={['#2C4A32', '#4A6B50']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.memberCard}
        >
          <View style={styles.cardDecor1} />
          <View style={styles.cardDecor2} />

          <View style={styles.cardTopRow}>
            <Text style={styles.clubLabel}>TEAVEN CLUB</Text>
            <View style={[styles.levelBadge, { backgroundColor: currentLevel.color }]}>
              <Text style={styles.levelBadgeText}>{loyalty.level.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.cardName}>{displayName}</Text>

          <View style={styles.pointsRow}>
            <Text style={styles.pointsValue}>{displayedPoints.toLocaleString('fr-FR')}</Text>
            <Text style={styles.pointsUnit}>pts</Text>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth as unknown as number }]} />
          </View>

          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>{loyalty.nextReward}</Text>
            {ptsToNext > 0 && (
              <Text style={styles.progressPts}>encore {ptsToNext} pts</Text>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Niveaux */}
      <Text style={styles.sectionTitle}>Les niveaux</Text>
      <View style={styles.levelsGrid}>
        {LEVELS.map((lvl) => {
          const isActive = lvl.name === loyalty.level;
          const isUnlocked = loyalty.points >= lvl.min;
          return (
            <View
              key={lvl.name}
              style={[
                styles.levelCard,
                isActive && { borderColor: lvl.color, borderWidth: 1.5 },
              ]}
            >
              <View style={[styles.levelDot, { backgroundColor: lvl.bg }]}>
                <Text style={[styles.levelDotText, { color: lvl.color }]}>
                  {lvl.name.charAt(0)}
                </Text>
              </View>
              <Text style={[styles.levelName, isActive && { color: lvl.color }]}>
                {lvl.name}
              </Text>
              <Text style={styles.levelPts}>
                {lvl.min === 0 ? 'Dès 0 pt' : `dès ${lvl.min} pts`}
              </Text>
              {isUnlocked && (
                <Check size={12} color={lvl.color} strokeWidth={2.5} style={{ marginTop: 4 }} />
              )}
            </View>
          );
        })}
      </View>

      {/* Défis */}
      <Text style={styles.sectionTitle}>Mes défis</Text>
      <View style={styles.challengesList}>
        {challenges.map((ch) => {
          const Icon = ch.icon === 'flame' ? Flame : ch.icon === 'trophy' ? Trophy : Star;
          const isDone = ch.progress >= ch.target;
          const iconBg = ch.icon === 'flame' ? '#FFF0D6' : ch.icon === 'trophy' ? '#F0F0EE' : colors.greenLight;
          const iconColor = ch.icon === 'flame' ? colors.gold : ch.icon === 'trophy' ? '#8A8A82' : colors.green;
          return (
            <View key={ch.id} style={[styles.challengeCard, ch.claimed && styles.challengeClaimed]}>
              <View style={[styles.challengeIconWrap, { backgroundColor: iconBg }]}>
                <Icon size={18} color={iconColor} strokeWidth={1.5} />
              </View>
              <View style={styles.challengeInfo}>
                <View style={styles.challengeTopRow}>
                  <Text style={styles.challengeTitle}>{ch.title}</Text>
                  <Text style={[styles.challengeReward, isDone && !ch.claimed && { color: colors.green }]}>
                    +{ch.reward} pts
                  </Text>
                </View>
                <Text style={styles.challengeDesc}>{ch.description}</Text>
                <View style={styles.challengeProgressRow}>
                  <View style={styles.challengeBar}>
                    <View style={[styles.challengeFill, { width: `${Math.min(100, (ch.progress / ch.target) * 100)}%` as any }]} />
                  </View>
                  <Text style={styles.challengeCount}>{ch.progress}/{ch.target}</Text>
                </View>
              </View>
              {isDone && !ch.claimed ? (
                <Pressable
                  onPress={() => claimChallenge(ch)}
                  style={styles.claimBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Réclamer les points"
                >
                  <Text style={styles.claimBtnText}>Réclamer</Text>
                </Pressable>
              ) : ch.claimed ? (
                <View style={styles.claimedBadge}>
                  <Check size={14} color={colors.green} strokeWidth={2.5} />
                </View>
              ) : (
                <Lock size={14} color={colors.textMuted} strokeWidth={1.5} />
              )}
            </View>
          );
        })}
      </View>

      {/* Récompenses — données Square */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Récompenses</Text>
      </View>
      <View style={styles.rewardsList}>
        {displayRewards.map((reward, i) => {
          const Icon = ICON_MAP[reward.icon] ?? Gift;
          const unlocked = loyalty.points >= reward.pointsCost;
          return (
            <View key={reward.id} style={[styles.rewardRow, !unlocked && styles.rewardLocked]}>
              <View style={[styles.rewardIcon, { backgroundColor: REWARD_COLORS[i % REWARD_COLORS.length] }]}>
                <Icon size={18} color={colors.text} strokeWidth={1.8} />
              </View>
              <View style={styles.rewardInfo}>
                <Text style={[styles.rewardName, !unlocked && { color: colors.textMuted }]}>
                  {reward.name}
                </Text>
                {reward.description ? (
                  <Text style={styles.rewardDesc}>{reward.description}</Text>
                ) : null}
              </View>
              <View style={styles.rewardPts}>
                <Text style={[styles.rewardPtsValue, unlocked && { color: colors.green }]}>
                  {reward.pointsCost}
                </Text>
                <Text style={styles.rewardPtsLabel}>pts</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Comment gagner des points */}
      <Text style={styles.sectionTitle}>Comment gagner des points ?</Text>
      <View style={styles.earnList}>
        {earnItems.map((item, i) => (
          <View key={i} style={styles.earnRow}>
            <View style={styles.earnIconWrap}>
              <Zap size={14} color={colors.green} strokeWidth={2} />
            </View>
            <Text style={styles.earnPts}>{item.pts}</Text>
            <Text style={styles.earnAction}>{item.action}</Text>
          </View>
        ))}
      </View>

      {/* CTA invité */}
      {isGuest && (
        <Pressable
          style={styles.ctaBlock}
          onPress={() => router.push('/auth/login')}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#2C4A32', '#4A6B50']}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaTitle}>Rejoindre le Club Teaven</Text>
            <Text style={styles.ctaSub}>Créez votre compte et commencez à cumuler des points dès votre première commande</Text>
            <View style={styles.ctaBtn}>
              <Text style={styles.ctaBtnText}>S'inscrire gratuitement</Text>
              <ChevronRight size={16} color={colors.green} strokeWidth={2} />
            </View>
          </LinearGradient>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 60 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', ...shadows.subtle,
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  cardWrapper: { paddingHorizontal: spacing.xl, marginBottom: spacing.xxxl },
  memberCard: { borderRadius: 20, padding: 22, overflow: 'hidden', ...shadows.loyalty },
  cardDecor1: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },
  cardDecor2: { position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.03)' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  clubLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.5)' },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  levelBadgeText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.5, color: '#FFFFFF' },
  cardName: { fontFamily: fonts.bold, fontSize: 15, color: '#FFFFFF', marginBottom: spacing.lg },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.md },
  pointsValue: { fontFamily: fonts.monoSemiBold, fontSize: 40, color: '#FFFFFF' },
  pointsUnit: { fontFamily: fonts.regular, fontSize: 16, color: 'rgba(255,255,255,0.7)' },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginBottom: spacing.sm },
  progressFill: { height: 4, backgroundColor: '#FFFFFF', borderRadius: 2 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontFamily: fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  progressPts: { fontFamily: fonts.bold, fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, paddingHorizontal: spacing.xl, marginBottom: spacing.md, marginTop: spacing.sm },
  sectionHeader: { marginTop: spacing.md },
  levelsGrid: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.xxxl },
  levelCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center', ...shadows.subtle },
  levelDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  levelDotText: { fontFamily: fonts.bold, fontSize: 16 },
  levelName: { fontFamily: fonts.bold, fontSize: 11, color: colors.text, marginBottom: 2 },
  levelPts: { fontFamily: fonts.regular, fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  rewardsList: { paddingHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.xxxl },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, ...shadows.subtle },
  rewardLocked: { opacity: 0.6 },
  rewardIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rewardInfo: { flex: 1 },
  rewardName: { fontFamily: fonts.bold, fontSize: 13, color: colors.text, marginBottom: 2 },
  rewardDesc: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  rewardPts: { alignItems: 'flex-end' },
  rewardPtsValue: { fontFamily: fonts.monoSemiBold, fontSize: 16, color: colors.textMuted },
  rewardPtsLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  earnList: { paddingHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.xxxl },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12 },
  earnIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  earnPts: { fontFamily: fonts.monoSemiBold, fontSize: 14, color: colors.green, minWidth: 55 },
  earnAction: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, flex: 1 },
  challengesList: { paddingHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.xxxl },
  challengeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, ...shadows.subtle },
  challengeClaimed: { opacity: 0.6 },
  challengeIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  challengeInfo: { flex: 1 },
  challengeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  challengeTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  challengeReward: { fontFamily: fonts.monoSemiBold, fontSize: 12, color: colors.textMuted },
  challengeDesc: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary, marginBottom: spacing.sm },
  challengeProgressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  challengeBar: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  challengeFill: { height: 4, backgroundColor: colors.green, borderRadius: 2 },
  challengeCount: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted },
  claimBtn: { backgroundColor: colors.green, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  claimBtnText: { fontFamily: fonts.bold, fontSize: 11, color: '#FFFFFF' },
  claimedBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  ctaBlock: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  ctaGradient: { borderRadius: 18, padding: 22, ...shadows.loyalty },
  ctaTitle: { fontFamily: fonts.bold, fontSize: 18, color: '#FFFFFF', marginBottom: spacing.sm },
  ctaSub: { fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20, marginBottom: spacing.lg },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 11, paddingHorizontal: spacing.lg, alignSelf: 'flex-start', gap: spacing.xs },
  ctaBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.green },
});
