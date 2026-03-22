// Écran Panier & Checkout — données dynamiques depuis cartStore + orderStore
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  ShoppingBag,
  Star,
  MapPin,
  Clock,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import TimeSlotPicker from '@/components/ui/TimeSlotPicker';
import { mockTimeSlots } from '@/constants/mockTimeSlots';
import { useCart } from '@/hooks/useCart';
import { useUser } from '@/hooks/useUser';
import { useOrderStore } from '@/stores/orderStore';
import { useCartStore } from '@/stores/cartStore';
import { colors, fonts, spacing, typography } from '@/constants/theme';
import type { TimeSlot as PickerTimeSlot } from '@/components/ui/TimeSlotPicker';
import type { Reward } from '@/lib/types';

const FALLBACK_REWARDS: Reward[] = [
  { id: 'r1', name: 'Boisson offerte', description: 'Thé, café ou infusion', pointsCost: 200, icon: 'coffee' },
  { id: 'r2', name: 'Dessert offert', description: 'Pâtisserie maison', pointsCost: 500, icon: 'gift' },
  { id: 'r3', name: '-20% sur la carte', description: 'Toute la commande', pointsCost: 750, icon: 'percent' },
];

// Convertir les créneaux mock vers le format attendu par TimeSlotPicker
const pickerSlots: PickerTimeSlot[] = mockTimeSlots.map((slot) => ({
  id: slot.id,
  timeRange: slot.id === 'asap' ? '' : slot.label,
  queueCount: slot.ordersInQueue,
  available: slot.available,
  isAsap: slot.id === 'asap',
}));

type PaymentMethod = 'card' | 'wallet' | 'mixed';

