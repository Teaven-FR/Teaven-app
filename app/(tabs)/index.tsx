// Écran Accueil — salutation dynamique, bannière promo, pull-to-refresh, favoris, badges
// Animations d'entrée échelonnées + labels d'accessibilité
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bell, Search, Leaf, ShoppingBag, Instagram, Trophy } from 'lucide-react-native';
import { Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pill } from '@/components/ui/Pill';
import { ProductCardCarousel } from '@/components/ui/ProductCardCarousel';
import { SearchModal } from '@/components/ui/SearchModal';
import { useCatalog } from '@/hooks/useCatalog';
import { useUser } from '@/hooks/useUser';
import { useCartStore } from '@/stores/cartStore';
import { useOrderStore } from '@/stores/orderStore';
import { useToast } from '@/contexts/ToastContext';
import { RechargeModal } from '@/components/ui/RechargeModal';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';

// Largeur d'une card carrousel + gap
const CARD_WIDTH = 260;
const CARD_GAP = spacing.md;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

/** Nombre de sections animées lors de l'entrée */
const SECTION_COUNT = 5;

/** Délai entre chaque section (ms) */
const STAGGER_DELAY = 100;

/** Salutation dynamique selon l'heure */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'Bonjour';
  if (hour >= 12 && hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

/** Formate un prix en centimes pour les lecteurs d'écran */
function priceAccessibilityLabel(cents: number): string {
  const euros = Math.floor(cents / 100);
  const centimes = cents % 100;
  if (centimes === 0) return `${euros} euros`;
  return `${euros} euros ${centimes}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, allProducts, categories, selectedCategory, setSelectedCategory, refetch } = useCatalog();
  const { user, isGuest, wallet, rechargeWallet } = useUser();
  const { showToast } = useToast();
  const setPromoCode = useCartStore((s) => s.setPromoCode);
  const orderHistory = useOrderStore((s) => s.orderHistory ?? []);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [rechargeVisible, setRechargeVisible] = useState(false);

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  // ── Animations d'entrée échelonnées ──
  // Chaque section dispose de sa propre opacité et translation verticale
  const sectionAnims = useRef(
    Array.from({ length: SECTION_COUNT }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    })),
  ).current;

  useEffect(() => {
    const useNative = Platform.OS !== 'web';
    const animations = sectionAnims.map((anim, index) =>
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 350,
          delay: index * STAGGER_DELAY,
          useNativeDriver: useNative,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 350,
          delay: index * STAGGER_DELAY,
          useNativeDriver: useNative,
        }),
      ]),
    );
    Animated.parallel(animations).start();
  }, [sectionAnims]);

  // Produits pour le carrousel (filtrés par catégorie)
  const carouselProducts = products;

  // Coups de cœur (top 3 par note)
  const favorites = [...allProducts]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  // Calcul de la page active du carrousel
  const handleCarouselScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SNAP_INTERVAL);
      setActiveCardIndex(index);
    },
    [],
  );

  // Pull-to-refresh — sync Square + re-fetch
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green}
            colors={[colors.green]}
          />
        }
      >
        {/* Header : avatar + greeting + notification */}
        <Animated.View
          style={{
            opacity: sectionAnims[0].opacity,
            transform: [{ translateY: sectionAnims[0].translateY }],
          }}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(isGuest ? 'I' : user.fullName.charAt(0))}
                </Text>
              </View>
              <View>
                <Text style={styles.greeting}>
                  {getGreeting()}{isGuest ? '' : `, ${user.fullName.split(' ')[0]}`}
                </Text>
                <Text style={styles.subtitle}>
                  Qu'est-ce qui vous ferait du bien ?
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.notifButton}
              accessibilityLabel="Notifications"
              onPress={() => router.push('/notifications')}
            >
              <Bell size={20} color={colors.textSecondary} strokeWidth={1.3} />
              <View style={styles.notifBadge} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Barre de recherche */}
        <Animated.View
          style={{
            opacity: sectionAnims[1].opacity,
            transform: [{ translateY: sectionAnims[1].translateY }],
          }}
        >
          <Pressable
            style={styles.searchContainer}
            onPress={() => setSearchVisible(true)}
            accessibilityLabel="Rechercher un produit"
          >
            <View style={styles.searchBar}>
              <Search size={16} color={colors.textMuted} strokeWidth={1.6} />
              <Text style={styles.searchPlaceholder}>Rechercher...</Text>
            </View>
          </Pressable>

          {/* Bandeau rechargement wallet si solde faible */}
          {!isGuest && wallet.balance < 500 && (
            <Pressable
              onPress={() => setRechargeVisible(true)}
              style={styles.walletBanner}
              accessibilityRole="button"
              accessibilityLabel="Recharger votre porte-monnaie"
            >
              <ShoppingBag size={16} color={colors.green} strokeWidth={1.8} />
              <Text style={styles.walletBannerText}>
                Solde porte-monnaie :{' '}
                <Text style={styles.walletBannerAmount}>
                  {(wallet.balance / 100).toFixed(2).replace('.', ',')} €
                </Text>
                {'  '}—{' '}
                <Text style={styles.walletBannerCta}>Recharger</Text>
              </Text>
            </Pressable>
          )}

          {/* Bannières promotionnelles — carrousel */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.promosContainer}
            contentContainerStyle={styles.promosContent}
          >
            {orderHistory.length === 0 && (
              <LinearGradient colors={['#E8F0EA', '#D4E5D7']} style={styles.promoCard}>
                <View style={styles.promoContent}>
                  <Text style={styles.promoTitle}>Première commande ?</Text>
                  <Text style={styles.promoSubtitle}>-15% avec le code BIENVENUE</Text>
                  <Pressable
                    onPress={() => {
                      setPromoCode('BIENVENUE');
                      showToast('Code BIENVENUE activé ! -15% sur votre commande');
                      router.push('/(tabs)/carte');
                    }}
                    accessibilityLabel="Profiter de moins quinze pourcent sur la première commande"
                  >
                    <Text style={styles.promoCta}>En profiter</Text>
                  </Pressable>
                </View>
                <View style={styles.promoIconWrap}>
                  <Leaf size={36} color={colors.green} strokeWidth={1} />
                </View>
              </LinearGradient>
            )}

            <LinearGradient colors={['#F5EFDF', '#EDE4CC']} style={styles.promoCard}>
              <View style={styles.promoContent}>
                <Text style={styles.promoTitle}>Parrainez un ami</Text>
                <Text style={styles.promoSubtitle}>Gagnez 200 pts de fidélité</Text>
                <Pressable
                  onPress={() => router.push('/referral')}
                  accessibilityLabel="Parrainer un ami et gagner 200 points de fidélité"
                >
                  <Text style={[styles.promoCta, { color: colors.gold }]}>Parrainer</Text>
                </Pressable>
              </View>
            </LinearGradient>

            <LinearGradient colors={['#2C4A32', '#4A6B50']} style={styles.promoCard}>
              <View style={styles.promoContent}>
                <Text style={[styles.promoTitle, { color: '#FFFFFF' }]}>Nouveau</Text>
                <Text style={[styles.promoSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                  Matcha Zen Latte Glacé
                </Text>
                <Pressable
                  onPress={() => router.push('/(tabs)/carte')}
                  accessibilityLabel="Découvrir le Matcha Zen Latte Glacé"
                >
                  <Text style={[styles.promoCta, { color: '#FFFFFF' }]}>Découvrir</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </ScrollView>
        </Animated.View>

        {/* Pills catégorie */}
        <Animated.View
          style={{
            opacity: sectionAnims[2].opacity,
            transform: [{ translateY: sectionAnims[2].translateY }],
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pills}
          >
            {categories.map((cat) => (
              <Pill
                key={cat.id}
                label={cat.label}
                active={selectedCategory === cat.id}
                onPress={() => setSelectedCategory(cat.id)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Section "À LA CARTE" + Carrousel produits */}
        <Animated.View
          style={{
            opacity: sectionAnims[3].opacity,
            transform: [{ translateY: sectionAnims[3].translateY }],
          }}
        >
          <Text style={styles.sectionLabel}>À LA CARTE</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            decelerationRate="fast"
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="start"
            onScroll={handleCarouselScroll}
            scrollEventThrottle={16}
          >
            {carouselProducts.map((product) => (
              <ProductCardCarousel
                key={product.id}
                product={product}
                onPress={() => router.push(`/produit/${product.id}`)}
              />
            ))}
          </ScrollView>

          {/* Dots pagination */}
          <View style={styles.dotsContainer}>
            {carouselProducts.map((product, index) => (
              <View
                key={product.id}
                style={[styles.dot, index === activeCardIndex && styles.dotActive]}
              />
            ))}
          </View>
        </Animated.View>

        {/* Section "Nouveautés" + "Nos coups de cœur" */}
        <Animated.View
          style={{
            opacity: sectionAnims[4].opacity,
            transform: [{ translateY: sectionAnims[4].translateY }],
          }}
        >
          {/* Section "Nouveautés" si des produits récents */}
          {allProducts.some((p) => p.isNew) && (
            <>
              <View style={styles.favoritesHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.favoritesTitle}>Nouveautés</Text>
                  <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newProductsScroll}>
                {allProducts.filter((p) => p.isNew).map((product) => (
                  <Pressable
                    key={product.id}
                    onPress={() => router.push(`/produit/${product.id}`)}
                    style={styles.newProductCard}
                    accessibilityLabel={`${product.name}, ${priceAccessibilityLabel(product.price)}, nouveau produit`}
                  >
                    <Image
                      source={{ uri: product.image }}
                      style={styles.newProductImage}
                      contentFit="cover"
                      transition={200}
                      accessibilityLabel={`Photo de ${product.name}`}
                    />
                    <Text style={styles.newProductName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.newProductPrice}>{formatPrice(product.price)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          {/* ──── Encart Défis ──── */}
          <Pressable
            style={styles.defisCardWrap}
            onPress={() => router.push('/defis')}
            accessibilityRole="button"
            accessibilityLabel="Voir mes défis en cours"
          >
            <LinearGradient
              colors={['#5a7a64', '#75967F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.defisCard}
            >
              {/* Icon déco en arrière-plan */}
              <View style={styles.defisDecoIcon}>
                <Trophy size={80} color="rgba(255,255,255,0.08)" strokeWidth={1} />
              </View>

              {/* Badge "X défis en cours" */}
              <View style={styles.defisBadge}>
                <Text style={styles.defisBadgeText}>3 défis actifs</Text>
              </View>

              <Text style={styles.defisCardTitle}>Les Défis Teaven</Text>
              <Text style={styles.defisCardSub}>Relevez nos défis et gagnez des points bonus</Text>

              <View style={styles.defisCardCta}>
                <Text style={styles.defisCardCtaText}>Voir les défis →</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Section "Nos coups de cœur" */}
          <View style={styles.favoritesHeader}>
            <Text style={styles.favoritesTitle}>Nos coups de cœur</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/carte')}
              accessibilityLabel="Voir tous les coups de cœur"
            >
              <Text style={styles.seeAll}>Voir tout</Text>
            </Pressable>
          </View>

          {/* Liste coups de cœur */}
          <View style={styles.favoritesList}>
            {favorites.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => router.push(`/produit/${product.id}`)}
                style={({ pressed }) => [styles.favoriteItem, pressed && styles.favoritePressed]}
                accessibilityLabel={`${product.name}, ${priceAccessibilityLabel(product.price)}`}
              >
                <Image
                  source={{ uri: product.image }}
                  style={styles.favoriteThumbnail}
                  contentFit="cover"
                  transition={200}
                  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                  accessibilityLabel={`Photo de ${product.name}`}
                />
                <View style={styles.favoriteContent}>
                  <Text style={styles.favoriteName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.favoriteDescription} numberOfLines={1}>
                    {product.description}
                  </Text>
                </View>
                <Text style={styles.favoritePrice}>{formatPrice(product.price)}</Text>
              </Pressable>
            ))}
          </View>

          {/* Encart Instagram */}
          <View style={styles.instagramSection}>
            <View style={styles.instagramHeader}>
              <View>
                <Text style={styles.instagramTitle}>Notre univers</Text>
                <Text style={styles.instagramHandle}>@teaven.co</Text>
              </View>
              <Pressable
                style={styles.instagramButton}
                onPress={() => {
                  const deeplink = 'instagram://user?username=teaven.co';
                  Linking.canOpenURL(deeplink).then((can) => {
                    Linking.openURL(can ? deeplink : 'https://instagram.com/teaven.co');
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel="Voir le profil Instagram Teaven"
              >
                <Instagram size={14} color="#FFFFFF" strokeWidth={1.8} />
                <Text style={styles.instagramButtonText}>Voir le profil</Text>
              </Pressable>
            </View>
            <View style={styles.instagramGrid}>
              {['#E8F0EA', '#F5EFDF', '#2C4A32', '#EDE4CC'].map((bg, i) => (
                <Pressable
                  key={i}
                  style={[styles.instagramPost, { backgroundColor: bg }]}
                  onPress={() => {
                    const deeplink = 'instagram://user?username=teaven.co';
                    Linking.canOpenURL(deeplink).then((can) => {
                      Linking.openURL(can ? deeplink : 'https://instagram.com/teaven.co');
                    });
                  }}
                  accessibilityLabel={`Post Instagram ${i + 1}`}
                >
                  <Leaf size={22} color={i === 2 ? 'rgba(255,255,255,0.4)' : 'rgba(107,143,113,0.3)'} strokeWidth={1} />
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modal recherche */}
      <SearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSelect={(product) => router.push(`/produit/${product.id}`)}
      />

      {/* Modal rechargement wallet */}
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
  content: {
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: 26,
    letterSpacing: -0.5,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  notifButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Wallet banner
  walletBanner: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    backgroundColor: colors.greenLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#B8D4BC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  walletBannerText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  walletBannerAmount: {
    fontFamily: fonts.bold,
    color: colors.text,
  },
  walletBannerCta: {
    fontFamily: fonts.bold,
    color: colors.green,
  },

  // Recherche
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchPlaceholder: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },

  // Badge notification
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },

  // Bannières promos carrousel
  promosContainer: {
    marginBottom: spacing.sm,
  },
  promosContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  promoCard: {
    borderRadius: radii.card,
    height: 120,
    width: 300,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  promoContent: {
    flex: 1,
    gap: 4,
  },
  promoTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  promoSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#4A6B50',
    lineHeight: 18,
  },
  promoCta: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.green,
    marginTop: 4,
  },
  promoIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(107,143,113,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },

  // Pills
  pills: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },

  // Section label
  sectionLabel: {
    ...typography.label,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  // Carrousel
  carousel: {
    paddingHorizontal: spacing.xl,
    gap: CARD_GAP,
  },

  // Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.green,
    borderRadius: 9,
  },

  // Coups de cœur
  favoritesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  favoritesTitle: {
    ...typography.h3,
  },
  seeAll: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.green,
  },
  favoritesList: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: spacing.md,
    ...shadows.subtle,
  },
  favoritePressed: {
    opacity: 0.7,
  },
  favoriteThumbnail: {
    width: 46,
    height: 46,
    borderRadius: 10,
  },
  favoriteContent: {
    flex: 1,
  },
  favoriteName: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.text,
    marginBottom: 2,
  },
  favoriteDescription: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  favoritePrice: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 13,
    color: colors.green,
    marginRight: spacing.xs,
  },

  // Nouveautés
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  newBadge: {
    backgroundColor: colors.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.tag,
  },
  newBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  newProductsScroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  newProductCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  newProductImage: {
    width: 140,
    height: 100,
  },
  newProductName: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.text,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  newProductPrice: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 12,
    color: colors.green,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 2,
  },

  // Encart Défis
  defisCardWrap: {
    paddingHorizontal: spacing.xl,
    marginTop: 28,
    marginBottom: spacing.xxl,
  },
  defisCard: {
    borderRadius: 16,
    height: 170,
    padding: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    ...shadows.card,
  },
  defisDecoIcon: {
    position: 'absolute',
    right: -10,
    top: -10,
  },
  defisBadge: {
    position: 'absolute',
    top: 16,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  defisBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  defisCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  defisCardSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  defisCardCta: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  defisCardCtaText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  // Instagram
  instagramSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
  },
  instagramHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  instagramTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  instagramHandle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  instagramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C13584',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 10,
  },
  instagramButtonText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  instagramGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  instagramPost: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
