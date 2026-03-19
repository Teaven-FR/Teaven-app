// Écran Accueil — salutation dynamique, bannière promo, pull-to-refresh
import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bell, Search, Leaf } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pill } from '@/components/ui/Pill';
import { ProductCardCarousel } from '@/components/ui/ProductCardCarousel';
import { SearchModal } from '@/components/ui/SearchModal';
import { useCatalog } from '@/hooks/useCatalog';
import { mockUser, mockProducts } from '@/constants/mockData';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';

// Largeur d'une card carrousel + gap
const CARD_WIDTH = 260;
const CARD_GAP = spacing.md;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

/** Salutation dynamique selon l'heure */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'Bonjour';
  if (hour >= 12 && hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, categories, selectedCategory, setSelectedCategory } = useCatalog();
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  // Produits pour le carrousel (filtrés par catégorie)
  const carouselProducts = products;

  // Coups de cœur (top 3 par note)
  const favorites = [...mockProducts]
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

  // Pull-to-refresh simulé
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

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
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {mockUser.name.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting}>
                {getGreeting()} {mockUser.name}
              </Text>
              <Text style={styles.subtitle}>
                Qu'est-ce qui vous ferait du bien ?
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.notifButton}
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color={colors.textSecondary} strokeWidth={1.5} />
          </Pressable>
        </View>

        {/* Barre de recherche */}
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

        {/* Bannière promotionnelle */}
        <View style={styles.promoWrapper}>
          <LinearGradient
            colors={['#E8F0EA', '#D4E5D7']}
            style={styles.promoCard}
          >
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>Première commande ?</Text>
              <Text style={styles.promoSubtitle}>
                Profitez de -15% avec le code BIENVENUE
              </Text>
              <Pressable>
                <Text style={styles.promoCta}>En profiter</Text>
              </Pressable>
            </View>
            <View style={styles.promoIconWrap}>
              <Leaf size={36} color={colors.green} strokeWidth={1} />
            </View>
          </LinearGradient>
        </View>

        {/* Pills catégorie */}
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

        {/* Section "À LA CARTE" */}
        <Text style={styles.sectionLabel}>À LA CARTE</Text>

        {/* Carrousel produits */}
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

        {/* Section "Nos coups de cœur" */}
        <View style={styles.favoritesHeader}>
          <Text style={styles.favoritesTitle}>Nos coups de cœur</Text>
          <Pressable onPress={() => router.push('/carte')}>
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
              accessibilityLabel={`${product.name}, ${formatPrice(product.price)}`}
            >
              <Image
                source={{ uri: product.image }}
                style={styles.favoriteThumbnail}
                contentFit="cover"
                transition={200}
                placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
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
      </ScrollView>

      {/* Modal recherche */}
      <SearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSelect={(product) => router.push(`/produit/${product.id}`)}
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

  // Bannière promo
  promoWrapper: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  promoCard: {
    borderRadius: 16,
    height: 100,
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
});
