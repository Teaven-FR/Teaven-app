// Fiche produit — hero parallax + modificateurs dynamiques + suggestions
import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Share2,
  Flame,
  Clock,
  Minus,
  Plus,
  Star,
  Leaf,
  Wheat,
  Heart,
} from 'lucide-react-native';
import { ModifierSelector } from '@/components/features/ModifierSelector';
import { ProductMiniCard } from '@/components/features/ProductMiniCard';
import { useCartStore } from '@/stores/cartStore';
import { useToast } from '@/contexts/ToastContext';
import { useProduct, useCatalog } from '@/hooks/useCatalog';
import { mockProducts } from '@/constants/mockData';
import { colors, fonts, spacing, typography } from '@/constants/theme';

const HERO_HEIGHT = 340;

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addItem = useCartStore((s) => s.addItem);
  const { showToast } = useToast();
  const { product, isLoading, isUsingMockData } = useProduct(id);
  const { allProducts } = useCatalog();

  const [quantity, setQuantity] = useState(1);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [selectedVariationId, setSelectedVariationId] = useState<string | undefined>();

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

  // Fallback : essayer aussi dans les mockProducts si pas trouvé
  const resolvedProduct = product ?? (isUsingMockData ? mockProducts.find((p) => p.id === id) : undefined);

  if (isLoading && !resolvedProduct) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  if (!resolvedProduct) {
    return (
      <View style={styles.notFound}>
        <Text style={typography.h3}>Produit introuvable</Text>
      </View>
    );
  }

  // Modificateurs : depuis Square (dynamiques) ou fallback vide
  const modifiers = resolvedProduct.modifiers ?? [];
  const variations = resolvedProduct.variations ?? [];

  // Variation sélectionnée (ou première par défaut)
  const activeVariation = variations.find((v) => v.id === selectedVariationId) ?? variations[0];
  const basePrice = activeVariation?.price ?? resolvedProduct.price;

  // Calcul du prix avec modificateurs
  const extraPrice = Object.entries(selectedModifiers).reduce((sum, [groupId, ids]) => {
    const group = modifiers.find((g) => g.id === groupId);
    if (!group) return sum;
    return sum + ids.reduce((s, optId) => {
      const opt = group.options.find((o) => o.id === optId);
      return s + (opt?.price || 0);
    }, 0);
  }, 0);

  // Groupes obligatoires non remplis (single = obligatoire)
  const missingRequiredGroups = modifiers.filter(
    (g) => g.type === 'single' && (!selectedModifiers[g.id] || selectedModifiers[g.id].length === 0),
  );
  const hasUnmetRequired = missingRequiredGroups.length > 0;

  // Label du sélecteur de variantes : dériver depuis les noms ou fallback générique
  const variationGroupLabel = (() => {
    if (!variations.length) return 'Choisissez votre option';
    // Détecter si les variantes ressemblent à des tailles (S, M, L, XL, Small, Medium, Large…)
    const sizeKeywords = /^(xs|s|m|l|xl|xxl|small|medium|large|taille|size|\d+(cl|ml|oz|g|kg))$/i;
    const looksLikeSizes = variations.every((v) => sizeKeywords.test(v.name.trim()));
    if (looksLikeSizes) return 'Format';
    return 'Choisissez votre option';
  })();

  const unitPrice = basePrice + extraPrice;

  // Suggestions : même catégorie, produit différent
  const suggestions = allProducts
    .filter((p) => p.category === resolvedProduct.category && p.id !== resolvedProduct.id)
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
      if (current.includes(modifierId)) {
        return { ...prev, [groupId]: current.filter((mid) => mid !== modifierId) };
      }
      return { ...prev, [groupId]: [...current, modifierId] };
    });
  };

  const handleAddToCart = () => {
    addItem(resolvedProduct, quantity, activeVariation, selectedModifiers);
    showToast('Ajouté au panier');
  };

  const handleOrder = () => {
    addItem(resolvedProduct, quantity, activeVariation, selectedModifiers);
    router.push('/(tabs)/panier');
  };

  const animatePressIn = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 0.97,
      damping: 15,
      stiffness: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const animatePressOut = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 15,
      stiffness: 300,
      useNativeDriver: Platform.OS !== 'web',
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
          { useNativeDriver: Platform.OS !== 'web' },
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
            source={{ uri: resolvedProduct.image }}
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
            <Text style={styles.name}>{resolvedProduct.name}</Text>
            <View style={styles.ratingBadge}>
              <Star size={11} color="#F5C542" fill="#F5C542" strokeWidth={0} />
              <Text style={styles.ratingText}>{resolvedProduct.rating}</Text>
            </View>
          </View>

          {/* Badges info */}
          <View style={styles.infoBadges}>
            {resolvedProduct.kcal > 0 && (
              <View style={styles.infoBadge}>
                <Flame size={12} color={colors.textSecondary} strokeWidth={1.8} />
                <Text style={styles.infoBadgeText}>{resolvedProduct.kcal} Kcal</Text>
              </View>
            )}
            <View style={styles.infoBadge}>
              <Clock size={12} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.infoBadgeText}>{resolvedProduct.prepTime} min</Text>
            </View>
            {resolvedProduct.tags.some((t) => /vegan|végétalien/i.test(t)) && (
              <View style={[styles.infoBadge, styles.dietBadge]}>
                <Leaf size={12} color="#3D7A4A" strokeWidth={1.8} />
                <Text style={[styles.infoBadgeText, { color: '#3D7A4A' }]}>Vegan</Text>
              </View>
            )}
            {resolvedProduct.tags.some((t) => /végétarien|vegetarien/i.test(t)) && (
              <View style={[styles.infoBadge, styles.dietBadge]}>
                <Heart size={12} color="#3D7A4A" strokeWidth={1.8} />
                <Text style={[styles.infoBadgeText, { color: '#3D7A4A' }]}>Végétarien</Text>
              </View>
            )}
            {resolvedProduct.tags.some((t) => /sans.gluten|gluten.free/i.test(t)) && (
              <View style={[styles.infoBadge, styles.dietBadge]}>
                <Wheat size={12} color="#B8860B" strokeWidth={1.8} />
                <Text style={[styles.infoBadgeText, { color: '#B8860B' }]}>Sans gluten</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text
            style={styles.description}
            numberOfLines={showFullDescription ? undefined : 4}
          >
            {resolvedProduct.description}
          </Text>
          {!showFullDescription && (
            <Pressable onPress={() => setShowFullDescription(true)}>
              <Text style={styles.readMore}>Lire la suite</Text>
            </Pressable>
          )}

          {/* Sélecteur de variation */}
          {variations.length > 1 && (
            <View style={styles.modifiersSection}>
              <Text style={styles.variationTitle}>{variationGroupLabel}</Text>
              <View style={styles.variationChips}>
                {variations.map((v) => {
                  const isActive = (activeVariation?.id ?? variations[0]?.id) === v.id;
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => setSelectedVariationId(v.id)}
                      style={[styles.variationChip, isActive && styles.variationChipActive]}
                    >
                      <Text style={[styles.variationChipText, isActive && styles.variationChipTextActive]}>
                        {v.name} — {formatPrice(v.price)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Modificateurs dynamiques (depuis Square) */}
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
            {resolvedProduct.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
              </View>
            ))}
          </View>

          {/* ──── Avis clients ──── */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.reviewsTitle}>Avis clients</Text>
              <View style={styles.reviewsSummary}>
                <View style={styles.reviewsStars}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={14}
                      color="#F5C542"
                      fill={i <= Math.round(resolvedProduct.rating) ? '#F5C542' : 'transparent'}
                      strokeWidth={i <= Math.round(resolvedProduct.rating) ? 0 : 1.5}
                    />
                  ))}
                </View>
                <Text style={styles.reviewsAverage}>{resolvedProduct.rating}/5</Text>
                <Text style={styles.reviewsCount}>
                  ({Math.floor(resolvedProduct.rating * 12)} avis)
                </Text>
              </View>
            </View>

            {/* Liste des avis */}
            {[
              { name: 'Marie L.', date: '12 mars 2026', rating: 5, comment: 'Absolument délicieux ! Je recommande à 100%.' },
              { name: 'Thomas P.', date: '8 mars 2026', rating: 4, comment: 'Très bon, portions généreuses. Service rapide.' },
              { name: 'Sophie D.', date: '3 mars 2026', rating: 5, comment: 'Mon préféré chez Teaven. Produits frais et savoureux.' },
            ].map((review) => (
              <View key={review.name} style={styles.reviewCard}>
                <View style={styles.reviewTopRow}>
                  <Text style={styles.reviewName}>{review.name}</Text>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
                <View style={styles.reviewStarsRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={11}
                      color="#F5C542"
                      fill={i <= review.rating ? '#F5C542' : 'transparent'}
                      strokeWidth={i <= review.rating ? 0 : 1.5}
                    />
                  ))}
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))}

            {/* Lien vers tous les avis */}
            <Pressable style={styles.allReviewsLink}>
              <Text style={styles.allReviewsText}>Voir tous les avis</Text>
            </Pressable>
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
        {hasUnmetRequired && (
          <View style={styles.ctaHint}>
            <Text style={styles.ctaHintText}>
              Veuillez choisir :{' '}
              {missingRequiredGroups.map((g) => g.label).join(', ')}
            </Text>
          </View>
        )}
        <View style={styles.ctaButtons}>
          <Animated.View style={{ flex: 1, transform: [{ scale: addScale }] }}>
            <Pressable
              onPress={hasUnmetRequired ? undefined : handleAddToCart}
              onPressIn={hasUnmetRequired ? undefined : () => animatePressIn(addScale)}
              onPressOut={hasUnmetRequired ? undefined : () => animatePressOut(addScale)}
              style={[styles.ctaButton, styles.ctaSecondary, hasUnmetRequired && styles.ctaDisabled]}
              accessibilityLabel="Ajouter au panier"
              accessibilityState={{ disabled: hasUnmetRequired }}
            >
              <Text style={[styles.ctaSecondaryText, hasUnmetRequired && styles.ctaDisabledText]}>
                Ajouter au panier
              </Text>
            </Pressable>
          </Animated.View>
          <Animated.View style={{ flex: 1, transform: [{ scale: orderScale }] }}>
            <Pressable
              onPress={hasUnmetRequired ? undefined : handleOrder}
              onPressIn={hasUnmetRequired ? undefined : () => animatePressIn(orderScale)}
              onPressOut={hasUnmetRequired ? undefined : () => animatePressOut(orderScale)}
              style={[styles.ctaButton, styles.ctaPrimary, hasUnmetRequired && styles.ctaDisabled]}
              accessibilityLabel="Commander maintenant"
              accessibilityState={{ disabled: hasUnmetRequired }}
            >
              <Text style={[styles.ctaPrimaryText, hasUnmetRequired && styles.ctaDisabledText]}>
                Commander
              </Text>
            </Pressable>
          </Animated.View>
        </View>
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
    width: '100%',
    height: 280,
  },
  navButton: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Détails
  details: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    backgroundColor: colors.bg,
    position: 'relative',
    zIndex: 5,
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
  dietBadge: {
    backgroundColor: '#EAF5EC',
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

  // Variations (tailles)
  variationTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  variationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  variationChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  variationChipActive: {
    backgroundColor: colors.green,
  },
  variationChipText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  variationChipTextActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },

  // Tags
  tags: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
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

  // Avis clients
  reviewsSection: {
    backgroundColor: '#F9F9F6',
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  reviewsHeader: {
    marginBottom: spacing.xs,
  },
  reviewsTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  reviewsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewsStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewsAverage: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  reviewsCount: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: spacing.md,
    gap: 4,
  },
  reviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  reviewDate: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  reviewComment: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: '#4A4A4A',
  },
  allReviewsLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  allReviewsText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.green,
  },

  // Prix + quantité
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  price: {
    ...typography.priceLarge,
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
    paddingHorizontal: 20,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  ctaHint: {
    backgroundColor: '#FDF5F4',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#F0D8D6',
  },
  ctaHintText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#C0524A',
    textAlign: 'center',
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: 10,
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
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaDisabledText: {
    opacity: 0.6,
  },
});
