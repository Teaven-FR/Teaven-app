// Écran Panier — résumé et checkout
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ShoppingBag } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { useCart } from '@/hooks/useCart';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';

export default function PanierScreen() {
  const insets = useSafeAreaInsets();
  const { items, totalItems, formattedTotal, updateQuantity, removeItem, formatPrice } = useCart();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Mon Panier</Text>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <ShoppingBag size={48} color={colors.textMuted} strokeWidth={1.2} />
          <Text style={styles.emptyTitle}>Ton panier est vide</Text>
          <Text style={styles.emptySubtitle}>
            Explore notre carte pour trouver ton bonheur
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => (
              <View key={item.product.id} style={styles.item}>
                <Image
                  source={{ uri: item.product.image }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <Text style={styles.itemPrice}>
                    {formatPrice(item.product.price * item.quantity)}
                  </Text>
                  <QuantitySelector
                    quantity={item.quantity}
                    onIncrement={() => updateQuantity(item.product.id, item.quantity + 1)}
                    onDecrement={() => updateQuantity(item.product.id, item.quantity - 1)}
                    min={0}
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Footer checkout */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total ({totalItems} articles)</Text>
              <Text style={styles.totalPrice}>{formattedTotal}</Text>
            </View>
            <Button
              title="Commander"
              onPress={() => {
                // TODO: Intégrer le paiement Square
              }}
              size="lg"
              style={styles.checkoutButton}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  title: {
    ...typography.h1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: 100,
  },
  emptyTitle: {
    ...typography.h3,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.subtle,
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  itemPrice: {
    ...typography.price,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  totalLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  totalPrice: {
    ...typography.priceLarge,
  },
  checkoutButton: {
    width: '100%',
  },
});
