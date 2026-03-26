// Écran Recharge Wallet — paiement par carte puis crédit wallet
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
import { ArrowLeft, Shield, Wallet, AlertCircle } from 'lucide-react-native';
import { callEdgeFunction } from '@/lib/square';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { colors, fonts, spacing } from '@/constants/theme';

const SQUARE_APP_ID = 'sq0idp-9F7C-S1CAmrls3asijyloA';
const SQUARE_LOCATION_ID = 'LHPTGDC0XBX47';

function getRechargeHTML(amountCents: number) {
  const amt = (amountCents / 100).toFixed(2).replace('.', ',');
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#F0F0E5;padding:16px}
#card-container{min-height:100px;margin-bottom:16px}
.btn{width:100%;padding:16px;border:none;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer}
#pay{background:#C27B5A;color:#fff}
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
    document.getElementById('pay').textContent='Recharger ${amt} €';
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

export default function RechargeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ amount: string }>();
  const amount = parseInt(params.amount ?? '0', 10);
  const { rechargeWallet } = useUser();
  const { showToast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'error') { setError(data.message); return; }
      if (data.type !== 'nonce' || !data.nonce) return;

      setIsProcessing(true);
      setError(null);

      const payResult = await callEdgeFunction<{ success: boolean; error?: string }>(
        'process-recharge',
        { sourceId: data.nonce, amount },
      );

      if (payResult.error || !payResult.data?.success) {
        setError(payResult.error ?? payResult.data?.error ?? 'Paiement refusé');
        setIsProcessing(false);
        return;
      }

      rechargeWallet(amount);
      showToast(`+${fmt(amount)} crédités sur votre wallet !`);
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#C27B5A" size="large" />
        <Text style={styles.processingText}>Rechargement en cours…</Text>
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
        <Text style={styles.headerTitle}>Recharger mon wallet</Text>
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

      {/* Montant */}
      <View style={styles.amountBar}>
        <Wallet size={18} color="#C27B5A" strokeWidth={1.5} />
        <Text style={styles.amountText}>{fmt(amount)} sera crédité sur votre portefeuille</Text>
      </View>

      {/* WebView — même approche que le checkout */}
      <View style={styles.webViewContainer}>
        <WebView
          source={{ html: getRechargeHTML(amount), baseUrl: 'https://web.squarecdn.com' }}
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
              <ActivityIndicator color="#C27B5A" size="large" />
            </View>
          )}
        />
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Shield size={12} color={colors.textMuted} strokeWidth={1.5} />
        <Text style={styles.footerText}>Paiement sécurisé · Square</Text>
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
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.xl, marginTop: 8, backgroundColor: '#FEF0F0', borderRadius: 12, padding: 12,
  },
  errorText: { fontFamily: fonts.regular, fontSize: 12, color: '#C44040', flex: 1 },
  amountBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: spacing.xl, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  amountText: { fontFamily: fonts.bold, fontSize: 14, color: '#C27B5A' },
  webViewContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: colors.bg },
  webviewLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  footerText: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  processingText: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginTop: 16 },
});
