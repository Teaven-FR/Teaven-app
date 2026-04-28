// DEV ONLY — Écran de test pour simuler une livraison et voir les écrans
// Supprimer avant mise en production
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Truck, Eye, ArrowLeft } from 'lucide-react-native';
import { useOrderStore } from '@/stores/orderStore';
import { colors, fonts, spacing, shadows } from '@/constants/theme';
import type { Order } from '@/lib/types';

const FAKE_ORDER_ID = 'DEV-DELIVERY-TEST';

export default function DevTestDeliveryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const set = useOrderStore.setState;

  const simulateDeliveryOrder = () => {
    const order: Order = {
      id: FAKE_ORDER_ID,
      userId: 'dev',
      status: 'payment_confirmed',
      mode: 'delivery',
      items: [
        { productId: '1', name: 'Matcha Latte', quantity: 1, unitPrice: 550, totalPrice: 550, modifiers: [] },
        { productId: '2', name: 'Cookie chocolat', quantity: 2, unitPrice: 350, totalPrice: 700, modifiers: [] },
      ],
      subtotal: 1250,
      tax: 0,
      loyaltyDiscount: 0,
      total: 1740,
      deliveryAddress: {
        street: '12 Rue de la Paix',
        city: 'Paris',
        postalCode: '75002',
        complement: '3ème étage, code 1234',
      },
      deliveryFee: 490,
      deliveryId: `STUB_${Date.now()}`,
      trackingUrl: 'https://uber.com/deliveries/stub',
      paymentMethod: 'card',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set({ currentOrder: order, orderHistory: [order] });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Test Livraison (DEV)</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.info}>
          Ces boutons simulent une commande livraison pour tester les écrans sans passer par le paiement.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => {
            simulateDeliveryOrder();
            router.push('/order-confirmation');
          }}
        >
          <Truck size={18} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.buttonText}>Voir l'écran de confirmation livraison</Text>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: '#4A6B50' }]}
          onPress={() => {
            simulateDeliveryOrder();
            router.push(`/delivery/${FAKE_ORDER_ID}`);
          }}
        >
          <Eye size={18} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.buttonText}>Voir l'écran de suivi livraison</Text>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => {
            // Simuler un pickup pour comparer
            const order: Order = {
              id: 'DEV-PICKUP-TEST',
              userId: 'dev',
              status: 'payment_confirmed',
              mode: 'pickup',
              items: [
                { productId: '1', name: 'Matcha Latte', quantity: 1, unitPrice: 550, totalPrice: 550, modifiers: [] },
              ],
              subtotal: 550,
              tax: 0,
              loyaltyDiscount: 0,
              total: 550,
              paymentMethod: 'card',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            set({ currentOrder: order });
            router.push('/order-confirmation');
          }}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Voir confirmation retrait (comparaison)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', ...shadows.subtle,
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, gap: spacing.lg },
  info: {
    fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary,
    lineHeight: 22, marginBottom: spacing.md,
  },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.green, borderRadius: 14,
    paddingVertical: 16, ...shadows.card,
  },
  buttonText: { fontFamily: fonts.bold, fontSize: 14, color: '#FFFFFF' },
});
