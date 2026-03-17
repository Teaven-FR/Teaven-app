// Fiche produit — hero parallax + modificateurs + suggestions
import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Share2,
  MapPin,
  Flame,
  Clock,
  Minus,
  Plus,
  Star,
} from 'lucide-react-native';
import { ModifierSelector, type ModifierGroup } from '@/components/features/ModifierSelector';
import { ProductMiniCard } from '@/components/features/ProductMiniCard';
import { useCartStore } from '@/stores/cartStore';
import { useToast } from '@/contexts/ToastContext';
import { mockProducts } from '@/constants/mockData';
import { colors, fonts, spacing, typography } from '@/constants/theme';

const HERO_HEIGHT = 340;

// Modificateurs par produit
const productModifiers: Record<string, ModifierGroup[]> = {
  '2': [ // Matcha Zen Latte
    {
      id: 'size',
      label: 'Personnaliser — Taille',
      type: 'single',
      options: [
        { id: 'small', label: 'Petit', price: 0 },
        { id: 'medium', label: 'Moyen', price: 0 },
        { id: 'large', label: 'Grand', price: 100 },
      ],
    },
    {
      id: 'extras',
      label: 'Suppléments',
      type: 'multiple',
      options: [
        { id: 'oat', label: "Lait d'avoine", price: 50 },
        { id: 'maple', label: "Sirop d'érable", price: 30 },
      ],
    },
  ],
  '1': [ // Zen Buddha Bowl
    {
      id: 'size',
      label: 'Personnaliser — Taille',
      type: 'single',
      options: [
        { id: 'regular', label: 'Normal', price: 0 },
        { id: 'xl', label: 'XL', price: 200 },
      ],
    },
    {
      id: 'extras',
      label: 'Suppléments',
      type: 'multiple',
      options: [
        { id: 'avocado', label: 'Avocat extra', price: 150 },
        { id: 'tofu', label: 'Tofu grillé', price: 100 },
      ],
    },
  ],
};

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addItem = useCartStore((s) => s.addItem);
  const { showToast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});

  // Parallax scroll
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroTranslate = scrollY.interpolate({
    inputRange: [-100, 0, HERO_HEIGHT],
    outputRange: [-50, 0, HERO_HEIGHT * 0.4],
    extrapolate: 'clamp',
  });

  // Micro-interaction boutons CTA
  const addScale = useRef(new Animated.Value(1)).current;
  const orderScale = useRef(new Animated.Value(1)).current;

  const product = mockProducts.find((p) => p.id === id);

  if (!product) {
    return (
      <View style={styles.notFound}>
        <Text style={typography.h3}>Produit introuvable</Text>
      </View>
    );
  }

  // Calcul du prix avec modificateurs
  const modifiers = productModifiers[product.id] || [];
  const extraPrice = Object.entries(selectedModifiers).reduce((sum, [groupId, ids]) => {
    const group = modifiers.find((g) => g.id === groupId);
    if (!group) return sum;
    return sum + ids.reduce((s, optId) => {
      const opt = group.options.find((o) => o.id === optId);
      return s + (opt?.price || 0);
    }, 0);
  }, 0);

  const unitPrice = product.price + extraPrice;

  // Suggestions : même catégorie, produit différent
  const suggestions = mockProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  const handleModifierToggle = (groupId: string, modifierId: string) => {
    const group = modifiers.find((g) => g.id === groupId);
    if (!group) return;

    setSelectedModifiers((prev) => {
      const current = prev[groupId] || [];
      if (group.type === 'single') {
        return { ...prev, [groupId]: [modifierId] };
      }
      // multiple toggle
      if (current.includes(modifierId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== modifierId) };
      }
      return { ...prev, [groupId]: [...current, modifierId] };
    });
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) addItem(product);
    showToast('Ajouté au panier');
  };

  const handleOrder = () => {
    for (let i = 0; i < quantity; i++) addItem(product);
    router.push('/(tabs)/panier');
  };

  const animatePressIn = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 0.97,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  const animatePressOut = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {/* ──── Hero zone avec parallax ──── */}
        <Animated.View
          style={[
            styles.hero,
            { transform: [{ translateY: heroTranslate }] },
          ]}
        >
          <LinearGradient
            colors={['#2C4A32', '#3A5A40', '#4A6B50']}
            style={StyleSheet.absoluteFill}
          />
          <Image
            source={{ uri: product.image }}
            style={styles.heroImage}
            contentFit="contain"
            transition={400}
            placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
          />
        </Animated.View>

        {/* Bouton retour */}
        <Pressable
          onPress={() => router.back()}
          style={[styles.navButton, { top: insets.top + 12, left: 20 }]}
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={16} color="#FFFFFF" strokeWidth={2} />
        </Pressable>

        {/* Bouton partage */}
        <Pressable
          style={[styles.navButton, { top: insets.top + 12, right: 20 }]}
          accessibilityLabel="Partager"
        >
          <Share2 size={16} color="#FFFFFF" strokeWidth={2} />
        </Pressable>

        {/* ──── Zone détail ──── */}
        <View style={styles.details}>
          {/* Nom + rating */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{product.name}</Text>
            <View style={styles.ratingBadge}>
              <Star size={11} color="#F5C542" fill="#F5C542" strokeWidth={0} />
              <Text style={styles.ratingText}>{product.rating}</Text>
            </View>
          </View>

          {/* Badges info */}
          <View style={styles.infoBadges}>
            <View style={styles.infoBadge}>
              <MapPin size={12} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.infoBadgeText}>{product.location}</Text>
            </View>
            {product.kcal > 0 && (
              <View style={styles.infoBadge}>
                <Flame size={12} color={colors.textSecondary} strokeWidth={1.8} />
                <Text style={styles.infoBadgeText}>{product.kcal} Kcal</Text>
              </View>
            )}
            <View style={styles.infoBadge}>
              <Clock size={12} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.infoBadgeText}>{product.prepTime} min</Text>
            </View>
          </View>

          {/* Description */}
          <Text
            style={styles.description}
            numberOfLines={showFullDescription ? undefined : 4}
          >
            {product.description}
          </Text>
          {!showFullDescription && (
            <Pressable onPress={() => setShowFullDescription(true)}>
              <Text style={styles.readMore}>Lire la suite</Text>
            </Pressable>
          )}

          {/* Modificateurs */}
          {modifiers.length > 0 && (
            <View style={styles.modifiersSection}>
              {modifiers.map((group) => (
                <ModifierSelector
                  key={group.id}
                  group={group}
                  selected={selectedModifiers[group.id] || []}
                  onToggle={(modId) => handleModifierToggle(group.id, modId)}
                />
              ))}
            </View>
          )}

          {/* Tags */}
          <View style={styles.tags}>
            {product.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
              </View>
            ))}
          </View>

          {/* Prix + sélecteur quantité */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(unitPrice)}</Text>
            <View style={styles.quantitySelector}>
              <Pressable
                onPress={() => quantity > 1 && setQuantity((q) => q - 1)}
                style={[styles.qtyButton, quantity <= 1 && styles.qtyButtonDisabled]}
                accessibilityLabel="Réduire la quantité"
              >
                <Minus
                  size={14}
                  color={quantity <= 1 ? colors.border : colors.textSecondary}
                  strokeWidth={2}
                />
              </Pressable>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <Pressable
                onPress={() => setQuantity((q) => q + 1)}
                style={styles.qtyButton}
                accessibilityLabel="Augmenter la quantité"
              >
                <Plus size={14} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionsTitle}>Vous aimerez aussi</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsScroll}
              >
                {suggestions.map((p) => (
                  <ProductMiniCard
                    key={p.id}
                    product={p}
                    onPress={() => router.push(`/produit/${p.id}`)}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* ──── CTA sticky ──── */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Animated.View style={{ flex: 1, transform: [{ scale: addScale }] }}>
          <Pressable
            onPress={handleAddToCart}
            onPressIn={() => animatePressIn(addScale)}
            onPressOut={() => animatePressOut(addScale)}
            style={[styles.ctaButton, styles.ctaSecondary]}
            accessibilityLabel="Ajouter au panier"
          >
            <Text style={styles.ctaSecondaryText}>Ajouter au panier</Text>
          </Pressable>
        </Animated.View>
        <Animated.View style={{ flex: 1, transform: [{ scale: orderScale }] }}>
          <Pressable
            onPress={handleOrder}
            onPressIn={() => animatePressIn(orderScale)}
            onPressOut={() => animatePressOut(orderScale)}
            style={[styles.ctaButton, styles.ctaPrimary]}
            accessibilityLabel="Commander maintenant"
          >
            <Text style={styles.ctaPrimaryText}>Commander</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  hero: {
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  heroImage: {
    width: '70%',
    height: 260,
  },
  navButton: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Détails
  details: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.text,
  },

  // Badges info
  infoBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    backgroundColor: '#F5F5F0',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  infoBadgeText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Description
  description: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: '#4A4A4A',
    marginBottom: spacing.xs,
  },
  readMore: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.green,
    marginBottom: spacing.lg,
  },

  // Modificateurs
  modifiersSection: {
    marginBottom: spacing.sm,
  },

  // Tags
  tags: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  tag: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.green,
    textTransform: 'uppercase',
  },

  // Prix + quantité
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  price: {
    fontFamily: fonts.mono,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonDisabled: {
    opacity: 0.5,
  },
  qtyValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    minWidth: 20,
    textAlign: 'center',
  },

  // Suggestions
  suggestionsSection: {
    marginBottom: spacing.xl,
  },
  suggestionsTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  suggestionsScroll: {
    gap: spacing.md,
  },

  // CTA sticky
  cta: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  ctaButton: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaSecondaryText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  ctaPrimary: {
    backgroundColor: colors.green,
  },
  ctaPrimaryText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
