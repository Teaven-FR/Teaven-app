// Page Les Parenthèses — programme de fidélité Teaven
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
import { ArrowLeft, Coffee, Gift, Percent, Star, Check, ChevronRight, Zap, Flame, Trophy, Lock, Sparkles } from 'lucide-react-native';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { colors, levelColors, fonts, spacing, shadows } from '@/constants/theme';
import { ProgressCircle } from '@/components/ui/ProgressCircle';
import { LEVEL_DATA } from '@/app/niveau/[level]';

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

const LEVEL_THEMES: Record<string, { gradient: readonly [string, string, string]; text: string; subtext: string; progressColor: string; trackBg: string }> = {
  'Première Parenthèse': { gradient: ['#F7F4ED', '#EDE8D8', '#E4DFC8'], text: '#2C3A2E', subtext: '#738478', progressColor: '#75967F', trackBg: 'rgba(117,150,127,0.15)' },
  'Habitude':            { gradient: ['#E8EDDF', '#D8E5D2', '#C8DCCA'], text: '#1E3022', subtext: '#4A6B50', progressColor: '#5B7A65', trackBg: 'rgba(117,150,127,0.18)' },
  'Rituel':              { gradient: ['#C2D8C6', '#A8C8AE', '#8EB898'], text: '#1A2E1E', subtext: '#2C4A32', progressColor: '#2C4A32', trackBg: 'rgba(255,255,255,0.3)' },
  'Sérénité':            { gradient: ['#75967F', '#5B7A65', '#4A6B50'], text: '#FFFFFF', subtext: 'rgba(255,255,255,0.75)', progressColor: '#FFFFFF', trackBg: 'rgba(255,255,255,0.2)' },
  'Essentia':            { gradient: ['#3A5A3E', '#2C4A32', '#1A2E1E'], text: '#FFFFFF', subtext: 'rgba(255,255,255,0.7)', progressColor: 'rgba(255,255,255,0.9)', trackBg: 'rgba(255,255,255,0.12)' },
};

const LEVELS = [
  { name: 'Première Parenthèse', min: 0, ...levelColors['Première Parenthèse'] },
  { name: 'Habitude', min: 2000, ...levelColors['Habitude'] },
  { name: 'Rituel', min: 5000, ...levelColors['Rituel'] },
  { name: 'Sérénité', min: 10000, ...levelColors['Sérénité'] },
  { name: 'Essentia', min: 20000, ...levelColors['Essentia'] },
];

const REWARD_COLORS = ['#C8D9CC', '#EDE5D8', '#F5EDD0', '#D8E8DC', '#E8E0D5'];

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  coffee: Coffee,
  gift: Gift,
  percent: Percent,
  star: Star,
};

const FALLBACK_REWARDS = [
  { id: '1', name: 'Boisson offerte', description: 'Thé, café ou infusion au choix', pointsCost: 200, icon: 'coffee' },
  { id: '2', name: 'Dessert offert', description: 'Pâtisserie maison au choix', pointsCost: 500, icon: 'gift' },
  { id: '3', name: 'Formule offerte', description: 'Plat + boisson au choix', pointsCost: 750, icon: 'gift' },
  { id: '4', name: 'Menu complet offert', description: 'Bowl + boisson + dessert', pointsCost: 1000, icon: 'star' },
];

