// Carte produit carrousel — format horizontal (260px large, 180px image)
// Avec micro-interaction "+" → "AJOUTÉ" (30px bouton)
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import type { Product } from '@/lib/types';
import { useCartStore } from '@/stores/cartStore';

interface ProductCardCarouselProps {
  product: Product;
  onPress: () => void;
}

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 200,
  mass: 0.8,
};

export function ProductCardCarousel({ product, onPress }: ProductCardCarouselProps) {
  const addItem = useCartStore((s) => s.addItem);
  const buttonWidth = useSharedValue(30);
  const textOpacity = useSharedValue(0);

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  const animatedButtonStyle = useAnimatedStyle(() => ({
    width: buttonWidth.value,
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem(product);

    // Animation : étirer le bouton de 30px à 80px
    buttonWidth.value = withSpring(80, SPRING_CONFIG);
    textOpacity.value = withDelay(100, withTiming(1, { duration: 200 }));

    // Refermer après 1.4s
    buttonWidth.value = withDelay(1400, withSpring(30, SPRING_CONFIG));
    textOpacity.value = withDelay(1200, withTiming(0, { duration: 200 }));
  };

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
        <Text style={styles.description} numberOfLines={2}>{product.description}</Text>
        <View style={styles.footer}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          <Pressable onPress={handleAdd}>
            <Animated.View style={[styles.addButton, animatedButtonStyle]}>
              <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
              <Animated.Text style={[styles.addedText, animatedTextStyle]}>
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
  image: {
    width: '100%',
    height: 180,
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
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  description: {
    ...typography.bodySmall,
    fontSize: 12,
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
