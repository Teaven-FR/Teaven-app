// Écran Checkout — paiement par carte bancaire via Square Web Payments SDK
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Switch } from 'react-native';
import {
  ArrowLeft,
  Shield,
  AlertCircle,
  Star,
  MapPin,
  Wallet,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser, LEVEL_MULTIPLIERS } from '@/hooks/useUser';
import { useLocation } from '@/hooks/useLocation';
import { useCartStore } from '@/stores/cartStore';
import { useOrderStore } from '@/stores/orderStore';
import { colors, fonts, spacing } from '@/constants/theme';

const SQUARE_APP_ID = 'sq0idp-9F7C-S1CAmrls3asijyloA';
const SQUARE_LOCATION_ID = 'LHPTGDC0XBX47';

function getSquareCardHTML(amountCents: number) {
  const amt = (amountCents / 100).toFixed(2).replace('.', ',');
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#F0F0E5;padding:16px}
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
    const payments=Square.payments('${SQUARE_APP_ID}','${SQUARE_LOCATION_ID}');
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
  const params = useLocalSearchParams<{ total: string; pickupTime?: string; discounts?: string }>();
  const total = parseInt(params.total ?? '0', 10);
  const pickupTime = params.pickupTime;
  const discounts = params.discounts ? JSON.parse(params.discounts) : undefined;
  const { loyalty, loyaltyAccountId, wallet } = useUser();
  const { location: storeLocation } = useLocation();
  const cartItems = useCartStore((s) => s.items);
  const createOrder = useOrderStore((s) => s.createOrder);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useWallet, setUseWallet] = useState(wallet.balance > 0);

  const walletCoversAll = useWallet && wallet.balance >= total;
  const walletPartial = useWallet && wallet.balance > 0 && wallet.balance < total;
  const cardAmount = walletPartial ? total - wallet.balance : total;

  const fmt = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  const multiplier = LEVEL_MULTIPLIERS[loyalty.level] ?? 1;
  const pointsEstimated = Math.floor((total / 100) * 10 * multiplier);

  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'error') { setError(data.message); return; }
      if (data.type !== 'nonce' || !data.nonce) return;

      setIsProcessing(true);
      setError(null);
      try {
        await createOrder(cartItems, 'card', false, data.nonce, undefined, pickupTime, undefined, loyaltyAccountId ?? undefined, discounts);
        router.replace('/order-confirmation');
      } catch (orderErr: unknown) {
        setError(orderErr instanceof Error ? orderErr.message : 'Erreur lors du paiement');
        setIsProcessing(false);
      }
    } catch {
      // ignore non-JSON
    }
  };

  if (isProcessing) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.green} size="large" />
        <Text style={styles.processingText}>Paiement en cours…</Text>
        <Text style={styles.processingSub}>Ne fermez pas l'application</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Confirmer et payer</Text>
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

      {/* ──── Récap commande ──── */}
      <View style={styles.recapCard}>
        {cartItems.map((item, i) => (
          <View key={i} style={styles.recapItemRow}>
            <Text style={styles.recapItemQty}>{item.quantity}×</Text>
            <Text style={styles.recapItemName} numberOfLines={1}>{item.product.name}</Text>
            <Text style={styles.recapItemPrice}>{fmt(item.product.price * item.quantity)}</Text>
          </View>
        ))}
        <View style={styles.recapDivider} />
        <View style={styles.recapTotalRow}>
          <Text style={styles.recapTotalLabel}>Total</Text>
          <Text style={styles.recapTotalValue}>{fmt(total)}</Text>
        </View>
        <View style={styles.recapInfoRow}>
          <MapPin size={12} color={colors.green} strokeWidth={1.5} />
          <Text style={styles.recapInfoText}>{storeLocation.name}</Text>
        </View>
        <View style={styles.recapInfoRow}>
          <Star size={12} color={colors.green} strokeWidth={1.5} />
          <Text style={styles.recapInfoText}>+{pointsEstimated} points fidélité</Text>
        </View>
      </View>

      {/* ──── Toggle Wallet ──── */}
      <View style={styles.walletToggle}>
        <LinearGradient colors={['#D4937A', '#C27B5A']} style={styles.walletToggleCard}>
          <Wallet size={16} color="#FFFFFF" strokeWidth={1.5} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.walletToggleLabel, { color: '#FFFFFF' }]}>
              Portefeuille Teaven
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>
              Solde : {fmt(wallet.balance)}
            </Text>
          </View>
          <Switch
            value={useWallet}
            onValueChange={setUseWallet}
            trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.5)' }}
            thumbColor="#FFFFFF"
          />
        </LinearGradient>

        {/* Info mix */}
        {walletPartial && (
          <View style={styles.mixInfo}>
            <Text style={styles.mixInfoText}>Portefeuille : -{fmt(wallet.balance)}</Text>
            <Text style={styles.mixInfoText}>Carte : -{fmt(cardAmount)}</Text>
          </View>
        )}

        {/* Wallet vide */}
        {useWallet && wallet.balance === 0 && (
          <Pressable style={styles.rechargeLink} onPress={() => router.push('/recharge')}>
            <Text style={styles.rechargeLinkText}>Portefeuille vide — Recharger</Text>
          </Pressable>
        )}
      </View>

      {/* ──── Paiement wallet seul ──── */}
      {walletCoversAll ? (
        <View style={styles.walletPaySection}>
          <Pressable
            style={styles.walletPayBtn}
            onPress={async () => {
              if (!wallet.giftCardId) { setError('Wallet non configuré'); return; }
              setIsProcessing(true);
              try {
                await createOrder(cartItems, 'wallet', false, undefined, wallet.giftCardId, pickupTime, undefined, loyaltyAccountId ?? undefined, discounts);
                router.replace('/order-confirmation');
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Erreur');
                setIsProcessing(false);
              }
            }}
          >
            <Wallet size={18} color="#FFFFFF" strokeWidth={1.5} />
            <Text style={styles.walletPayBtnText}>Payer {fmt(total)} avec le portefeuille</Text>
          </Pressable>
        </View>
      ) : (
        /* ──── Formulaire carte (total ou complément) ──── */
        <View style={styles.webViewContainer}>
          <WebView
            source={{ html: getSquareCardHTML(cardAmount), baseUrl: 'https://web.squarecdn.com' }}
            onMessage={handleWebViewMessage}
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
              </View>
            )}
          />
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Shield size={12} color={colors.textMuted} strokeWidth={1.5} />
        <Text style={styles.footerText}>Paiement sécurisé · Données chiffrées · Square</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.xl, marginTop: 8, backgroundColor: '#FEF0F0', borderRadius: 12, padding: 12,
  },
  errorText: { fontFamily: fonts.regular, fontSize: 12, color: '#C44040', flex: 1 },

  // Récap commande
  recapCard: {
    marginHorizontal: spacing.xl, marginTop: 12,
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  recapItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  recapItemQty: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary, width: 28 },
  recapItemName: { fontFamily: fonts.regular, fontSize: 13, color: colors.text, flex: 1, marginRight: 8 },
  recapItemPrice: { fontFamily: fonts.monoSemiBold, fontSize: 13, color: colors.text },
  recapDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  recapTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  recapTotalLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  recapTotalValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.green, letterSpacing: -0.5 },
  recapInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  recapInfoText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },

  // WebView — prend tout l'espace restant
  webViewContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: colors.bg },
  webviewLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  footerText: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },

  processingText: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginTop: 16 },
  processingSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 },

  // Wallet toggle
  walletToggle: { paddingHorizontal: spacing.xl, paddingVertical: 10 },
  walletToggleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  walletToggleLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  walletToggleBalance: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  mixInfo: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: 10, padding: 10, marginTop: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  mixInfoText: { fontFamily: fonts.monoSemiBold, fontSize: 12, color: colors.text },
  rechargeLink: {
    backgroundColor: '#FDF0EE', borderRadius: 10, padding: 12, marginTop: 8, alignItems: 'center',
  },
  rechargeLinkText: { fontFamily: fonts.bold, fontSize: 13, color: '#C27B5A' },

  // Wallet pay
  walletPaySection: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  walletPayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#C27B5A', borderRadius: 16, paddingVertical: 18,
  },
  walletPayBtnText: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF' },
});
