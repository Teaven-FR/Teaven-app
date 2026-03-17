// Fiche produit — page détail avec hero vert foncé
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Clock, Flame, Star } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/stores/cartStore';
import { mockProducts } from '@/constants/mockData';
import { colors, fonts, radii, spacing, typography } from '@/constants/theme';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addItem = useCartStore((s) => s.addItem);

  const product = mockProducts.find((p) => p.id === id);

  if (!product) {
    return (
      <View style={styles.notFound}>
        <Text style={typography.h3}>Produit introuvable</Text>
      </View>
    );
  }

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  const handleAddToCart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem(product);
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <Image
          source={{ uri: product.image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={400}
        />
        <View style={styles.heroOverlay} />
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { top: insets.top + 8 }]}
        >
          <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>

      {/* Contenu */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tags */}
        <View style={styles.tags}>
          {product.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.description}>{product.description}</Text>

        {/* Infos */}
        <View style={styles.infos}>
          <View style={styles.info}>
            <Star size={16} color={colors.green} strokeWidth={1.6} />
            <Text style={styles.infoText}>{product.rating}</Text>
          </View>
          <View style={styles.info}>
            <Clock size={16} color={colors.green} strokeWidth={1.6} />
            <Text style={styles.infoText}>{product.prepTime} min</Text>
          </View>
          {product.kcal > 0 && (
            <View style={styles.info}>
              <Flame size={16} color={colors.green} strokeWidth={1.6} />
              <Text style={styles.infoText}>{product.kcal} kcal</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer fixe */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
        <Button
          title="Ajouter au panier"
          onPress={handleAddToCart}
          size="lg"
          style={styles.addButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    height: 280,
    backgroundColor: colors.greenDark,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74,107,80,0.3)',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.bg,
  },
  bodyContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  tagText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.green,
  },
  name: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  infos: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    gap: spacing.lg,
  },
  price: {
    ...typography.priceLarge,
  },
  addButton: {
    flex: 1,
  },
});
