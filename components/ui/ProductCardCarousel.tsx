// Carte produit carrousel — format horizontal (260px large, 180px image)
// Badge rating en haut à droite, bouton "+" radius 8px
// Micro-interaction "+" → "AJOUTÉ" (30px → 76px)
import { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Plus, Star } from 'lucide-react-native';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import type { Product } from '@/lib/types';
import { useCartStore } from '@/stores/cartStore';

interface ProductCardCarouselProps {
  product: Product;
  onPress: () => void;
}

export function ProductCardCarousel({ product, onPress }: ProductCardCarouselProps) {
  const addItem = useCartStore((s) => s.addItem);
  const buttonWidth = useRef(new Animated.Value(30)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  const handleAdd = useCallback(() => {
    addItem(product);

    // Animation : étirer le bouton de 30px à 76px
    Animated.spring(buttonWidth, {
      toValue: 76,
      damping: 18,
      stiffness: 200,
      mass: 0.8,
      useNativeDriver: false,
    }).start();

    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 200,
      delay: 100,
      useNativeDriver: false,
    }).start();

    // Refermer après 1.4s
    setTimeout(() => {
      Animated.spring(buttonWidth, {
        toValue: 30,
        damping: 18,
        stiffness: 200,
        mass: 0.8,
        useNativeDriver: false,
      }).start();

      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, 1400);
  }, [addItem, product, buttonWidth, textOpacity]);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {/* Image avec badge rating */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.image }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <View style={styles.ratingBadge}>
          <Star size={10} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.5} />
          <Text style={styles.ratingText}>{product.rating}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.description} numberOfLines={2}>{product.description}</Text>
        <View style={styles.footer}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          <Pressable onPress={handleAdd}>
            <Animated.View style={[styles.addButton, { width: buttonWidth }]}>
              <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
              <Animated.Text style={[styles.addedText, { opacity: textOpacity }]}>
                AJOUTÉ
              </Animated.Text>
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 180,
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  content: {
    padding: spacing.md,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    ...typography.price,
  },
  addButton: {
    height: 30,
    backgroundColor: colors.green,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 4,
  },
  addedText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
