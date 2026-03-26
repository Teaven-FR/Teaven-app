// Écran Profil — animations compteur, wallet, historique, navigation sous-pages
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Users,
  Flame,
  Trophy,
  Star,
  Zap,
  Share2,
  Instagram,
  Wallet,
  Plus,
  Sparkles,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import { ProgressCircle } from '@/components/ui/ProgressCircle';
import { RechargeModal } from '@/components/ui/RechargeModal';
import { useToast } from '@/contexts/ToastContext';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useUser } from '@/hooks/useUser';
import { useOrderStore } from '@/stores/orderStore';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

// Thèmes de carte fidélité selon le niveau
type LoyaltyCardTheme = {
  gradient: readonly [string, string, string];
  text: string;
  subtext: string;
  clubLabel: string;
  trackBg: string;
  progressColor: string;
};

const LEVEL_DESC: Record<string, { short: string; phrase: string }> = {
  'Première Parenthèse': { short: 'Début',    phrase: 'Bienvenue dans votre cercle' },
  'Habitude':            { short: 'Habitude', phrase: 'La régularité se crée' },
  'Rituel':              { short: 'Rituel',   phrase: "L'habitude devient rituel" },
  'Sérénité':            { short: 'Sérénité', phrase: 'La plénitude du quotidien' },
  'Essentia':            { short: 'Essentia', phrase: "L'essentiel, à chaque fois" },
};

const LEVEL_THEMES: Record<string, LoyaltyCardTheme> = {
  'Première Parenthèse': {
    gradient: ['#F7F4ED', '#EDE8D8', '#E4DFC8'] as const,
    text: '#2C3A2E',
    subtext: '#738478',
    clubLabel: '#8A9B8D',
    trackBg: 'rgba(117,150,127,0.15)',
    progressColor: '#75967F',
  },
  'Habitude': {
    gradient: ['#E8EDDF', '#D8E5D2', '#C8DCCA'] as const,
    text: '#1E3022',
    subtext: '#4A6B50',
    clubLabel: '#5B7A65',
    trackBg: 'rgba(117,150,127,0.18)',
    progressColor: '#5B7A65',
  },
  'Rituel': {
    gradient: ['#C2D8C6', '#A8C8AE', '#8EB898'] as const,
    text: '#1A2E1E',
    subtext: '#2C4A32',
    clubLabel: '#2C4A32',
    trackBg: 'rgba(255,255,255,0.3)',
    progressColor: '#2C4A32',
  },
  'Sérénité': {
    gradient: ['#75967F', '#5B7A65', '#4A6B50'] as const,
    text: '#FFFFFF',
    subtext: 'rgba(255,255,255,0.75)',
    clubLabel: 'rgba(255,255,255,0.55)',
    trackBg: 'rgba(255,255,255,0.2)',
    progressColor: '#FFFFFF',
  },
  'Essentia': {
    gradient: ['#3A5A3E', '#2C4A32', '#1A2E1E'] as const,
    text: '#FFFFFF',
    subtext: 'rgba(255,255,255,0.7)',
    clubLabel: 'rgba(255,255,255,0.45)',
    trackBg: 'rgba(255,255,255,0.12)',
    progressColor: 'rgba(255,255,255,0.9)',
  },
};

// Mapping icône Square → composant lucide
const REWARD_ICON_MAP: Record<string, typeof Coffee> = {
  coffee: Coffee,
  gift: Gift,
  percent: Percent,
  star: Gift,
};

// Liens du menu paramètres
const SETTINGS_LINKS = [
  { id: 'info', label: 'Informations personnelles', icon: User, route: '/profil/informations' },
  { id: 'addresses', label: 'Mes adresses', icon: MapPin, route: '/profil/adresses' },
  { id: 'payment', label: 'Modes de paiement', icon: CreditCard, route: '/profil/paiement' },
  { id: 'referral', label: 'Parrainage', icon: Users, route: '/referral' },
  { id: 'gift', label: 'Offrir un moment', icon: Gift, route: '/gift' },
  { id: 'settings', label: 'Paramètres', icon: Settings, route: '/settings' },
  { id: 'cgu', label: 'Mentions légales', icon: FileText, route: '/legal' },
] as const;

