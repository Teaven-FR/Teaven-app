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
import { Bell, Search, Leaf, Instagram, Trophy, Flame, Star, Zap, ChevronRight, Wallet } from 'lucide-react-native';
import { Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { Pill } from '@/components/ui/Pill';
import { ProductCardCarousel } from '@/components/ui/ProductCardCarousel';
import { SearchModal } from '@/components/ui/SearchModal';
import { useCatalog } from '@/hooks/useCatalog';
import { useUser } from '@/hooks/useUser';
import { useInstagramFeed } from '@/hooks/useInstagramFeed';
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
  const { user, isGuest, wallet, rechargeWallet, loyalty } = useUser();
  const { showToast } = useToast();
  const setPromoCode = useCartStore((s) => s.setPromoCode);
  const orderHistory = useOrderStore((s) => s.orderHistory ?? []);
  const { posts: instaPosts } = useInstagramFeed(6);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [rechargeVisible, setRechargeVisible] = useState(false);
  const [defisExpanded, setDefisExpanded] = useState(false);
  const defisAnim = useRef(new Animated.Value(0)).current;

  const DEFI_COMPACT_H = 56;
  const DEFI_FULL_H = 286;

  const toggleDefis = () => {
    const toValue = defisExpanded ? 0 : 1;
    Animated.spring(defisAnim, {
      toValue,
      damping: 20,
      stiffness: 160,
      useNativeDriver: false,
    }).start();
    setDefisExpanded(!defisExpanded);
  };

  const defisContainerHeight = defisAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [DEFI_COMPACT_H, DEFI_FULL_H],
  });
  const defisStripOpacity = defisAnim.interpolate({ inputRange: [0, 0.25], outputRange: [1, 0] });
  const defisDetailOpacity = defisAnim.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1] });

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
              <Pressable onPress={() => router.push('/fidelite')} style={styles.avatarWrap}>
                <Svg width={46} height={46} viewBox="0 0 46 46" style={styles.avatarRing}>
                  <SvgCircle cx={23} cy={23} r={21} stroke="rgba(117,150,127,0.15)" strokeWidth={2.5} fill="none" />
                  <SvgCircle
                    cx={23} cy={23} r={21}
                    stroke="#75967F"
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 21}`}
                    strokeDashoffset={`${2 * Math.PI * 21 * (1 - (loyalty.progressPercent / 100))}`}
                    transform="rotate(-90 23 23)"
                  />
                </Svg>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(isGuest ? 'I' : user.fullName.charAt(0))}
                  </Text>
                </View>
              </Pressable>
              <View>
                <Text style={styles.greeting}>
                  {getGreeting()}{isGuest ? '' : `, ${user.fullName.split(' ')[0]}`}
                </Text>
                <Text style={styles.subtitle}>
                  Qu'est-ce qui vous ferait du bien ?
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={styles.notifButton}
                accessibilityLabel="Rechercher"
                onPress={() => setSearchVisible(true)}
              >
                <Search size={19} color={colors.textSecondary} strokeWidth={1.3} />
              </Pressable>
              <Pressable
                style={styles.notifButton}
                accessibilityLabel="Notifications"
                onPress={() => router.push('/notifications')}
              >
                <Bell size={19} color={colors.textSecondary} strokeWidth={1.3} />
                <View style={styles.notifBadge} />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Promos + défis */}
        <Animated.View
          style={{
            opacity: sectionAnims[1].opacity,
            transform: [{ translateY: sectionAnims[1].translateY }],
          }}
        >
          {/* Bandeau rechargement wallet si solde faible */}
          {!isGuest && wallet.balance < 500 && (
            <Pressable
              onPress={() => setRechargeVisible(true)}
              style={styles.walletBanner}
              accessibilityRole="button"
              accessibilityLabel="Recharger votre porte-monnaie"
            >
              <Wallet size={13} color="#C27B5A" strokeWidth={1.5} />
              <Text style={styles.walletBannerText}>
                Solde : <Text style={styles.walletBannerAmount}>{(wallet.balance / 100).toFixed(2).replace('.', ',')} €</Text>
              </Text>
              <Text style={styles.walletBannerCta}>Recharger</Text>
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
            {/* Bannières dynamiques contextuelles */}
            {orderHistory.length === 0 && (
              <LinearGradient colors={['#E8F0EA', '#D4E5D7']} style={styles.promoCard}>
                <View style={styles.promoContent}>
                  <Text style={styles.promoTitle}>Première commande ?</Text>
                  <Text style={styles.promoSubtitle}>-15% avec le code BIENVENUE</Text>
                  <Pressable
                    onPress={() => {
                      setPromoCode('BIENVENUE');
                      showToast('Code BIENVENUE activé !');
                      router.push('/(tabs)/carte');
                    }}
                  >
                    <Text style={styles.promoCta}>En profiter</Text>
                  </Pressable>
                </View>
                <View style={styles.promoIconWrap}>
                  <Leaf size={36} color={colors.green} strokeWidth={1} />
                </View>
              </LinearGradient>
            )}

            {/* Première recharge incentivée OU recharge classique */}
            {wallet.balance === 0 ? (
              <LinearGradient colors={['#75967F', '#4A6B50']} style={styles.promoCard}>
                <View style={styles.promoContent}>
                  <Text style={[styles.promoTitle, { color: '#FFFFFF' }]}>Votre première recharge</Text>
                  <Text style={[styles.promoSubtitle, { color: 'rgba(255,255,255,0.85)' }]}>
                    20 € + 5 € offerts
                  </Text>
                  <Pressable onPress={() => setRechargeVisible(true)}>
                    <Text style={[styles.promoCta, { color: '#FFFFFF' }]}>Recharger maintenant</Text>
                  </Pressable>
                </View>
                <View style={styles.promoIconWrap}>
                  <Wallet size={36} color="rgba(255,255,255,0.3)" strokeWidth={1} />
                </View>
              </LinearGradient>
            ) : wallet.balance < 1000 ? (
              <LinearGradient colors={['#D4937A', '#C27B5A']} style={styles.promoCard}>
                <View style={styles.promoContent}>
                  <Text style={[styles.promoTitle, { color: '#FFFFFF' }]}>Rechargez votre wallet</Text>
                  <Text style={[styles.promoSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                    Solde : {(wallet.balance / 100).toFixed(2).replace('.', ',')} €
                  </Text>
                  <Pressable onPress={() => setRechargeVisible(true)}>
                    <Text style={[styles.promoCta, { color: '#FFFFFF' }]}>Recharger</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            ) : null}

            <LinearGradient colors={['#F5EFDF', '#EDE4CC']} style={styles.promoCard}>
              <View style={styles.promoContent}>
                <Text style={styles.promoTitle}>Parrainez un proche</Text>
                <Text style={styles.promoSubtitle}>5€ pour vous, 5€ pour lui</Text>
                <Pressable onPress={() => router.push('/referral')}>
                  <Text style={[styles.promoCta, { color: colors.gold }]}>Parrainer</Text>
                </Pressable>
              </View>
            </LinearGradient>

            <LinearGradient colors={['#2C4A32', '#4A6B50']} style={styles.promoCard}>
              <View style={styles.promoContent}>
                <Text style={[styles.promoTitle, { color: '#FFFFFF' }]}>Atmosphère</Text>
                <Text style={[styles.promoSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                  Prenez soin de vous — lisez nos articles bien-être
                </Text>
                <Pressable onPress={() => router.push('/(tabs)/blog')}>
                  <Text style={[styles.promoCta, { color: '#FFFFFF' }]}>Lire</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </ScrollView>

          {/* ──── Strip Défis (compact → pleine carte) ──── */}
          <Animated.View style={[styles.defisAnimContainer, { height: defisContainerHeight }]}>
            <Pressable
              onPress={toggleDefis}
              accessibilityRole="button"
              accessibilityLabel="Défis en cours — appuyer pour développer"
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={['#243D29', '#2E5235', '#3A6642']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.defisFullGradient}
              >
                {/* ── Version compacte (disparaît à l'ouverture) ── */}
                <Animated.View style={[styles.defisStripRow, { opacity: defisStripOpacity }]}>
                  <View style={styles.defisStripLeft}>
                    <View style={styles.defisStripIconWrap}>
                      <Flame size={14} color={colors.gold} strokeWidth={2} />
                    </View>
                    <View>
                      <Text style={styles.defisStripProgram}>DÉFIS · 3 ACTIFS</Text>
                      <Text style={styles.defisStripChallenge}>Série en cours — 3/5 jours</Text>
                    </View>
                  </View>
                  <View style={styles.defisStripBarWrap}>
                    <View style={styles.defisStripBar}>
                      <View style={[styles.defisStripFill, { width: '60%' }]} />
                    </View>
                    <Text style={styles.defisStripPts}>+500 pts</Text>
                  </View>
                  <ChevronRight size={16} color="rgba(255,255,255,0.4)" strokeWidth={2} />
                </Animated.View>

                {/* ── Version développée (apparaît à l'ouverture) ── */}
                <Animated.View style={[styles.defisFullContent, { opacity: defisDetailOpacity }]}>
                  {/* Header */}
                  <View style={styles.defisHeader}>
                    <View style={{ flex: 1 }}>
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

                  {/* Défis avec progress */}
                  <View style={styles.defisRows}>
                    {([
                      { icon: 'flame', label: 'Série en cours', progress: 3, target: 5, pts: 500 },
                      { icon: 'trophy', label: 'Challenge du mois', progress: 4, target: 10, pts: 1000 },
                      { icon: 'star', label: 'Explorateur', progress: 3, target: 3, pts: 300 },
                    ] as const).map((defi) => {
                      const pct = Math.min((defi.progress / defi.target) * 100, 100);
                      const done = defi.progress >= defi.target;
                      const Icon = defi.icon === 'flame' ? Flame : defi.icon === 'trophy' ? Trophy : Star;
                      const circR = 11;
                      const circC = 2 * Math.PI * circR;
                      return (
                        <View key={defi.label} style={styles.defisRow}>
                          <View style={styles.defisRowIcon}>
                            <Svg width={26} height={26} viewBox="0 0 26 26" style={{ position: 'absolute' }}>
                              <SvgCircle cx={13} cy={13} r={circR} stroke="rgba(255,255,255,0.1)" strokeWidth={2} fill="none" />
                              <SvgCircle
                                cx={13} cy={13} r={circR}
                                stroke={done ? colors.gold : 'rgba(255,255,255,0.5)'}
                                strokeWidth={2}
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${circC}`}
                                strokeDashoffset={`${circC * (1 - pct / 100)}`}
                                transform="rotate(-90 13 13)"
                              />
                            </Svg>
                            <Icon size={10} color={done ? colors.gold : 'rgba(255,255,255,0.7)'} strokeWidth={2} />
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
                    <Pressable
                      style={styles.defisFooterCta}
                      onPress={() => router.push('/defis')}
                      accessibilityRole="button"
                      accessibilityLabel="Voir tous les défis"
                    >
                      <Text style={styles.defisFooterCtaText}>Voir les défis</Text>
                      <ChevronRight size={14} color={colors.greenDark} strokeWidth={2.5} />
                    </Pressable>
                  </View>
                </Animated.View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.instagramGrid}
            >
              {(instaPosts.length > 0 ? instaPosts : Array.from({ length: 6 }, (_, i) => ({ id: `ph-${i}`, image_url: '', post_url: '' }))).slice(0, 6).map((post, i) => (
                <Pressable
                  key={post.id}
                  style={styles.instagramPost}
                  onPress={() => {
                    const fallback = () => {
                      const deeplink = 'instagram://user?username=teaven.co';
                      Linking.canOpenURL(deeplink).then((can) => {
                        Linking.openURL(can ? deeplink : 'https://instagram.com/teaven.co');
                      });
                    };
                    if (post.post_url) {
                      Linking.openURL(post.post_url).catch(fallback);
                    } else {
                      fallback();
                    }
                  }}
                  accessibilityLabel={`Post Instagram ${i + 1}`}
                >
                  {post.image_url ? (
                    <Image
                      source={{ uri: post.image_url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={300}
                    />
                  ) : (
                    <View style={[{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }, { backgroundColor: ['#E8F0EA', '#F5EFDF', '#2C4A32', '#EDE4CC', '#E8F0EA', '#F5EFDF'][i] }]}>
                      <Leaf size={28} color={i === 2 ? 'rgba(255,255,255,0.4)' : 'rgba(107,143,113,0.3)'} strokeWidth={1} />
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
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
    paddingBottom: 40,
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
  avatarWrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    position: 'absolute',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.text,
    maxWidth: '75%',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(194,123,90,0.08)',
  },
  walletBannerText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  walletBannerAmount: {
    fontFamily: fonts.bold,
    color: '#C27B5A',
  },
  walletBannerCta: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#C27B5A',
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

  // Défis animé — accueil (compact ↔ pleine carte)
  defisAnimContainer: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: 14,
    overflow: 'hidden',
    ...shadows.card,
  },
  defisFullGradient: {
    flex: 1,
  },
  defisStripRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  defisStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  defisStripIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defisStripProgram: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.gold,
    marginBottom: 2,
  },
  defisStripChallenge: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  defisStripBarWrap: {
    flex: 1,
    gap: 4,
  },
  defisStripBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  defisStripFill: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 2,
  },
  defisStripPts: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 10,
    color: colors.gold,
    alignSelf: 'flex-end',
  },
  // Contenu pleine carte
  defisFullContent: {
    padding: 16,
    paddingBottom: 10,
  },
  defisHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  defisProgramLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  defisProgramText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.gold,
  },
  defisCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  defisBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  defisBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  defisRows: {
    gap: 10,
    marginBottom: 12,
  },
  defisRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  defisRowIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  defisRowContent: {
    flex: 1,
    gap: 4,
  },
  defisRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  defisRowLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  defisRowPts: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  defisProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    color: 'rgba(255,255,255,0.45)',
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
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.gold,
  },
  defisFooterCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  defisFooterCtaText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.greenDark,
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
    backgroundColor: colors.green,
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
    gap: spacing.md,
    paddingRight: spacing.xl,
  },
  instagramPost: {
    width: 156,
    height: 156,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
