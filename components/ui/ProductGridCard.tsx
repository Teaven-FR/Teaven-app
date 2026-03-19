// Carte produit grille — format 2 colonnes (photo ratio 4/5)
// Bouton "+" 28px radius 8px avec micro-interaction expand "AJOUTÉ"
import { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import type { Product } from '@/lib/types';
import { useCartStore } from '@/stores/cartStore';

interface ProductGridCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductGridCard({ product, onPress }: ProductGridCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const buttonWidth = useRef(new Animated.Value(28)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  const handleAdd = useCallback(() => {
    addItem(product);

    // Animation : étirer le bouton de 28px à 76px
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
        toValue: 28,
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
      {/* Photo ratio 4/5 */}
      <Image
        source={{ uri: product.image }}
        style={styles.image}
        contentFit="cover"
        transition={300}
      />

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
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          <Pressable onPress={handleAdd}>
            <Animated.View style={[styles.addButton, { width: buttonWidth }]}>
              <Plus size={13} color="#FFFFFF" strokeWidth={2.5} />
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
  image: {
    width: '100%',
    aspectRatio: 0.8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
    height: 28,
    backgroundColor: colors.green,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 3,
  },
  addedText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