const INSTAGRAM_URL = 'https://instagram.com/teaven.co';
const INSTAGRAM_DEEPLINK = 'instagram://user?username=teaven.co';

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();
  const addItem = useCartStore((s) => s.addItem);
  const { user, isGuest, loyalty, wallet, rechargeWallet, rewards: squareRewards } = useUser();

  // Récompenses live Square ou fallback
  const FALLBACK_REWARDS = [
    { id: 'f1', name: 'Boisson offerte', pointsCost: 200, icon: 'coffee' },
    { id: 'f2', name: 'Dessert offert', pointsCost: 500, icon: 'gift' },
    { id: 'f3', name: 'Formule offerte', pointsCost: 750, icon: 'gift' },
  ];
  const rewards = squareRewards.length > 0 ? squareRewards : FALLBACK_REWARDS;
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

  const levelTheme = LEVEL_THEMES[loyalty.level] ?? LEVEL_THEMES['Première Parenthèse'];
  const levelDesc = LEVEL_DESC[loyalty.level] ?? LEVEL_DESC['Première Parenthèse'];

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
            onPress={() => router.push('/settings')}
            accessibilityLabel="Paramètres"
            accessibilityRole="button"
          >
            <Settings size={20} color={colors.textSecondary} strokeWidth={1.3} />
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

        {/* ──── Carte fidélité LES PARENTHÈSES ──── */}
        <Pressable
          style={styles.loyaltyWrapper}
          onPress={() => router.push('/fidelite')}
          accessibilityRole="button"
          accessibilityLabel="Voir mon programme fidélité"
        >
          <LinearGradient
            colors={levelTheme.gradient as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loyaltyCard}
          >
            <View style={styles.decorCircle} />

            {/* Contenu gauche + cercle droit */}
            <View style={styles.loyaltyCardBody}>
              <View style={styles.loyaltyCardLeft}>
                <Text style={[styles.loyaltyClub, { color: levelTheme.clubLabel }]}>
                  LES PARENTHÈSES
                </Text>
                <Text style={[styles.loyaltyName, { color: levelTheme.text }]}>
                  {displayName}
                </Text>
                <View style={styles.pointsRow}>
                  <Text style={[styles.pointsValue, { color: levelTheme.text }]}>
                    {displayedPoints.toLocaleString('fr-FR')}
                  </Text>
                  <Text style={[styles.pointsUnit, { color: levelTheme.subtext }]}>pts</Text>
                </View>
                <Text style={[styles.loyaltyLevel, { color: levelTheme.subtext }]}>
                  {levelDesc.phrase}
                </Text>
              </View>

              {/* Cercle de progression */}
              <View style={styles.loyaltyCircleWrap}>
                <ProgressCircle
                  size={84}
                  strokeWidth={4}
                  progress={loyalty.progressPercent}
                  color={levelTheme.progressColor}
                  trackColor={levelTheme.trackBg}
                >
                  <Text style={[styles.circlePoints, { color: levelTheme.text }]}>
                    {levelDesc.short}
                  </Text>
                </ProgressCircle>
              </View>
            </View>

            {/* Barre de progression */}
            <View style={[styles.progressTrack, { backgroundColor: levelTheme.trackBg }]}>
              <Animated.View
                style={[styles.progressFill, { width: progressWidth as unknown as number, backgroundColor: levelTheme.progressColor }]}
              />
            </View>

            <View style={styles.progressInfo}>
              <Text style={[styles.progressText, { color: levelTheme.subtext }]}>
                {loyalty.nextReward}
              </Text>
              <Text style={[styles.progressPercent, { color: levelTheme.subtext }]}>
                {loyalty.progressPercent}%
              </Text>
            </View>

            {/* Micro-texte fidélité */}
            <Text style={[styles.loyaltyMicroText, { color: levelTheme.clubLabel }]}>
              Chaque commande ajoute une parenthèse à votre cercle.
            </Text>
          </LinearGradient>
        </Pressable>

        {/* ──── Wallet ──── */}
        <Pressable onPress={() => setRechargeVisible(true)} style={styles.walletWrap}>
          <LinearGradient
            colors={['#D4937A', '#C27B5A', '#B56A4A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            {/* Décor cercles carte */}
            <View style={styles.walletDecor} />
            <View style={styles.walletDecor2} />
            <View style={styles.walletDecor3} />

            {/* Header carte */}
            <View style={styles.walletTop}>
              <Text style={styles.walletLabel}>PORTE-MONNAIE TEAVEN</Text>
              <Wallet size={18} color="rgba(255,255,255,0.5)" strokeWidth={1.3} />
            </View>

            {/* Solde — centré, gros */}
            <View style={styles.walletSolde}>
              <Text style={styles.walletBalance}>{formatPrice(wallet.balance)}</Text>
              <Text style={styles.walletSoldeLabel}>Solde disponible</Text>
            </View>

            {/* Footer carte */}
            <View style={styles.walletBottom}>
              <View style={styles.walletBonusRow}>
                <Sparkles size={11} color="rgba(255,255,255,0.5)" strokeWidth={1.8} />
                <Text style={styles.walletBonusText}>Bonus à chaque recharge</Text>
              </View>
              <View style={styles.rechargeButton}>
                <Plus size={13} color="#C27B5A" strokeWidth={2.5} />
                <Text style={styles.rechargeText}>Recharger</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* ──── Mes défis — feature card ──── */}
        <Pressable
          style={styles.defisCardWrap}
          onPress={() => router.push('/defis')}
          accessibilityRole="button"
          accessibilityLabel="Voir mes défis en cours"
        >
          <LinearGradient
            colors={['#243D29', '#2E5235', '#3A6642']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.defisCard}
          >
            <View style={styles.defisDecoBg} />

            {/* Header */}
            <View style={styles.defisHeader}>
              <View style={styles.defisHeaderLeft}>
                <View style={styles.defisProgramLabel}>
                  <Zap size={10} color={colors.gold} strokeWidth={2.5} />
                  <Text style={styles.defisProgramText}>LES PARENTHÈSES</Text>
                </View>
                <Text style={styles.defisCardTitle}>Vos défis du mois</Text>
              </View>
              <View style={styles.defisBadge}>
                <Text style={styles.defisBadgeText}>3 actifs</Text>
              </View>
            </View>

            {/* Mini défis avec progress */}
            <View style={styles.defisRows}>
              {([
                { icon: 'flame', label: 'Série en cours', progress: 3, target: 5, pts: 500 },
                { icon: 'trophy', label: 'Challenge du mois', progress: 4, target: 10, pts: 1000 },
                { icon: 'star', label: 'Explorateur', progress: 3, target: 3, pts: 300 },
              ] as const).map((defi) => {
                const pct = Math.min((defi.progress / defi.target) * 100, 100);
                const done = defi.progress >= defi.target;
                const Icon = defi.icon === 'flame' ? Flame : defi.icon === 'trophy' ? Trophy : Star;
                return (
                  <View key={defi.label} style={styles.defisRow}>
                    <View style={styles.defisRowIcon}>
                      <Icon size={12} color={done ? colors.gold : 'rgba(255,255,255,0.7)'} strokeWidth={2} />
                    </View>
                    <View style={styles.defisRowContent}>
                      <View style={styles.defisRowTop}>
                        <Text style={styles.defisRowLabel}>{defi.label}</Text>
                        <Text style={[styles.defisRowPts, done && { color: colors.gold }]}>
                          {done ? '✓' : `+${defi.pts} pts`}
                        </Text>
                      </View>
                      <View style={styles.defisProgressTrack}>
                        <View style={[styles.defisProgressFill, { width: `${pct}%` as `${number}%` }]} />
                      </View>
                      <Text style={styles.defisRowCount}>{defi.progress}/{defi.target}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Footer */}
            <View style={styles.defisFooter}>
              <View style={styles.defisFooterPoints}>
                <Text style={styles.defisFooterPtsLabel}>Jusqu'à</Text>
                <Text style={styles.defisFooterPtsValue}>1 800 pts</Text>
                <Text style={styles.defisFooterPtsLabel}>à gagner</Text>
              </View>
              <Pressable style={styles.defisFooterCta} onPress={() => router.push('/defis')}>
                <Text style={styles.defisFooterCtaText}>Voir les défis</Text>
                <ChevronRight size={14} color={colors.greenDark} strokeWidth={2.5} />
              </Pressable>
            </View>
          </LinearGradient>
        </Pressable>

        {/* ──── Récompenses ──── */}
        <View style={styles.rewardsHeader}>
          <Text style={styles.rewardsTitle}>Récompenses</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/fidelite')}>
            <Text style={styles.rewardsSeeAll}>Tout voir</Text>
          </Pressable>
        </View>
        <Text style={styles.rewardsSectionNote}>
          Vos parenthèses débloquent des récompenses exclusives.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rewardsScroll}
        >
          {rewards.map((reward) => {
            const Icon = REWARD_ICON_MAP[reward.icon] ?? Gift;
            const unlocked = loyalty.points >= reward.pointsCost;
            return (
              <View key={reward.id} style={styles.rewardCard}>
                <View style={styles.rewardIconWrap}>
                  <Icon size={18} color={unlocked ? colors.green : colors.textMuted} strokeWidth={1.8} />
                </View>
                <Text style={styles.rewardName}>{reward.name}</Text>
                <Text style={styles.rewardSub}>{reward.pointsCost} pts</Text>

                {/* Progress bar */}
                <View style={styles.rewardProgressBg}>
                  <View style={[
                    styles.rewardProgressFill,
                    { width: `${Math.min(Math.round((loyalty.points / reward.pointsCost) * 100), 100)}%` as `${number}%` }
                  ]} />
                </View>

                {/* Dynamic status text */}
                <Pressable
                  accessibilityLabel={unlocked ? `Utiliser ${reward.name}` : `${reward.name} — non débloqué`}
                  accessibilityRole="button"
                  onPress={() => unlocked
                    ? showToast(`${reward.name} — disponible dans votre panier`)
                    : showToast(`Encore ${reward.pointsCost - loyalty.points} pts pour débloquer`)}
                >
                  {unlocked ? (
                    <Text style={[styles.rewardCta, { color: colors.green }]}>🎉 Disponible !</Text>
                  ) : loyalty.points >= reward.pointsCost / 2 ? (
                    <Text style={[styles.rewardCta, { color: '#738478', fontSize: 11 }]}>
                      Presque ! +{reward.pointsCost - loyalty.points} pts
                    </Text>
                  ) : (
                    <Text style={[styles.rewardCta, { color: colors.textMuted, fontSize: 11 }]}>
                      Plus que {reward.pointsCost - loyalty.points} pts
                    </Text>
                  )}
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
                <Pressable
                  key={order.id}
                  style={({ pressed }) => [styles.orderCard, pressed && { opacity: 0.7 }]}
                  onPress={() => router.push(`/order/${order.id}`)}
                >
                  <View style={styles.orderInfo}>
                    <View style={styles.orderIconWrap}>
                      <ClipboardList size={16} color={colors.green} strokeWidth={1.8} />
                    </View>
                    <View style={styles.orderDetails}>
                      <Text style={styles.orderName} numberOfLines={1}>
                        {order.items.map((i: { name: string }) => i.name).join(', ')}
                      </Text>
                      <Text style={styles.orderMeta}>
                        {new Date(order.createdAt).toLocaleDateString('fr-FR')} · {formatPrice(order.total)}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.5} />
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {orderHistory.length === 0 && (
          <View style={styles.emptyOrders}>
            <Text style={styles.emptyOrdersText}>
              Vos commandes apparaîtront ici. Passez votre première commande pour commencer.
            </Text>
            <Pressable
              style={styles.emptyOrdersCta}
              onPress={() => router.push('/(tabs)/carte')}
              accessibilityRole="button"
            >
              <Text style={styles.emptyOrdersCtaText}>Voir la carte</Text>
            </Pressable>
          </View>
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

        {/* ──── Instagram ──── */}
        <Pressable
          style={styles.instagramBtn}
          onPress={() =>
            Linking.canOpenURL(INSTAGRAM_DEEPLINK).then((can) =>
              Linking.openURL(can ? INSTAGRAM_DEEPLINK : INSTAGRAM_URL),
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Suivre Teaven sur Instagram"
        >
          <Instagram size={18} color={colors.green} strokeWidth={1.6} />
          <Text style={styles.instagramText}>Suivez-nous sur Instagram</Text>
          <Text style={styles.instagramHandle}>@teaven.co</Text>
        </Pressable>

        {/* ──── Aide & Déconnexion ──── */}
        <View style={[styles.menu, { marginTop: spacing.md }]}>
          <Pressable style={styles.menuItem} accessibilityRole="button" onPress={() => router.push('/faq')}>
            <HelpCircle size={18} color={colors.green} strokeWidth={1.6} />
            <Text style={styles.menuItemText}>Aide & FAQ</Text>
            <View style={styles.menuItemSpacer} />
            <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.5} />
          </Pressable>
          <View style={styles.menuSep} />
          <Pressable
            style={styles.menuItem}
            accessibilityRole="button"
            onPress={async () => {
              await AsyncStorage.removeItem('@teaven/onboarding_completed');
              useAuthStore.setState({ onboardingCompleted: false });
              router.replace('/onboarding');
            }}
          >
            <RotateCcw size={18} color={colors.green} strokeWidth={1.6} />
            <Text style={styles.menuItemText}>Revoir l'onboarding</Text>
            <View style={styles.menuItemSpacer} />
            <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.5} />
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
        onPayByCard={(amount) => { setRechargeVisible(false); router.push({ pathname: '/recharge', params: { amount: String(amount) } }); }}
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
    marginBottom: spacing.md,
  },
  loyaltyCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#2C4A32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  loyaltyCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loyaltyCardLeft: {
    flex: 1,
  },
  loyaltyCircleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePoints: {
    fontFamily: fonts.bold,
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  circleLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    textAlign: 'center',
    marginTop: -2,
  },
  loyaltyMicroText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    marginTop: spacing.sm,
    opacity: 0.8,
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
  walletWrap: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#C27B5A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  walletCard: {
    borderRadius: 18,
    padding: 20,
    paddingVertical: 22,
    position: 'relative',
    overflow: 'hidden',
    aspectRatio: 1.65, // Ratio carte bancaire
    justifyContent: 'space-between',
  },
  walletDecor: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  walletDecor2: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  walletDecor3: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  walletTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.6)',
  },
  walletSolde: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBalance: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 36,
    color: '#FFFFFF',
  },
  walletSoldeLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  walletBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletBonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  walletBonusText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  rechargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
  },
  rechargeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#C27B5A',
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
  rewardsSectionNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    marginTop: -spacing.sm,
  },
  rewardsScroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  rewardCard: {
    width: 160,
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
  rewardProgressBg: {
    height: 6,
    backgroundColor: '#E8E8E3',
    borderRadius: 3,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  rewardProgressFill: {
    height: 6,
    backgroundColor: colors.green,
    borderRadius: 3,
  },

  // Feature card Défis
  defisCardWrap: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  defisCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    ...shadows.loyalty,
  },
  defisDecoBg: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
    top: -50,
    right: -50,
  },
  defisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  defisHeaderLeft: { flex: 1 },
  defisProgramLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  defisProgramText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.gold,
  },
  defisCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  defisBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  defisBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  defisRows: { gap: 10, marginBottom: 18 },
  defisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: 10,
  },
  defisRowIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defisRowContent: { flex: 1, gap: 4 },
  defisRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  defisRowLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  defisRowPts: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  defisProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  defisProgressFill: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 2,
  },
  defisRowCount: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  defisFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 14,
  },
  defisFooterPoints: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  defisFooterPtsLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  defisFooterPtsValue: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  defisFooterCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  defisFooterCtaText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.greenDark,
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
  emptyOrders: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  emptyOrdersText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emptyOrdersCta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  emptyOrdersCtaText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
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

  // Instagram
  instagramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  instagramText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  instagramHandle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.green,
  },
});
