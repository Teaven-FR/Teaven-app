// Carte produit miniature — pour "Vous aimerez aussi"
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Product } from '@/lib/types';

interface ProductMiniCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductMiniCard({ product, onPress }: ProductMiniCardProps) {
  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
      accessibilityLabel={`${product.name}, ${formatPrice(product.price)}`}
    >
      <Image
        source={{ uri: product.image }}
        style={styles.image}
        contentFit="cover"
        transition={300}
        placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
      />
      <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
      <Text style={styles.price}>{formatPrice(product.price)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: '100%',
    height: 100,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    marginBottom: 2,
  },
  price: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: colors.green,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
