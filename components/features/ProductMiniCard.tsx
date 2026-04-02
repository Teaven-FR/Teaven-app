// Carte produit miniature — pour "Vous aimerez aussi" — scale 0.97 press feedback
import { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Product } from '@/lib/types';

interface ProductMiniCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductMiniCard({ product, onPress }: ProductMiniCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const useNative = Platform.OS !== 'web';

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, damping: 15, stiffness: 300, useNativeDriver: useNative }).start();
  }, [scale, useNative]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 300, useNativeDriver: useNative }).start();
  }, [scale, useNative]);

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={`${product.name}, ${formatPrice(product.price)}`}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Image
          source={{ uri: product.image }}
          style={styles.image}
          contentFit="cover"
          transition={300}
          placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
        />
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
      </Animated.View>
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
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
    color: colors.green,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
