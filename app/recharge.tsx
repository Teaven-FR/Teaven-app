// Écran Recharge Wallet — paiement par carte puis crédit wallet
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
import { ArrowLeft, Shield, Wallet, AlertCircle } from 'lucide-react-native';
import { callEdgeFunction } from '@/lib/square';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { colors, fonts, spacing } from '@/constants/theme';

const SQUARE_APP_ID = process.env.EXPO_PUBLIC_SQUARE_APP_ID || 'sq0idp-9F7C-S1CAmrls3asijyloA';
const SQUARE_LOCATION_ID = process.env.EXPO_PUBLIC_SQUARE_LOCATION_ID || 'LHPTGDC0XBX47';

function getPayHTML(appId: string, locationId: string, amountCents: number) {
  const amt = (amountCents / 100).toFixed(2).replace('.', ',');
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#F0F0E5;padding:20px 16px}
#card-container{min-height:90px;margin-bottom:20px}
.btn{width:100%;padding:17px;border:none;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer}
#pay{background:#C27B5A;color:#fff}
#pay:disabled{opacity:.35}
.msg{text-align:center;font-size:13px;margin-top:12px;padding:10px;border-radius:10px}
.err{background:#FEF0F0;color:#C44040}
.ok{background:#E8F0EA;color:#2C4A32}
.loading{text-align:center;color:#738478;font-size:14px;padding:50px 0}
</style></head><body>
<div id="loading" class="loading">Chargement…</div>
<div id="card-container" style="display:none"></div>
<button class="btn" id="pay" style="display:none" disabled>Chargement…</button>
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
    document.getElementById('pay').textContent='Recharger ${amt} €';
  }catch(e){
    document.getElementById('loading').style.display='none';
    document.getElementById('msg').className='msg err';
    document.getElementById('msg').textContent='Erreur: '+e.message;
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',message:e.message}));
  }
}
document.getElementById('pay').addEventListener('click',async()=>{
  const b=document.getElementById('pay');b.disabled=true;b.textContent='Traitement…';
  try{
    const r=await card.tokenize();
    if(r.status==='OK'){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'nonce',nonce:r.token}));
      b.textContent='Paiement en cours…';
    }else{
      const err=r.errors?r.errors.map(e=>e.message).join('. '):'Vérifiez votre carte.';
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

      // 1. Créer un paiement Square pour le montant de la recharge
      const payResult = await callEdgeFunction<{ success: boolean; error?: string }>(
        'process-recharge',
        { sourceId: data.nonce, amount },
      );

      if (payResult.error || !payResult.data?.success) {
        setError(payResult.error ?? payResult.data?.error ?? 'Paiement refusé');
        setIsProcessing(false);
        return;
      }

      // 2. Créditer le wallet
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Recharger mon wallet</Text>
        <View style={{ width: 36 }} />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <AlertCircle size={14} color="#C44040" strokeWidth={2} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)} hitSlop={8}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: '#C44040' }}>OK</Text>
          </Pressable>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.amountCard}>
          <Wallet size={20} color="#C27B5A" strokeWidth={1.5} />
          <Text style={styles.amountValue}>{fmt(amount)}</Text>
          <Text style={styles.amountLabel}>sera crédité sur votre portefeuille</Text>
        </View>

        <Text style={styles.payLabel}>PAIEMENT PAR CARTE</Text>
        <View style={styles.webViewWrap}>
          <WebView
            source={{ html: getPayHTML(SQUARE_APP_ID, SQUARE_LOCATION_ID, amount), baseUrl: 'https://web.squarecdn.com' }}
            onMessage={handleWebViewMessage}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            originWhitelist={['*']}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator color="#C27B5A" size="large" />
              </View>
            )}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
    paddingHorizontal: spacing.xl, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.xl, marginTop: 8, backgroundColor: '#FEF0F0', borderRadius: 12, padding: 12,
  },
  errorText: { fontFamily: fonts.regular, fontSize: 12, color: '#C44040', flex: 1 },
  content: { padding: spacing.xl, gap: 16 },
  amountCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  amountValue: { fontFamily: fonts.bold, fontSize: 28, color: '#C27B5A', letterSpacing: -0.5 },
  amountLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  payLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2.5, color: colors.textMuted },
  webViewWrap: { height: 260, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  webview: { flex: 1, backgroundColor: colors.bg },
  webviewLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  footerText: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  processingText: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginTop: 16 },
});
