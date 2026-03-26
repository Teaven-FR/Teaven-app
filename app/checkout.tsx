// Écran Checkout — paiement par carte bancaire via Square Web Payments SDK
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import {
  ArrowLeft,
  Shield,
  AlertCircle,
  Star,
  MapPin,
  Clock,
  ShoppingBag,
} from 'lucide-react-native';
import { useUser, LEVEL_MULTIPLIERS } from '@/hooks/useUser';
import { useLocation } from '@/hooks/useLocation';
import { useCartStore } from '@/stores/cartStore';
import { useOrderStore } from '@/stores/orderStore';
import { colors, fonts, spacing } from '@/constants/theme';
import { SUPABASE_URL } from '@/constants/config';

const SQUARE_APP_ID = process.env.EXPO_PUBLIC_SQUARE_APP_ID || 'sq0idp-9F7C-S1CAmrls3asijyloA';
const SQUARE_LOCATION_ID = process.env.EXPO_PUBLIC_SQUARE_LOCATION_ID || 'LHPTGDC0XBX47';

/** URL HTTPS du formulaire de paiement hébergé sur Supabase Edge Function */
function getPaymentFormURL(amountCents: number) {
  return `${SUPABASE_URL}/functions/v1/payment-form?app_id=${SQUARE_APP_ID}&location_id=${SQUARE_LOCATION_ID}&amount=${amountCents}`;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ total: string }>();
  const total = parseInt(params.total ?? '0', 10);
  const { loyalty } = useUser();
  const { location: storeLocation } = useLocation();
  const cartItems = useCartStore((s) => s.items);
  const createOrder = useOrderStore((s) => s.createOrder);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

  // Points fidélité estimés pour cette commande
  const multiplier = LEVEL_MULTIPLIERS[loyalty.level] ?? 1;
  const pointsEstimated = Math.floor((total / 100) * 10 * multiplier);

  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const raw = event.nativeEvent.data;
      console.warn('[CHECKOUT] WebView message:', raw);
      const data = JSON.parse(raw);
      if (data.type === 'error') { setError(data.message); return; }
      if (data.type !== 'nonce' || !data.nonce) return;

      console.warn('[CHECKOUT] Nonce reçu, création commande...');
      setIsProcessing(true);
      setError(null);

      try {
        await createOrder(cartItems, 'card', false, data.nonce);
        console.warn('[CHECKOUT] Commande créée, redirection...');
        router.replace('/order-confirmation');
      } catch (orderErr: unknown) {
        const msg = orderErr instanceof Error ? orderErr.message : 'Erreur lors du paiement';
        console.warn('[CHECKOUT] Erreur commande:', msg);
        setError(msg);
        setIsProcessing(false);
      }
    } catch {
      // Message non-JSON du WebView — ignorer
    }
  };

  // ── Overlay traitement ──
  if (isProcessing) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.processingCard}>
          <ActivityIndicator color={colors.green} size="large" />
          <Text style={styles.processingTitle}>Paiement en cours</Text>
          <Text style={styles.processingSubtitle}>Ne fermez pas l'application…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ──── Header ──── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Confirmer et payer</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ──── Erreur ──── */}
        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={14} color="#C44040" strokeWidth={2} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => setError(null)} hitSlop={8}>
              <Text style={styles.errorDismiss}>OK</Text>
            </Pressable>
          </View>
        )}

        {/* ──── Récap commande ──── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ShoppingBag size={14} color={colors.textSecondary} strokeWidth={1.5} />
            <Text style={styles.sectionTitle}>Votre commande</Text>
          </View>
          {cartItems.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}×</Text>
              <Text style={styles.itemName} numberOfLines={1}>{item.product.name}</Text>
              <Text style={styles.itemPrice}>{fmt(item.product.price * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{fmt(total)}</Text>
          </View>
        </View>

        {/* ──── Retrait ──── */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <MapPin size={14} color={colors.green} strokeWidth={1.5} />
            <Text style={styles.infoText}>{storeLocation.name} — {storeLocation.addressFormatted || 'Chargement…'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Clock size={14} color={colors.green} strokeWidth={1.5} />
            <Text style={styles.infoText}>Retrait dans ~15 min</Text>
          </View>
        </View>

        {/* ──── Points fidélité ──── */}
        <View style={styles.loyaltyBanner}>
          <Star size={14} color={colors.green} strokeWidth={1.5} />
          <Text style={styles.loyaltyText}>
            +{pointsEstimated} points fidélité · {loyalty.level} (×{multiplier})
          </Text>
        </View>

        {/* ──── Formulaire carte Square ──── */}
        <Text style={styles.paymentLabel}>PAIEMENT PAR CARTE</Text>
        <View style={styles.webViewWrap}>
          <WebView
            source={{ uri: getPaymentFormURL(total) }}
            onMessage={handleWebViewMessage}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            onError={(e) => setError(`Erreur : ${e.nativeEvent.description}`)}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator color={colors.green} size="large" />
                <Text style={styles.webviewLoadingText}>Chargement du terminal sécurisé…</Text>
              </View>
            )}
          />
        </View>
      </ScrollView>

      {/* ──── Footer sécurité ──── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Shield size={12} color={colors.textMuted} strokeWidth={1.5} />
        <Text style={styles.footerText}>Paiement sécurisé · Données chiffrées · Square</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text, letterSpacing: -0.3 },

  scrollContent: { padding: spacing.xl, gap: 16, paddingBottom: 20 },

  // Erreur
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF0F0', borderRadius: 12, padding: 12,
  },
  errorText: { fontFamily: fonts.regular, fontSize: 12, color: '#C44040', flex: 1 },
  errorDismiss: { fontFamily: fonts.bold, fontSize: 12, color: '#C44040' },

  // Sections
  section: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },

  // Items commande
  itemRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
  },
  itemQty: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary, width: 28 },
  itemName: { fontFamily: fonts.regular, fontSize: 13, color: colors.text, flex: 1, marginRight: 8 },
  itemPrice: { fontFamily: fonts.monoSemiBold, fontSize: 13, color: colors.text },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  totalLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  totalValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.green, letterSpacing: -0.5 },

  // Info retrait
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  infoText: { fontFamily: fonts.regular, fontSize: 13, color: colors.text, flex: 1 },

  // Fidélité
  loyaltyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.greenLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  loyaltyText: { fontFamily: fonts.regular, fontSize: 12, color: colors.greenDark },

  // Paiement
  paymentLabel: {
    fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2.5, color: colors.textMuted,
    marginTop: 4,
  },
  webViewWrap: {
    height: 280, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  webview: { flex: 1, backgroundColor: colors.bg },
  webviewLoading: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg,
  },
  webviewLoadingText: {
    fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 14,
  },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  footerText: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },

  // Processing
  processingCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 40,
    alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16,
  },
  processingTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  processingSubtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
});