export default function PanierScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    items,
    totalItems,
    subtotal,
    tax,
    updateQuantity,
    removeItem,
    formatPrice,
    getLoyaltyDiscount,
    getItemKey,
  } = useCart();

  const { loyalty, rewards: squareRewards } = useUser();
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [appliedReward, setAppliedReward] = useState<Reward | null>(null);

  const availableRewards = (squareRewards.length > 0 ? squareRewards : FALLBACK_REWARDS)
    .filter((r) => loyalty.points >= r.pointsCost);

  const rewardDiscount = appliedReward
    ? (appliedReward.icon === 'percent' ? Math.round(subtotal * 0.2) : 0)
    : 0;
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('asap');
  const [isOrdering, setIsOrdering] = useState(false);
  const createOrder = useOrderStore((s) => s.createOrder);
  const cartItems = useCartStore((s) => s.items);

  // Calculs récap — prix Square TTC, pas de TVA séparée
  const loyaltyDiscount = getLoyaltyDiscount(useLoyalty, loyalty.points);
  const total = subtotal - loyaltyDiscount - rewardDiscount;

  const paymentOptions: { id: PaymentMethod; label: string }[] = [
    { id: 'card', label: 'Carte bancaire' },
    { id: 'wallet', label: 'Wallet Teaven' },
    { id: 'mixed', label: 'Mixte (Points + Carte)' },
  ];

  // État vide
  if (items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Votre panier</Text>
          <View style={styles.headerSpacer} />
        </View>
        <EmptyState
          icon={<ShoppingBag size={48} color={colors.textMuted} strokeWidth={1.2} />}
          title="Votre panier est vide"
          subtitle="Découvrez notre carte pour trouver votre bonheur"
          ctaLabel="Explorer la carte"
          onCtaPress={() => router.push('/(tabs)/carte')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Votre panier</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ──── ARTICLES ──── */}
        <Text style={styles.sectionLabel}>ARTICLES</Text>
        <View style={styles.section}>
          {items.map((item) => {
            const key = getItemKey(item);
            return (
              <View key={key} style={styles.articleCard}>
                <Image
                  source={{ uri: item.product.image }}
                  style={styles.articleImage}
                  contentFit="cover"
                  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                />
                <View style={styles.articleInfo}>
                  <Text style={styles.articleName}>{item.product.name}</Text>
                  <Text style={styles.articlePrice}>
                    {formatPrice(item.product.price)}
                  </Text>
                </View>
                <View style={styles.qtyArea}>
                  <View style={styles.qtySelector}>
                    <Pressable
                      onPress={() => updateQuantity(key, item.quantity - 1)}
                      style={styles.qtyButton}
                      accessibilityLabel="Réduire la quantité"
                    >
                      <Minus size={12} color={colors.textSecondary} strokeWidth={2} />
                    </Pressable>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <Pressable
                      onPress={() => updateQuantity(key, item.quantity + 1)}
                      style={styles.qtyButton}
                      accessibilityLabel="Augmenter la quantité"
                    >
                      <Plus size={12} color={colors.textSecondary} strokeWidth={2} />
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => removeItem(key)}
                    style={styles.deleteButton}
                    accessibilityLabel="Supprimer l'article"
                  >
                    <Trash2 size={14} color={colors.error} strokeWidth={1.8} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* ──── CLICK & COLLECT ──── */}
        <View style={styles.collectCard}>
          <View style={styles.collectHeader}>
            <ShoppingBag size={14} color="#4A6B50" strokeWidth={2} />
            <Text style={styles.collectTitle}>Click & Collect</Text>
          </View>
          <View style={styles.collectAddressRow}>
            <MapPin size={12} color={colors.textSecondary} strokeWidth={1.8} />
            <Text style={styles.collectAddress}>
              12 rue de la Gare, 95130 Franconville
            </Text>
          </View>
          <Pressable style={styles.collectSlot}>
            <Clock size={12} color={colors.textSecondary} strokeWidth={1.8} />
            <Text style={styles.collectSlotText}>Aujourd'hui, 14:30 – 15:00 ›</Text>
          </Pressable>
        </View>

        {/* ──── FIDÉLITÉ ──── */}
        <View style={styles.loyaltyCard}>
          <View style={styles.loyaltyLeft}>
            <View style={styles.loyaltyIcon}>
              <Star size={16} color={colors.green} fill={colors.green} strokeWidth={0} />
            </View>
            <View>
              <Text style={styles.loyaltyTitle}>Points de fidélité</Text>
              <Text style={styles.loyaltyBalance}>Solde : {loyalty.points.toLocaleString('fr-FR')} pts</Text>
            </View>
          </View>
          <Switch
            value={useLoyalty}
            onValueChange={setUseLoyalty}
            trackColor={{ false: '#E8E7E2', true: colors.green }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* ──── RÉCAPITULATIF ──── */}
        <View style={styles.recap}>
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Sous-total</Text>
            <Text style={styles.recapValue}>{formatPrice(subtotal)}</Text>
          </View>
          {useLoyalty && (
            <View style={styles.recapRow}>
              <Text style={[styles.recapLabel, styles.recapDiscount]}>
                Remise fidélité
              </Text>
              <Text style={[styles.recapValue, styles.recapDiscount]}>
                -{formatPrice(loyaltyDiscount)}
              </Text>
            </View>
          )}
          {appliedReward && rewardDiscount > 0 && (
            <View style={styles.recapRow}>
              <Text style={[styles.recapLabel, styles.recapDiscount]}>
                {appliedReward.name}
              </Text>
              <Text style={[styles.recapValue, styles.recapDiscount]}>
                -{formatPrice(rewardDiscount)}
              </Text>
            </View>
          )}
          <View style={styles.recapDivider} />
          <View style={styles.recapRow}>
            <Text style={styles.recapTotalLabel}>Total</Text>
            <Text style={styles.recapTotalValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        {/* ──── CRÉNEAU DE RETRAIT ──── */}
        <Text style={styles.sectionLabel}>CRÉNEAU DE RETRAIT</Text>
        <View style={styles.timeSlotSection}>
          <TimeSlotPicker
            slots={pickerSlots}
            selectedId={selectedTimeSlot}
            onSelect={setSelectedTimeSlot}
          />
        </View>

        {/* ──── RÉCOMPENSES ──── */}
        {availableRewards.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RÉCOMPENSES DISPONIBLES</Text>
            <View style={styles.section}>
              {availableRewards.map((reward) => {
                const isApplied = appliedReward?.id === reward.id;
                return (
                  <Pressable
                    key={reward.id}
                    onPress={() => setAppliedReward(isApplied ? null : reward)}
                    style={[styles.rewardCard, isApplied && styles.rewardCardApplied]}
                    accessibilityRole="button"
                    accessibilityLabel={reward.name}
                  >
                    <View style={styles.rewardInfo}>
                      <Text style={[styles.rewardName, isApplied && styles.rewardNameApplied]}>
                        {reward.name}
                      </Text>
                      <Text style={styles.rewardDesc}>{reward.description}</Text>
                    </View>
                    <View style={[styles.rewardPtsBadge, isApplied && styles.rewardPtsBadgeApplied]}>
                      <Text style={[styles.rewardPtsText, isApplied && styles.rewardPtsTextApplied]}>
                        {isApplied ? 'Appliqué ✓' : `${reward.pointsCost} pts`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ──── PAIEMENT ──── */}
        <Text style={styles.sectionLabel}>PAIEMENT</Text>
        <View style={styles.section}>
          {paymentOptions.map((option) => {
            const selected = paymentMethod === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setPaymentMethod(option.id)}
                style={[styles.paymentCard, selected && styles.paymentCardSelected]}
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.paymentLabel, selected && styles.paymentLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* ──── CTA sticky ──── */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          onPress={async () => {
            if (isOrdering) return;
            setIsOrdering(true);
            const order = await createOrder(cartItems, paymentMethod, useLoyalty);
            setIsOrdering(false);
            router.push(`/order/${order.id}`);
          }}
          disabled={isOrdering}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaPressed,
            isOrdering && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Valider ma commande, ${formatPrice(total)}`}
        >
          {isOrdering ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.ctaText}>
              Valider ma commande — {formatPrice(total)}
            </Text>
          )}
        </Pressable>
        <Text style={styles.ctaDisclaimer}>
          En validant, vous acceptez nos conditions générales de vente.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },

  // Section label
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },

  // Article cards
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 10,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  articleImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  articleInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  articleName: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.text,
  },
  articlePrice: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.green,
    marginTop: 2,
  },
  qtyArea: {
    alignItems: 'flex-end',
    gap: 6,
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    minWidth: 16,
    textAlign: 'center',
  },
  deleteButton: {
    width: 28,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Click & Collect
  collectCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  collectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  collectTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#4A6B50',
  },
  collectAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collectAddress: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  collectSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F0',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  collectSlotText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Fidélité
  loyaltyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    paddingHorizontal: 14,
    marginTop: spacing.lg,
  },
  loyaltyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  loyaltyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  loyaltyBalance: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Récapitulatif
  recap: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recapLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  recapValue: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.text,
  },
  recapDiscount: {
    color: colors.green,
  },
  recapDivider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  recapTotalLabel: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  recapTotalValue: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 18,
    color: colors.green,
  },

  // Récompenses
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rewardCardApplied: {
    borderColor: colors.green,
    backgroundColor: '#F8FAF8',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  rewardNameApplied: {
    color: colors.green,
  },
  rewardDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  rewardPtsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F5F5F0',
  },
  rewardPtsBadgeApplied: {
    backgroundColor: colors.greenLight,
  },
  rewardPtsText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
  },
  rewardPtsTextApplied: {
    color: colors.green,
    fontFamily: fonts.monoSemiBold,
  },

  // Paiement
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    gap: spacing.md,
  },
  paymentCardSelected: {
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: '#F8FAF8',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.green,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
  },
  paymentLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
  },
  paymentLabelSelected: {
    fontFamily: fonts.bold,
  },

  // CTA
  cta: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  ctaButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  ctaDisclaimer: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  timeSlotSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
});
