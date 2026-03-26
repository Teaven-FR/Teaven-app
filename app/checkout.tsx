// Écran Checkout — 3 onglets : Carte, Wallet, Mixte
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import Slider from '@react-native-community/slider';
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Shield,
  AlertCircle,
  Star,
  Layers,
} from 'lucide-react-native';
import { useUser, LEVEL_MULTIPLIERS } from '@/hooks/useUser';
import { useCartStore } from '@/stores/cartStore';
import { useOrderStore } from '@/stores/orderStore';
import { colors, fonts, spacing } from '@/constants/theme';

const SQUARE_APP_ID = process.env.EXPO_PUBLIC_SQUARE_APP_ID ?? '';
const SQUARE_LOCATION_ID = process.env.EXPO_PUBLIC_SQUARE_LOCATION_ID ?? '';

type PayTab = 'card' | 'wallet' | 'mixed';

function getSquareCardHTML(appId: string, locationId: string, amountCents: number) {
  const amt = (amountCents / 100).toFixed(2).replace('.', ',');
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#F0F0E5;padding:16px;min-height:100vh}
#card-container{min-height:100px;margin-bottom:16px}
.btn{width:100%;padding:16px;border:none;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer}
#pay{background:#75967F;color:#fff}
#pay:disabled{opacity:.4}
.msg{text-align:center;font-size:13px;margin-top:10px;padding:8px;border-radius:8px}
.err{background:#FEF0F0;color:#C44040}
.loading{text-align:center;color:#738478;font-size:14px;padding:40px 0}
</style></head><body>
<div id="loading" class="loading">Chargement du formulaire sécurisé...</div>
<div id="card-container" style="display:none"></div>
<button class="btn" id="pay" style="display:none" disabled>Chargement...</button>
<div id="msg"></div>
<script src="https://web.squarecdn.com/v1/square.js"></script>
<script>
let card;
async function init(){
  try{
    if(!window.Square){document.getElementById('msg').className='msg err';document.getElementById('msg').textContent='SDK non chargé.';return;}
    const payments=Square.payments('${appId}','${locationId}');
    card=await payments.card();
    await card.attach('#card-container');
    document.getElementById('loading').style.display='none';
    document.getElementById('card-container').style.display='block';
    document.getElementById('pay').style.display='block';
    document.getElementById('pay').disabled=false;
    document.getElementById('pay').textContent='Payer ${amt} €';
  }catch(e){
    document.getElementById('loading').style.display='none';
    document.getElementById('msg').className='msg err';
    document.getElementById('msg').textContent='Erreur: '+e.message;
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',message:e.message}));
  }
}
document.getElementById('pay').addEventListener('click',async()=>{
  const b=document.getElementById('pay');b.disabled=true;b.textContent='Traitement...';
  document.getElementById('msg').textContent='';
  try{
    const r=await card.tokenize();
    if(r.status==='OK'){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'nonce',nonce:r.token}));
      b.textContent='Paiement en cours...';
    }else{
      const err=r.errors?r.errors.map(e=>e.message).join('. '):'Vérifiez vos informations.';
      document.getElementById('msg').className='msg err';document.getElementById('msg').textContent=err;
      b.disabled=false;b.textContent='Réessayer';
    }
  }catch(e){
    document.getElementById('msg').className='msg err';document.getElementById('msg').textContent=e.message;
    b.disabled=false;b.textContent='Réessayer';
  }
});
init();
</script></body></html>`;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ total: string }>();
  const total = parseInt(params.total ?? '0', 10);
  const { wallet, loyalty } = useUser();
  const cartItems = useCartStore((s) => s.items);
  const createOrder = useOrderStore((s) => s.createOrder);

  const [tab, setTab] = useState<PayTab>(wallet.balance >= total ? 'wallet' : 'card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mixte : montant wallet (en centimes)
  const maxWalletForMixed = Math.min(wallet.balance, total);
  const [mixedWalletAmount, setMixedWalletAmount] = useState(maxWalletForMixed);
  const mixedCardAmount = total - mixedWalletAmount;

  const fmt = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  const walletSufficient = wallet.balance >= total;

  // Points fidélité estimés pour cette commande
  const multiplier = LEVEL_MULTIPLIERS[loyalty.level] ?? 1;
  const pointsEstimated = Math.floor((total / 100) * 10 * multiplier);

  // ── Handlers paiement ──
  const handleCardNonce = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'error') { setError(data.message); return; }
      if (data.type !== 'nonce' || !data.nonce) return;
      setIsProcessing(true);
      setError(null);
      await createOrder(cartItems, 'card', false, data.nonce);
      router.replace('/order-confirmation');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du paiement');
      setIsProcessing(false);
    }
  };

  const handleWalletPay = async () => {
    if (!wallet.giftCardId) {
      setError('Wallet non configuré. Rechargez votre wallet ou payez par carte.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await createOrder(cartItems, 'wallet', false, undefined, wallet.giftCardId);
      router.replace('/order-confirmation');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  // Mixte : nonce carte pour le montant restant après wallet
  const handleMixedCardNonce = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'error') { setError(data.message); return; }
      if (data.type !== 'nonce' || !data.nonce) return;
      setIsProcessing(true);
      setError(null);
      // On passe le montant wallet à déduire + le nonce carte pour le reste
      await createOrder(cartItems, 'mixed', false, data.nonce, wallet.giftCardId);
      router.replace('/order-confirmation');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du paiement');
      setIsProcessing(false);
    }
  };

  // ── Overlay traitement ──
  if (isProcessing) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.green} size="large" />
        <Text style={styles.processingText}>Traitement en cours...</Text>
        <Text style={styles.processingSubtext}>Ne fermez pas l'application</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Erreur */}
      {error && (
        <View style={styles.errorBanner}>
          <AlertCircle size={14} color="#C44040" strokeWidth={2} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)} hitSlop={8}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: '#C44040' }}>OK</Text>
          </Pressable>
        </View>
      )}

      {/* ──── 3 onglets ──── */}
      <View style={styles.tabRow}>
        {([
          { id: 'card' as PayTab, label: 'Carte', Icon: CreditCard },
          { id: 'wallet' as PayTab, label: 'Wallet', Icon: Wallet },
          { id: 'mixed' as PayTab, label: 'Mixte', Icon: Layers },
        ]).map(({ id, label, Icon }) => {
          const active = tab === id;
          const disabled = id === 'wallet' && !walletSufficient;
          return (
            <Pressable
              key={id}
              style={[
                styles.tab,
                active && (id === 'wallet' ? styles.tabWallet : styles.tabActive),
                disabled && styles.tabDisabled,
              ]}
              onPress={() => !disabled && setTab(id)}
            >
              <Icon size={15} color={active ? '#FFFFFF' : colors.textSecondary} strokeWidth={1.5} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ──── Contenu par onglet ──── */}

      {tab === 'card' && (
        <View style={{ flex: 1 }}>
          {/* Récap commande */}
          <ScrollView style={{ maxHeight: 140 }} contentContainerStyle={styles.recap}>
            {cartItems.map((item) => (
              <View key={item.product.id + (item.selectedVariation?.id ?? '')} style={styles.recapRow}>
                <Text style={styles.recapName} numberOfLines={1}>
                  {item.quantity}× {item.product.name}
                </Text>
                <Text style={styles.recapPrice}>{fmt(item.product.price * item.quantity)}</Text>
              </View>
            ))}
            <View style={styles.recapDivider} />
            <View style={styles.recapRow}>
              <Text style={[styles.recapName, { fontFamily: fonts.bold }]}>Total</Text>
              <Text style={[styles.recapPrice, { fontFamily: fonts.bold, fontSize: 16 }]}>{fmt(total)}</Text>
            </View>
          </ScrollView>

          {/* Points fidélité estimés */}
          <View style={styles.loyaltyInfo}>
            <Star size={14} color={colors.green} strokeWidth={1.5} />
            <Text style={styles.loyaltyText}>
              +{pointsEstimated} pts fidélité · {loyalty.level} (×{multiplier})
            </Text>
          </View>

          {/* Formulaire carte Square */}
          <View style={styles.webViewWrap}>
            <WebView
              source={{ html: getSquareCardHTML(SQUARE_APP_ID, SQUARE_LOCATION_ID, total), baseUrl: 'https://web.squarecdn.com' }}
              onMessage={handleCardNonce}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              originWhitelist={['*']}
              onError={(e) => setError(`Erreur: ${e.nativeEvent.description}`)}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator color={colors.green} size="large" />
                  <Text style={styles.webviewLoadingText}>Chargement du formulaire sécurisé...</Text>
                </View>
              )}
            />
          </View>
        </View>
      )}

      {tab === 'wallet' && (
        <ScrollView contentContainerStyle={styles.walletContent}>
          {/* Carte wallet terracotta */}
          <LinearGradient colors={['#D4937A', '#C27B5A']} style={styles.walletCard}>
            <Wallet size={22} color="rgba(255,255,255,0.6)" strokeWidth={1.3} />
            <Text style={styles.walletCardBalance}>{fmt(wallet.balance)}</Text>
            <Text style={styles.walletCardLabel}>Solde disponible</Text>
          </LinearGradient>

          {/* Détail */}
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Commande</Text>
              <Text style={styles.detailValue}>- {fmt(total)}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { fontFamily: fonts.bold }]}>Solde après</Text>
              <Text style={[styles.detailValue, { fontFamily: fonts.bold, color: colors.green }]}>
                {fmt(wallet.balance - total)}
              </Text>
            </View>
          </View>

          {/* Points fidélité */}
          <View style={styles.loyaltyInfo}>
            <Star size={14} color={colors.green} strokeWidth={1.5} />
            <Text style={styles.loyaltyText}>+{pointsEstimated} pts fidélité</Text>
          </View>

          {/* CTA */}
          <Pressable onPress={handleWalletPay} style={styles.payBtn}>
            <Wallet size={18} color="#FFFFFF" strokeWidth={1.5} />
            <Text style={styles.payBtnText}>Payer {fmt(total)} avec le Wallet</Text>
          </Pressable>
        </ScrollView>
      )}

      {tab === 'mixed' && (
        <ScrollView contentContainerStyle={styles.mixedContent}>
          {/* Explication */}
          <Text style={styles.mixedTitle}>Répartir le paiement</Text>
          <Text style={styles.mixedSubtitle}>
            Choisissez combien vous payez avec votre Wallet, le reste sera débité par carte.
          </Text>

          {/* Slider wallet */}
          <View style={styles.mixedSliderWrap}>
            <View style={styles.mixedSliderLabels}>
              <Text style={styles.mixedSliderLabel}>Wallet</Text>
              <Text style={[styles.mixedSliderValue, { color: '#C27B5A' }]}>{fmt(mixedWalletAmount)}</Text>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={maxWalletForMixed}
              step={100} // par euros
              value={mixedWalletAmount}
              onValueChange={(v: number) => setMixedWalletAmount(Math.round(v))}
              minimumTrackTintColor="#C27B5A"
              maximumTrackTintColor={colors.border}
              thumbTintColor="#C27B5A"
            />
            <View style={styles.mixedSliderLabels}>
              <Text style={styles.mixedSliderLabel}>Carte</Text>
              <Text style={[styles.mixedSliderValue, { color: colors.green }]}>{fmt(mixedCardAmount)}</Text>
            </View>
          </View>

          {/* Récap visuel */}
          <View style={styles.mixedRecap}>
            <View style={[styles.mixedRecapBar, { flex: mixedWalletAmount || 1 }]}>
              <LinearGradient colors={['#D4937A', '#C27B5A']} style={styles.mixedRecapBarInner}>
                <Text style={styles.mixedRecapBarText}>
                  {mixedWalletAmount > 0 ? `Wallet ${fmt(mixedWalletAmount)}` : ''}
                </Text>
              </LinearGradient>
            </View>
            <View style={[styles.mixedRecapBar, { flex: mixedCardAmount || 1 }]}>
              <View style={[styles.mixedRecapBarInner, { backgroundColor: colors.green }]}>
                <Text style={styles.mixedRecapBarText}>
                  {mixedCardAmount > 0 ? `Carte ${fmt(mixedCardAmount)}` : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Formulaire carte pour le montant restant */}
          {mixedCardAmount > 0 ? (
            <View style={[styles.webViewWrap, { height: 260 }]}>
              <WebView
                source={{ html: getSquareCardHTML(SQUARE_APP_ID, SQUARE_LOCATION_ID, mixedCardAmount), baseUrl: 'https://web.squarecdn.com' }}
                onMessage={handleMixedCardNonce}
                style={styles.webview}
                javaScriptEnabled
                domStorageEnabled
                mixedContentMode="always"
                originWhitelist={['*']}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.webviewLoading}>
                    <ActivityIndicator color={colors.green} size="small" />
                  </View>
                )}
              />
            </View>
          ) : (
            // 100% wallet
            <Pressable onPress={handleWalletPay} style={styles.payBtn}>
              <Wallet size={18} color="#FFFFFF" strokeWidth={1.5} />
              <Text style={styles.payBtnText}>Payer {fmt(total)} avec le Wallet</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Sécurité */}
      <View style={[styles.securityRow, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Shield size={13} color={colors.textMuted} strokeWidth={1.5} />
        <Text style={styles.securityText}>Paiement sécurisé · Données chiffrées</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.xl, marginBottom: spacing.sm,
    backgroundColor: '#FEF0F0', borderRadius: 12, padding: 12,
  },
  errorText: { fontFamily: fonts.regular, fontSize: 12, color: '#C44040', flex: 1 },

  // ── Onglets ──
  tabRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: spacing.xl, marginBottom: spacing.md,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.green, borderColor: colors.green },
  tabWallet: { backgroundColor: '#C27B5A', borderColor: '#C27B5A' },
  tabDisabled: { opacity: 0.4 },
  tabText: { fontFamily: fonts.bold, fontSize: 12, color: colors.text },
  tabTextActive: { color: '#FFFFFF' },

  // ── Récap commande (onglet Carte) ──
  recap: { paddingHorizontal: spacing.xl, paddingBottom: 8 },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  recapName: { fontFamily: fonts.regular, fontSize: 13, color: colors.text, flex: 1, marginRight: 8 },
  recapPrice: { fontFamily: fonts.monoSemiBold, fontSize: 13, color: colors.text },
  recapDivider: { height: 1, backgroundColor: '#E8E8E8', marginVertical: 6 },

  // ── Points fidélité ──
  loyaltyInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.xl, marginBottom: spacing.md,
    backgroundColor: colors.greenLight, borderRadius: 10, padding: 10,
  },
  loyaltyText: { fontFamily: fonts.regular, fontSize: 12, color: colors.greenDark },

  // ── WebView carte ──
  webViewWrap: { flex: 1, marginHorizontal: spacing.xl, borderRadius: 16, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: colors.bg },
  webviewLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  webviewLoadingText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 12 },

  // ── Wallet ──
  walletContent: { paddingHorizontal: spacing.xl, gap: 16 },
  walletCard: { borderRadius: 18, padding: 24, alignItems: 'center', gap: 6 },
  walletCardBalance: { fontFamily: fonts.bold, fontSize: 32, color: '#FFFFFF', letterSpacing: -1 },
  walletCardLabel: { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  detailCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  detailValue: { fontFamily: fonts.monoSemiBold, fontSize: 13, color: colors.text },
  detailDivider: { height: 1, backgroundColor: '#E8E8E8', marginVertical: 6 },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.green, borderRadius: 16, paddingVertical: 16,
  },
  payBtnText: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF' },

  // ── Mixte ──
  mixedContent: { paddingHorizontal: spacing.xl, gap: 12 },
  mixedTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  mixedSubtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  mixedSliderWrap: { gap: 4 },
  mixedSliderLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mixedSliderLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  mixedSliderValue: { fontFamily: fonts.monoSemiBold, fontSize: 15 },

  mixedRecap: { flexDirection: 'row', height: 32, borderRadius: 10, overflow: 'hidden', gap: 2 },
  mixedRecapBar: { minWidth: 4 },
  mixedRecapBarInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  mixedRecapBarText: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' },

  // ── Sécurité ──
  securityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 12,
  },
  securityText: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },

  processingText: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginTop: 16 },
  processingSubtext: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
