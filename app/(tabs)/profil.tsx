// Écran Profil — identité, carte fidélité, wallet, récompenses
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings,
  CheckCircle,
  Coffee,
  Gift,
  Percent,
} from 'lucide-react-native';
import { mockUser } from '@/constants/mockData';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

// Mock récompenses
const rewards = [
  { id: '1', icon: Coffee, name: 'Boisson offerte', sub: '500 pts', cta: 'Utiliser' },
  { id: '2', icon: Gift, name: 'Dessert offert', sub: '750 pts', cta: 'Utiliser' },
  { id: '3', icon: Percent, name: '-20% sur carte', sub: '1000 pts', cta: 'Utiliser' },
];

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();

  const formatWallet = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ──── Header ──── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <Pressable>
          <Settings size={20} color={colors.textSecondary} strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* ──── Identité ──── */}
      <View style={styles.identity}>
        <LinearGradient
          colors={['#2C4A32', '#4A6B50']}
          style={styles.avatar}
        >
          <Text style={styles.avatarInitial}>
            {mockUser.name.charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
        <View>
          <Text style={styles.userName}>{mockUser.name}</Text>
          <View style={styles.premiumRow}>
            <CheckCircle size={12} color={colors.green} strokeWidth={2} />
            <Text style={styles.premiumLabel}>Membre Premium</Text>
          </View>
        </View>
      </View>

      {/* ──── Carte fidélité TEAVEN CLUB ──── */}
      <View style={styles.loyaltyWrapper}>
        <LinearGradient
          colors={['#2C4A32', '#4A6B50']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loyaltyCard}
        >
          {/* Cercle décoratif */}
          <View style={styles.decorCircle} />

          <Text style={styles.loyaltyClub}>TEAVEN CLUB</Text>
          <Text style={styles.loyaltyName}>{mockUser.name}</Text>

          <View style={styles.pointsRow}>
            <Text style={styles.pointsValue}>
              {mockUser.loyaltyPoints.toLocaleString('fr-FR')}
            </Text>
            <Text style={styles.pointsUnit}>pts</Text>
          </View>

          <Text style={styles.loyaltyLevel}>
            NIVEAU {mockUser.loyaltyLevel.toUpperCase()}
          </Text>

          {/* Barre de progression */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '75%' }]} />
          </View>

          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              Prochain : Boisson offerte
            </Text>
            <Text style={styles.progressPercent}>75%</Text>
          </View>
        </LinearGradient>
      </View>

      {/* ──── Wallet ──── */}
      <View style={styles.walletCard}>
        <View style={styles.walletHeader}>
          <View>
            <Text style={styles.walletLabel}>PORTE-MONNAIE</Text>
            <Text style={styles.walletBalance}>
              {formatWallet(mockUser.walletBalance)}
            </Text>
          </View>
          <Pressable style={styles.rechargeButton}>
            <Text style={styles.rechargeText}>Recharger</Text>
          </Pressable>
        </View>
      </View>

      {/* ──── Récompenses ──── */}
      <View style={styles.rewardsHeader}>
        <Text style={styles.rewardsTitle}>Récompenses</Text>
        <Pressable>
          <Text style={styles.rewardsSeeAll}>Tout voir</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rewardsScroll}
      >
        {rewards.map((reward) => {
          const Icon = reward.icon;
          return (
            <View key={reward.id} style={styles.rewardCard}>
              <View style={styles.rewardIconWrap}>
                <Icon size={18} color={colors.green} strokeWidth={1.8} />
              </View>
              <Text style={styles.rewardName}>{reward.name}</Text>
              <Text style={styles.rewardSub}>{reward.sub}</Text>
              <Pressable>
                <Text style={styles.rewardCta}>{reward.cta}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },

  // Identité
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarInitial: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  premiumLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.green,
  },

  // Carte fidélité
  loyaltyWrapper: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  loyaltyCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    ...shadows.loyalty,
  },
  decorCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  loyaltyClub: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.sm,
  },
  loyaltyName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: spacing.md,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  pointsValue: {
    fontFamily: fonts.mono,
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pointsUnit: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  loyaltyLevel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1.5,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  progressPercent: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },

  // Wallet
  walletCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: spacing.xxl,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  walletBalance: {
    fontFamily: fonts.mono,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  rechargeButton: {
    height: 32,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.green,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rechargeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  // Récompenses
  rewardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  rewardsTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  rewardsSeeAll: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.green,
  },
  rewardsScroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  rewardCard: {
    width: 150,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  rewardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  rewardName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  rewardSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  rewardCta: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.green,
  },
});
