// Carte produit grille — format 2 colonnes (photo ratio 4/5)
// Bouton "+" 28px radius 8px avec micro-interaction expand "AJOUTÉ"
// Retour tactile scale(0.97) + badges populaire/nouveau/saison
import { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import type { Product } from '@/lib/types';
import { useCartStore } from '@/stores/cartStore';

interface ProductGridCardProps {
  product: Product;
  onPress: () => void;
}

/** Formate un prix en centimes pour les lecteurs d'écran */
function priceAccessibilityLabel(cents: number): string {
  const euros = Math.floor(cents / 100);
  const centimes = cents % 100;
  if (centimes === 0) return `${euros} euros`;
  return `${euros} euros ${centimes}`;
}

export function ProductGridCard({ product, onPress }: ProductGridCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const buttonWidth = useRef(new Animated.Value(30)).current;
  const iconOpacity = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  // Animation de retour tactile (press feedback)
  const cardScale = useRef(new Animated.Value(1)).current;
  const useNative = Platform.OS !== 'web';

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  /** Réduction d'échelle au toucher */
  const handlePressIn = useCallback(() => {
    Animated.spring(cardScale, {
      toValue: 0.97,
      damping: 15,
      stiffness: 300,
      useNativeDriver: useNative,
    }).start();
  }, [cardScale, useNative]);

  /** Retour à l'échelle normale au relâchement */
  const handlePressOut = useCallback(() => {
    Animated.spring(cardScale, {
      toValue: 1,
      damping: 15,
      stiffness: 300,
      useNativeDriver: useNative,
    }).start();
  }, [cardScale, useNative]);

  const handleAdd = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    addItem(product);

    // Phase 1 : masquer "+", étirer le bouton, afficher "AJOUTÉ"
    Animated.parallel([
      Animated.timing(iconOpacity, { toValue: 0, duration: 120, useNativeDriver: false }),
      Animated.spring(buttonWidth, { toValue: 80, damping: 18, stiffness: 200, mass: 0.8, useNativeDriver: false }),
      Animated.timing(textOpacity, { toValue: 1, duration: 200, delay: 120, useNativeDriver: false }),
    ]).start();

    // Phase 2 : refermer après 1.2s
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 0, duration: 150, useNativeDriver: false }),
        Animated.spring(buttonWidth, { toValue: 30, damping: 18, stiffness: 200, mass: 0.8, useNativeDriver: false }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 200, delay: 150, useNativeDriver: false }),
      ]).start(() => { isAnimating.current = false; });
    }, 1200);
  }, [addItem, product, buttonWidth, textOpacity, iconOpacity]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={`${product.name}, ${priceAccessibilityLabel(product.price)}${product.isPopular ? ', populaire' : ''}${product.isNew ? ', nouveau' : ''}${product.isSeasonal ? ', de saison' : ''}`}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
        {/* Photo ratio 4/5 avec badges statut */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            contentFit="cover"
            transition={300}
            accessibilityLabel={`Photo de ${product.name}`}
          />

          {/* Badges populaire / nouveau / saison */}
          {product.isPopular && (
            <View style={[styles.statusBadge, styles.popularBadge]}>
              <Text style={styles.statusBadgeText}>Populaire 🔥</Text>
            </View>
          )}
          {product.isNew && (
            <View style={[styles.statusBadge, styles.newBadge]}>
              <Text style={styles.statusBadgeText}>Nouveau</Text>
            </View>
          )}
          {product.isSeasonal && (
            <View style={[styles.statusBadge, styles.seasonalBadge]}>
              <Text style={styles.statusBadgeText}>Saison</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Tags */}
          <View style={styles.tags}>
            {product.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
              </View>
            ))}
          </View>

          {/* Nom */}
          <Text style={styles.name} numberOfLines={1}>{product.name}</Text>

          {/* Prix + bouton "+" */}
          <View style={styles.footer}>
            <Text
              style={styles.price}
              accessibilityLabel={priceAccessibilityLabel(product.price)}
            >
              {formatPrice(product.price)}
            </Text>
            <Pressable
              onPress={handleAdd}
              accessibilityLabel={`Ajouter ${product.name} au panier`}
            >
              <Animated.View style={[styles.addButton, { width: buttonWidth }]}>
                <Animated.View style={{ opacity: iconOpacity }}>
                  <Plus size={13} color="#FFFFFF" strokeWidth={2.5} />
                </Animated.View>
                <Animated.Text style={[styles.addedText, { opacity: textOpacity }]}>
                  AJOUTÉ
                </Animated.Text>
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 0.8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },

  // Badges statut (populaire, nouveau, saison)
  statusBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radii.badge,
  },
  popularBadge: {
    backgroundColor: '#E8D5D0',
  },
  newBadge: {
    backgroundColor: '#C8D9CC',
    top: spacing.sm + 24,
  },
  seasonalBadge: {
    backgroundColor: '#F5F0E1',
    top: spacing.sm + (24 * 2),
  },
  statusBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.text,
    letterSpacing: 0.3,
  },

  content: {
    padding: spacing.sm,
    paddingTop: spacing.sm,
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  tag: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: colors.green,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 13,
    color: colors.green,
  },
  addButton: {
    height: 30,
    backgroundColor: colors.green,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  addedText: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
