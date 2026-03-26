// Écran Checkout — paiement direct sans étape en double
// Pour le MVP : paiement wallet direct + création commande Square
// Le paiement CB sera activé avec Square Web Payments SDK en build natif
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Shield,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { useUser } from '@/hooks/useUser';
import { useCartStore } from '@/stores/cartStore';
import { useOrderStore } from '@/stores/orderStore';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

const SQUARE_APP_ID = process.env.EXPO_PUBLIC_SQUARE_APP_ID ?? '';
const SQUARE_LOCATION_ID = process.env.EXPO_PUBLIC_SQUARE_LOCATION_ID ?? '';

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
    if(!window.Square){document.getElementById('msg').className='msg err';document.getElementById('msg').textContent='SDK non chargé. Vérifiez votre connexion.';return;}
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
  const { wallet } = useUser();
  const cartItems = useCartStore((s) => s.items);
  const createOrder = useOrderStore((s) => s.createOrder);

  const [selectedMethod, setSelectedMethod] = useState<'card' | 'wallet'>(
    wallet.balance >= total ? 'wallet' : 'card'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCardWebView, setShowCardWebView] = useState(false);

  const fmt = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} \u20AC`;
  const walletSufficient = wallet.balance >= total;

  // Nonce reçu du formulaire Square WebView
  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'error') {
        setError(data.message);
        return;
      }
      if (data.type !== 'nonce' || !data.nonce) return;

      setIsProcessing(true);
      setError(null);
      const order = await createOrder(cartItems, 'card', false, data.nonce);
      router.replace('/order-confirmation');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du paiement');
      setIsProcessing(false);
    }
  };

  const handleWalletPayment = async () => {
    if (!wallet.giftCardId) {
      setError('Wallet non configuré. Rechargez votre wallet ou payez par carte.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const order = await createOrder(cartItems, 'wallet', false, undefined, wallet.giftCardId);
      router.replace('/order-confirmation');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du paiement');
    } finally {
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

      {/* ──── Carte wallet info — toujours visible ──── */}
      <View style={styles.walletInfoCard}>
        <Text style={styles.walletInfoTitle}>Mon portefeuille Teaven</Text>
        <View style={styles.walletInfoRow}>
          <Text style={styles.walletInfoLabel}>Solde actuel</Text>
          <Text style={styles.walletInfoValue}>{fmt(wallet.balance)}</Text>
        </View>
        <View style={styles.walletInfoRow}>
          <Text style={styles.walletInfoLabel}>Commande</Text>
          <Text style={styles.walletInfoValue}>- {fmt(total)}</Text>
        </View>
        <View style={[styles.walletInfoDivider]} />
        <View style={styles.walletInfoRow}>
          <Text style={[styles.walletInfoLabel, { fontFamily: fonts.bold }]}>Solde après</Text>
          <Text style={[
            styles.walletInfoValue,
            { fontFamily: fonts.bold, color: walletSufficient ? colors.green : '#C44040' },
          ]}>
            {walletSufficient ? fmt(wallet.balance - total) : `- ${fmt(total - wallet.balance)}`}
          </Text>
        </View>
        {!walletSufficient && (
          <Text style={styles.walletInfoInsufficient}>
            Solde insuffisant — rechargez {fmt(total - wallet.balance)} pour payer avec le wallet
          </Text>
        )}
      </View>

      {/* Sélection méthode */}
      <View style={styles.methodRow}>
        <Pressable
          style={[styles.methodTab, selectedMethod === 'card' && styles.methodTabActive]}
          onPress={() => setSelectedMethod('card')}
        >
          <CreditCard size={16} color={selectedMethod === 'card' ? '#FFFFFF' : colors.textSecondary} strokeWidth={1.5} />
          <Text style={[styles.methodTabText, selectedMethod === 'card' && styles.methodTabTextActive]}>Carte</Text>
        </Pressable>
        <Pressable
          style={[styles.methodTab, selectedMethod === 'wallet' && styles.methodTabWallet, !walletSufficient && styles.methodDisabled]}
          onPress={() => walletSufficient && setSelectedMethod('wallet')}
        >
          <Wallet size={16} color={selectedMethod === 'wallet' ? '#FFFFFF' : colors.textSecondary} strokeWidth={1.5} />
          <Text style={[styles.methodTabText, selectedMethod === 'wallet' && { color: '#FFFFFF' }]}>
            Wallet {walletSufficient ? fmt(wallet.balance) : '— Insuffisant'}
          </Text>
        </Pressable>
      </View>

      {/* Contenu selon la méthode */}
      {selectedMethod === 'card' ? (
        <View style={styles.cardWebViewWrap}>
          <WebView
            source={{
              html: getSquareCardHTML(SQUARE_APP_ID, SQUARE_LOCATION_ID, total),
              baseUrl: 'https://web.squarecdn.com',
            }}
            onMessage={handleWebViewMessage}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            originWhitelist={['*']}
            onError={(e) => setError(`Erreur: ${e.nativeEvent.description}`)}
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
                <ActivityIndicator color={colors.green} size="large" />
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 12 }}>
                  Chargement du formulaire sécurisé...
                </Text>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.walletPaySection}>
          <LinearGradient colors={['#75967F', '#4A6B50']} style={styles.walletPayCard}>
            <Wallet size={24} color="rgba(255,255,255,0.7)" strokeWidth={1.3} />
            <Text style={styles.walletPayAmount}>{fmt(total)}</Text>
            <Text style={styles.walletPayLabel}>Solde après : {fmt(wallet.balance - total)}</Text>
          </LinearGradient>
          <Pressable onPress={handleWalletPayment} style={styles.walletPayBtn}>
            <Text style={styles.walletPayBtnText}>Confirmer le paiement</Text>
          </Pressable>
        </View>
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 20 },

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

  // Tabs méthodes
  methodRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: spacing.xl, marginBottom: spacing.md,
  },
  methodTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
  },
  methodTabActive: { backgroundColor: colors.green, borderColor: colors.green },
  methodTabWallet: { backgroundColor: '#738478', borderColor: '#738478' },
  methodDisabled: { opacity: 0.4 },
  methodTabText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  methodTabTextActive: { color: '#FFFFFF' },

  // WebView carte
  cardWebViewWrap: {
    flex: 1, marginHorizontal: spacing.xl, borderRadius: 16, overflow: 'hidden',
  },
  webview: { flex: 1, backgroundColor: colors.bg },

  // Wallet pay
  walletPaySection: {
    flex: 1, paddingHorizontal: spacing.xl, gap: spacing.lg, justifyContent: 'center',
  },
  walletPayCard: {
    borderRadius: 18, padding: 28, alignItems: 'center', gap: 8,
  },
  walletPayAmount: { fontFamily: fonts.bold, fontSize: 36, color: '#FFFFFF', letterSpacing: -1 },
  walletPayLabel: { fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  walletPayBtn: {
    backgroundColor: colors.green, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  walletPayBtnText: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF' },

  securityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 12,
  },
  securityText: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },

  processingText: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginTop: 16 },
  processingSubtext: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 },

  // Wallet info card
  walletInfoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E0E0E0',
    padding: 16, marginHorizontal: spacing.xl, marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  walletInfoTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text, marginBottom: 12 },
  walletInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  walletInfoLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  walletInfoValue: { fontFamily: fonts.monoSemiBold, fontSize: 13, color: colors.text },
  walletInfoDivider: { height: 1, backgroundColor: '#E8E8E8', marginVertical: 8 },
  walletInfoInsufficient: {
    fontFamily: fonts.regular, fontSize: 11, color: '#C44040', marginTop: 8, textAlign: 'center',
  },
});
