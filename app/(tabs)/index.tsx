// Écran Accueil — fidèle aux maquettes Teaven
import { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bell, Search } from 'lucide-react-native';
import { Pill } from '@/components/ui/Pill';
import { ProductCardCarousel } from '@/components/ui/ProductCardCarousel';
import { useCatalog } from '@/hooks/useCatalog';
import { mockUser, mockProducts } from '@/constants/mockData';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';

// Largeur d'une card carrousel + gap
const CARD_WIDTH = 260;
const CARD_GAP = spacing.md;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, categories, selectedCategory, setSelectedCategory } = useCatalog();
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  // Produits pour le carrousel (filtrés par catégorie)
  const carouselProducts = products;

  // Coups de cœur (top 3 par note)
  const favorites = [...mockProducts]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  // Calcul de la page active du carrousel pour les dots
  const handleCarouselScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SNAP_INTERVAL);
      setActiveCardIndex(index);
    },
    [],
  );

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header : avatar + greeting + notification */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>J</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Bonjour {mockUser.name}</Text>
            <Text style={styles.subtitle}>Qu'est-ce qui vous ferait du bien ?</Text>
          </View>
        </View>
        <Pressable style={styles.notifButton}>
          <Bell size={20} color={colors.textSecondary} strokeWidth={1.5} />
        </Pressable>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textMuted} strokeWidth={1.6} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textMuted}
            editable={false}
          />
        </View>
      </View>

      {/* Pills catégorie — scrollable horizontal */}
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

      {/* Carrousel produits horizontal avec snap */}
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
          >
            <Image
              source={{ uri: product.image }}
              style={styles.favoriteThumbnail}
              contentFit="cover"
              transition={200}
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
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
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

  // Dots pagination
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

  // Liste favoris
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
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: '600',
    color: colors.green,
    marginRight: spacing.xs,
  },
});