export default function FideliteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isGuest, loyalty, rewards: squareRewards, updateProfile } = useUser();
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
  const nextLevel = LEVELS.find((l) => l.min > loyalty.points);
  const ptsToNext = nextLevel ? nextLevel.min - loyalty.points : 0;
  const theme = LEVEL_THEMES[loyalty.level] ?? LEVEL_THEMES['Première Parenthèse'];

  const displayName = isGuest ? 'Invité' : (user.fullName || 'Membre');

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
        <Text style={styles.headerTitle}>Les Parenthèses</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Carte membre */}
      <View style={styles.cardWrapper}>
        <LinearGradient
          colors={theme.gradient as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.memberCard}
        >
          <View style={styles.cardDecor1} />
          <View style={styles.cardDecor2} />

          <View style={styles.cardTopRow}>
            <Text style={[styles.clubLabel, { color: theme.subtext }]}>LES PARENTHÈSES</Text>
            <View style={[styles.levelBadge, { backgroundColor: currentLevel.color }]}>
              <Text style={styles.levelBadgeText}>{loyalty.level}</Text>
            </View>
          </View>

          <Text style={[styles.cardName, { color: theme.text }]}>{displayName}</Text>

          <View style={styles.cardBodyRow}>
            <View>
              <View style={styles.pointsRow}>
                <Text style={[styles.pointsValue, { color: theme.text }]}>{displayedPoints.toLocaleString('fr-FR')}</Text>
                <Text style={[styles.pointsUnit, { color: theme.subtext }]}>pts</Text>
              </View>
              <Text style={[styles.progressText, { color: theme.subtext }]}>{loyalty.nextReward}</Text>
              {ptsToNext > 0 && (
                <Text style={[styles.progressPts, { color: theme.text }]}>encore {ptsToNext} pts</Text>
              )}
            </View>
            <ProgressCircle
              size={64}
              strokeWidth={4}
              progress={loyalty.progressPercent}
              color={theme.progressColor}
              trackColor={theme.trackBg}
            />
          </View>
        </LinearGradient>
      </View>

      {/* Niveaux — parcours vertical immersif */}
      <Text style={styles.sectionTitle}>Votre parcours</Text>
      <View style={styles.levelsVertical}>
        {LEVELS.map((lvl, index) => {
          const isActive = lvl.name === loyalty.level;
          const isUnlocked = loyalty.points >= lvl.min;
          const isLocked = !isUnlocked;
          const levelContent = LEVEL_DATA[lvl.name];
          const isLast = index === LEVELS.length - 1;

          return (
            <View key={lvl.name} style={styles.levelItemWrap}>
              {/* Ligne de connexion verticale */}
              {!isLast && (
                <View style={[styles.levelConnector, { backgroundColor: isUnlocked ? lvl.color : colors.border }]} />
              )}

              <Pressable
                onPress={() => router.push(`/niveau/${encodeURIComponent(lvl.name)}`)}
                style={[
                  styles.levelItemCard,
                  isActive && { borderColor: lvl.color, borderWidth: 1.5 },
                  isLocked && styles.levelItemLocked,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Niveau ${lvl.name}`}
              >
                {/* Dot + statut */}
                <View style={styles.levelItemLeft}>
                  <View style={[styles.levelDot, { backgroundColor: isLocked ? '#EDECEA' : lvl.bg }]}>
                    {isLocked
                      ? <Lock size={14} color={colors.textMuted} strokeWidth={1.8} />
                      : isActive
                        ? <Sparkles size={14} color={lvl.color} strokeWidth={1.8} />
                        : <Check size={14} color={lvl.color} strokeWidth={2.5} />
                    }
                  </View>
                  {isActive && (
                    <View style={[styles.activePill, { backgroundColor: lvl.bg }]}>
                      <Text style={[styles.activePillText, { color: lvl.color }]}>Actuel</Text>
                    </View>
                  )}
                </View>

                {/* Contenu */}
                <View style={styles.levelItemContent}>
                  <View style={styles.levelItemHeader}>
                    <Text style={[styles.levelItemName, isLocked && { color: colors.textMuted }]}>
                      {lvl.name}
                    </Text>
                    <Text style={[styles.levelItemPts, { color: isLocked ? colors.textMuted : lvl.color }]}>
                      {lvl.min === 0 ? '0 pt' : `${lvl.min} pts`}
                    </Text>
                  </View>

                  {levelContent && (
                    <Text
                      style={[styles.levelItemTagline, isLocked && { color: colors.textMuted }]}
                      numberOfLines={2}
                    >
                      {levelContent.tagline}
                    </Text>
                  )}

                  {/* 2 premiers avantages */}
                  {levelContent && !isLocked && (
                    <View style={styles.levelBenefitsPreview}>
                      {levelContent.benefits.slice(0, 2).map((b, i) => (
                        <View key={i} style={styles.levelBenefitChip}>
                          <Text style={[styles.levelBenefitChipText, { color: lvl.color }]}>
                            {b.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.levelItemFooter}>
                    <Text style={[styles.levelItemCta, { color: isLocked ? colors.textMuted : lvl.color }]}>
                      {isLocked ? `encore ${lvl.min - loyalty.points} pts` : 'Découvrir ce niveau'}
                    </Text>
                    <ChevronRight size={13} color={isLocked ? colors.textMuted : lvl.color} strokeWidth={2} />
                  </View>
                </View>
              </Pressable>
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

      {/* CTA invité */}
      {isGuest && (
        <Pressable
          style={styles.ctaBlock}
          onPress={() => router.push('/auth/login')}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#243D29', '#2E5235', '#3A6642']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaTitle}>Rejoindre Les Parenthèses</Text>
            <Text style={styles.ctaSub}>Créez votre compte et commencez à cumuler des points dès votre première parenthèse.</Text>
            <View style={styles.ctaBtn}>
              <Text style={styles.ctaBtnText}>Commencer</Text>
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
  levelBadgeText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.5, color: '#FFFFFF' },
  cardName: { fontFamily: fonts.bold, fontSize: 15, color: '#FFFFFF', marginBottom: spacing.lg },
  cardBodyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.sm },
  pointsValue: { fontFamily: fonts.monoSemiBold, fontSize: 38, color: '#FFFFFF' },
  pointsUnit: { fontFamily: fonts.regular, fontSize: 15, color: 'rgba(255,255,255,0.7)' },
  progressText: { fontFamily: fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 2 },
  progressPts: { fontFamily: fonts.bold, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.green, paddingHorizontal: spacing.xl, marginBottom: spacing.md, marginTop: spacing.sm },
  sectionHeader: { marginTop: spacing.md },
  // Parcours vertical
  levelsVertical: { paddingHorizontal: spacing.xl, marginBottom: spacing.xxxl, gap: 0 },
  levelItemWrap: { position: 'relative', paddingLeft: 52 },
  levelConnector: { position: 'absolute', left: 18, top: 50, bottom: -10, width: 2, borderRadius: 1 },
  levelItemCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    ...shadows.subtle,
  },
  levelItemLocked: { opacity: 0.65 },
  levelItemLeft: {
    position: 'absolute',
    left: -38,
    top: 14,
    alignItems: 'center',
    gap: 4,
  },
  levelDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePillText: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 0.5 },
  levelItemContent: { flex: 1 },
  levelItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  levelItemName: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  levelItemPts: { fontFamily: fonts.monoSemiBold, fontSize: 11 },
  levelItemTagline: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 8 },
  levelBenefitsPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  levelBenefitChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.greenLight,
  },
  levelBenefitChipText: { fontFamily: fonts.bold, fontSize: 10 },
  levelItemFooter: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  levelItemCta: { fontFamily: fonts.bold, fontSize: 11 },
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
