// Carte produit avec micro-interaction "+" → "AJOUTÉ"
import { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import type { Product } from '@/lib/types';
import { useCartStore } from '@/stores/cartStore';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const buttonWidth = useRef(new Animated.Value(30)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  const handleAdd = useCallback(() => {
    addItem(product);

    // Animation : étirer le bouton
    Animated.spring(buttonWidth, {
      toValue: 80,
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
      <Image
        source={{ uri: product.image }}
        style={styles.image}
        contentFit="cover"
        transition={300}
      />
      <View style={styles.content}>
        <View style={styles.tags}>
          {product.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.description} numberOfLines={1}>{product.description}</Text>
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
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  image: {
    width: '100%',
    height: 140,
  },
  content: {
    padding: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  tag: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  tagText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.green,
  },
  name: {
    ...typography.h3,
    marginBottom: 2,
  },
  description: {
    ...typography.bodySmall,
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
