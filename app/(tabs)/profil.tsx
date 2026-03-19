// Écran Profil — animations compteur, wallet, historique, navigation sous-pages
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings,
  CheckCircle,
  Coffee,
  Gift,
  Percent,
  ClipboardList,
  HelpCircle,
  LogOut,
  RotateCcw,
  User,
  MapPin,
  CreditCard,
  FileText,
  ChevronRight,
  LogIn,
} from 'lucide-react-native';
import { RechargeModal } from '@/components/ui/RechargeModal';
import { useToast } from '@/contexts/ToastContext';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useUser } from '@/hooks/useUser';
import { useOrderStore } from '@/stores/orderStore';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

// Mock récompenses
const rewards = [
  { id: '1', icon: Coffee, name: 'Boisson offerte', sub: '500 pts', cta: 'Utiliser' },
  { id: '2', icon: Gift, name: 'Dessert offert', sub: '750 pts', cta: 'Utiliser' },
  { id: '3', icon: Percent, name: '-20% sur carte', sub: '1000 pts', cta: 'Utiliser' },
];

// Liens du menu paramètres
const SETTINGS_LINKS = [
  { id: 'info', label: 'Informations personnelles', icon: User, route: '/profil/informations' },
  { id: 'addresses', label: 'Mes adresses', icon: MapPin, route: '/profil/adresses' },
  { id: 'payment', label: 'Modes de paiement', icon: CreditCard, route: '/profil/paiement' },
  { id: 'cgu', label: 'CGU & Confidentialité', icon: FileText, route: '/profil/cgu' },
] as const;

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();
  const addItem = useCartStore((s) => s.addItem);
  const { user, isGuest, loyalty, wallet, rechargeWallet } = useUser();
  const signOut = useAuthStore((s) => s.signOut);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const orderHistory = useOrderStore((s) => s.orderHistory);

  const [rechargeVisible, setRechargeVisible] = useState(false);

  // Animation compteur points
  const pointsAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [displayedPoints, setDisplayedPoints] = useState(0);

  useEffect(() => {
    Animated.timing(pointsAnim, {
      toValue: loyalty.points,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    const listenerId = pointsAnim.addListener(({ value }) => {
      setDisplayedPoints(Math.round(value));
    });

    Animated.timing(progressAnim, {
      toValue: loyalty.progressPercent,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    return () => pointsAnim.removeListener(listenerId);
  }, [pointsAnim, progressAnim, loyalty.points, loyalty.progressPercent]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  // Déconnexion avec confirmation
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth/login');
          },
        },
      ],
    );
  };

  // Connexion pour les invités
  const handleLogin = () => {
    router.push('/auth/login');
  };

  const displayName = isGuest ? 'Invité' : user.fullName || 'Utilisateur';

  return (
    <>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ──── Header ──── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mon Profil</Text>
          <Pressable
            onPress={() => router.push('/profil/informations')}
            accessibilityLabel="Paramètres"
            accessibilityRole="button"
          >
            <Settings size={20} color={colors.textSecondary} strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* ──── Identité ──── */}
        <View style={styles.identity}>
          <LinearGradient colors={['#2C4A32', '#4A6B50']} style={styles.avatar}>
            <Text style={styles.avatarInitial}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <View>
            <Text style={styles.userName}>{displayName}</Text>
            {isGuest ? (
              <Pressable onPress={handleLogin} style={styles.loginLink}>
                <LogIn size={12} color={colors.green} strokeWidth={2} />
                <Text style={styles.loginText}>Se connecter</Text>
              </Pressable>
            ) : (
              <View style={styles.premiumRow}>
                <CheckCircle size={12} color={colors.green} strokeWidth={2} />
                <Text style={styles.premiumLabel}>Membre Premium</Text>
              </View>
            )}
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
            <View style={styles.decorCircle} />
            <Text style={styles.loyaltyClub}>TEAVEN CLUB</Text>
            <Text style={styles.loyaltyName}>{displayName}</Text>

            <View style={styles.pointsRow}>
              <Text style={styles.pointsValue}>
                {displayedPoints.toLocaleString('fr-FR')}
              </Text>
              <Text style={styles.pointsUnit}>pts</Text>
            </View>

            <Text style={styles.loyaltyLevel}>
              NIVEAU {loyalty.level.toUpperCase()}
            </Text>

            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, { width: progressWidth as unknown as number }]}
              />
            </View>

            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>{loyalty.nextReward}</Text>
              <Text style={styles.progressPercent}>{loyalty.progressPercent}%</Text>
            </View>
          </LinearGradient>
        </View>

        {/* ──── Wallet ──── */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View>
              <Text style={styles.walletLabel}>PORTE-MONNAIE</Text>
              <Text style={styles.walletBalance}>{formatPrice(wallet.balance)}</Text>
            </View>
            <Pressable
              style={styles.rechargeButton}
              onPress={() => setRechargeVisible(true)}
              accessibilityLabel="Recharger le porte-monnaie"
              accessibilityRole="button"
            >
              <Text style={styles.rechargeText}>Recharger</Text>
            </Pressable>
          </View>
        </View>

        {/* ──── Récompenses ──── */}
        <View style={styles.rewardsHeader}>
          <Text style={styles.rewardsTitle}>Récompenses</Text>
          <Pressable accessibilityRole="button">
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
                <Pressable accessibilityLabel={`Utiliser ${reward.name}`} accessibilityRole="button">
                  <Text style={styles.rewardCta}>{reward.cta}</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>

        {/* ──── Historique commandes ──── */}
        {orderHistory.length > 0 && (
          <>
            <View style={styles.ordersHeader}>
              <Text style={styles.ordersTitle}>Mes commandes</Text>
            </View>

            <View style={styles.ordersList}>
              {orderHistory.slice(0, 3).map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderInfo}>
                    <View style={styles.orderIconWrap}>
                      <ClipboardList size={16} color={colors.green} strokeWidth={1.8} />
                    </View>
                    <View style={styles.orderDetails}>
                      <Text style={styles.orderName} numberOfLines={1}>
                        {order.items.map((i) => i.name).join(', ')}
                      </Text>
                      <Text style={styles.orderMeta}>
                        {order.id} · {formatPrice(order.total)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ──── Menu paramètres ──── */}
        <View style={styles.menu}>
          {SETTINGS_LINKS.map((link, index) => {
            const Icon = link.icon;
            return (
              <View key={link.id}>
                {index > 0 && <View style={styles.menuSep} />}
                <Pressable
                  style={styles.menuItem}
                  onPress={() => router.push(link.route)}
                  accessibilityRole="button"
                  accessibilityLabel={link.label}
                >
                  <Icon size={18} color={colors.green} strokeWidth={1.6} />
                  <Text style={styles.menuItemText}>{link.label}</Text>
                  <View style={styles.menuItemSpacer} />
                  <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.5} />
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* ──── Aide & Déconnexion ──── */}
        <View style={[styles.menu, { marginTop: spacing.md }]}>
          <Pressable style={styles.menuItem} accessibilityRole="button">
            <HelpCircle size={18} color={colors.green} strokeWidth={1.6} />
            <Text style={styles.menuItemText}>Aide & FAQ</Text>
          </Pressable>
          <View style={styles.menuSep} />
          {isAuthenticated ? (
            <Pressable style={styles.menuItem} onPress={handleLogout} accessibilityRole="button">
              <LogOut size={18} color={colors.error} strokeWidth={1.6} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                Déconnexion
              </Text>
            </Pressable>
          ) : (
            <Pressable style={styles.menuItem} onPress={handleLogin} accessibilityRole="button">
              <LogIn size={18} color={colors.green} strokeWidth={1.6} />
              <Text style={styles.menuItemText}>Se connecter</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Modal rechargement */}
      <RechargeModal
        visible={rechargeVisible}
        onClose={() => setRechargeVisible(false)}
        onRecharge={(amount) => {
          rechargeWallet(amount);
          showToast('Porte-monnaie rechargé !');
        }}
      />
    </>
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
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  loginText: {
    fontFamily: fonts.bold,
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
    fontFamily: fonts.monoSemiBold,
    fontSize: 36,
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
    fontFamily: fonts.monoSemiBold,
    fontSize: 20,
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
    marginBottom: spacing.xxl,
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

  // Historique commandes
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  ordersTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  ordersList: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  orderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderDetails: {
    flex: 1,
  },
  orderName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  orderMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },

  // Menu
  menu: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 16,
  },
  menuItemText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  menuItemSpacer: {
    flex: 1,
  },
  menuSep: {
    height: 0.5,
    backgroundColor: colors.border,
    marginLeft: 50,
  },
});
