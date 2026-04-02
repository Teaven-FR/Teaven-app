// Edge Function — Page HTML du formulaire de paiement Square (HTTPS)
// GET ?amount=1000&app_id=...&location_id=...
// Retourne une page HTML avec le SDK Square Web Payments

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  const url = new URL(req.url);
  const amount = parseInt(url.searchParams.get('amount') ?? '0', 10);
  const appId = url.searchParams.get('app_id') ?? '';
  const locationId = url.searchParams.get('location_id') ?? '';
  const amt = (amount / 100).toFixed(2).replace('.', ',');

  const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Paiement Teaven</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F0F0E5;padding:20px 16px;min-height:100vh}
#card-container{min-height:90px;margin-bottom:16px}
.btn{width:100%;padding:16px;border:none;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer;-webkit-appearance:none}
#pay{background:#75967F;color:#fff}
#pay:disabled{opacity:.4}
.msg{text-align:center;font-size:13px;margin-top:10px;padding:10px;border-radius:10px}
.err{background:#FEF0F0;color:#C44040}
.ok{background:#E8F0EA;color:#3A5A40}
.loading{text-align:center;color:#738478;font-size:14px;padding:30px 0}
.secure{text-align:center;color:#738478;font-size:11px;margin-top:20px}
</style>
</head><body>
<div id="loading" class="loading">Chargement du formulaire sécurisé...</div>
<div id="card-container" style="display:none"></div>
<button class="btn" id="pay" style="display:none" disabled>Chargement...</button>
<div id="msg"></div>
<div class="secure">🔒 Paiement sécurisé par Square</div>

<script src="https://web.squarecdn.com/v1/square.js"></script>
<script>
let card;
async function init(){
  try{
    if(!window.Square){
      document.getElementById('loading').style.display='none';
      document.getElementById('msg').className='msg err';
      document.getElementById('msg').textContent='SDK non chargé. Vérifiez votre connexion.';
      return;
    }
    const payments=Square.payments('${appId}','${locationId}');
    card=await payments.card();
    await card.attach('#card-container');
    document.getElementById('loading').style.display='none';
    document.getElementById('card-container').style.display='block';
    document.getElementById('pay').style.display='block';
    document.getElementById('pay').disabled=false;
    document.getElementById('pay').textContent='Payer ${amt} \\u20AC';
  }catch(e){
    document.getElementById('loading').style.display='none';
    document.getElementById('msg').className='msg err';
    document.getElementById('msg').textContent='Erreur: '+e.message;
    if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',message:e.message}));
  }
}

document.getElementById('pay').addEventListener('click',async()=>{
  const b=document.getElementById('pay');
  b.disabled=true;
  b.textContent='Traitement...';
  document.getElementById('msg').textContent='';
  try{
    const r=await card.tokenize();
    if(r.status==='OK'){
      if(window.ReactNativeWebView){
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'nonce',nonce:r.token}));
      }
      b.textContent='Paiement en cours...';
      document.getElementById('msg').className='msg ok';
      document.getElementById('msg').textContent='Token généré, finalisation...';
    }else{
      const err=r.errors?r.errors.map(function(e){return e.message}).join('. '):'Vérifiez vos informations.';
      document.getElementById('msg').className='msg err';
      document.getElementById('msg').textContent=err;
      b.disabled=false;
      b.textContent='Réessayer';
    }
  }catch(e){
    document.getElementById('msg').className='msg err';
    document.getElementById('msg').textContent=e.message;
    b.disabled=false;
    b.textContent='Réessayer';
  }
});

init();
</script>
</body></html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
