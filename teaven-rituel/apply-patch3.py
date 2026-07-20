# v6.5.0 : tableau "Ce qui saute le plus souvent" (Historique) + emplacement photo
# de référence par geste (affiché seulement quand une photo est renseignée).
# S'applique sur public/index.html (déjà en v6.4.0). Remplacements à occurrence unique.
import sys

src = open('public/index.html', encoding='utf-8').read()

if 'renderMissed' in src:
    print('index.html déjà en v6.5.0 — aucun changement')
    sys.exit(0)
if 'renderFiches' not in src:
    sys.exit('ECHEC : le patch v6.4.0 doit être appliqué avant')

def rep(old, new, label):
    global src
    n = src.count(old)
    if n != 1:
        sys.exit(f'ECHEC [{label}] : {n} occurrence(s) au lieu de 1')
    src = src.replace(old, new)
    print(f'ok  {label}')

# ---------- 1. CSS : carte des gestes manqués + bouton et visionneuse photo ----------
rep(
'''  /* ---------- Mode réorganisation (hors édition) ---------- */''',
'''  /* ---------- Ce qui saute le plus souvent (Historique) ---------- */
  .missed-card{background:var(--card);border:1px solid var(--card-border);border-radius:var(--radius);box-shadow:var(--shadow-sm);
    padding:16px;margin-bottom:var(--s4);}
  .missed-title{font-family:var(--font-title);font-weight:600;font-size:15px;color:var(--ink);margin-bottom:var(--s3);
    display:flex;align-items:baseline;justify-content:space-between;gap:8px;}
  .missed-title span{font-size:11.5px;font-weight:600;color:var(--texte-tres-doux);font-family:var(--font-body);white-space:nowrap;}
  .missed-row{display:flex;align-items:center;gap:10px;padding:6px 0;}
  .missed-label{flex:1;font-size:13.5px;font-weight:500;color:var(--ink);line-height:1.35;min-width:0;}
  .missed-bar{flex:0 0 86px;height:7px;background:var(--section);border-radius:4px;overflow:hidden;}
  .missed-bar i{display:block;height:100%;background:var(--warn);border-radius:4px;}
  .missed-row b{flex:0 0 32px;text-align:right;font-size:12.5px;color:var(--texte-doux);font-variant-numeric:tabular-nums;}

  /* ---------- Photo de référence d'un geste (visible quand renseignée) ---------- */
  .photo-btn{flex:0 0 auto;width:34px;height:34px;margin:-5px 0;display:grid;place-items:center;color:var(--celadon);
    padding:0;border-radius:var(--radius-sm);transition:color var(--dur-fast) var(--ease-out);}
  .photo-btn:hover{color:var(--vert-fonce);}
  .photo-btn svg{width:17px;height:17px;pointer-events:none;}
  .photo-full{width:100%;border-radius:var(--radius);border:1px solid var(--line-soft);display:block;margin-bottom:var(--s3);}

  /* ---------- Mode réorganisation (hors édition) ---------- */''',
'CSS gestes manqués + photo')

# ---------- 2. HTML : hôte du tableau dans l'Historique ----------
rep(
'''    <div class="history" id="historyList"></div>''',
'''    <div id="missedHost"></div>
    <div class="history" id="historyList"></div>''',
'HTML hôte gestes manqués')

# ---------- 3. HTML : visionneuse photo ----------
rep(
'''<div class="toast" id="toast" role="status"></div>''',
'''<div class="overlay" id="photoOverlay">
  <div class="sheet">
    <div class="sheet-handle"></div>
    <h3 id="photoTitle"></h3>
    <p>Photo de r&eacute;f&eacute;rence : l&rsquo;&eacute;tat attendu une fois le geste fait.</p>
    <img id="photoImg" class="photo-full" alt="" />
  </div>
</div>

<div class="toast" id="toast" role="status"></div>''',
'HTML visionneuse photo')

# ---------- 4. JS : icône photo ----------
rep(
'''  /* Retour haptique discret (Android ; iOS ignore silencieusement) */''',
'''  var CAM='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="12" cy="12.5" r="3.4"/><path d="M8 5l1.2-2h5.6L16 5"/></svg>';

  /* Retour haptique discret (Android ; iOS ignore silencieusement) */''',
'icône CAM')

# ---------- 5. JS : bouton photo dans la ligne (seulement si photo renseignée) ----------
rep(
'''          '<div class="label"></div>'+''',
'''          '<div class="label"></div>'+
          (it.photo?'<button class="photo-btn" aria-label="Voir la photo de r&eacute;f&eacute;rence">'+CAM+'</button>':'')+''',
'HTML bouton photo')

rep(
'''        el.querySelector(".label").textContent=it.label;''',
'''        el.querySelector(".label").textContent=it.label;
        if(it.photo){
          el.querySelector(".photo-btn").addEventListener("click",function(e){
            e.stopPropagation();
            $("photoTitle").textContent=it.label;
            $("photoImg").src=it.photo; $("photoImg").alt=it.label;
            $("photoOverlay").classList.add("open");
          });
        }''',
'listener photo')

# ---------- 6. JS : tableau des gestes manqués ----------
rep(
'''  function renderHistory(){''',
'''  /* ------- Ce qui saute le plus souvent : agrégat des gestes manqués (30 j) -------
     Les libellés viennent des rituels validés (champ missed) ; suit le filtre par site. */
  function renderMissed(){
    var host=$("missedHost"); if(!host) return;
    host.innerHTML="";
    var cutoff=new Date(); cutoff.setDate(cutoff.getDate()-30);
    var ck=cutoff.getFullYear()+"-"+pad2(cutoff.getMonth()+1)+"-"+pad2(cutoff.getDate());
    var counts={};
    filteredHist().forEach(function(h){
      if(h.date<ck) return;
      (h.missed||[]).forEach(function(l){ if(l) counts[l]=(counts[l]||0)+1; });
    });
    var rows=Object.keys(counts).map(function(l){ return {label:l,n:counts[l]}; })
      .sort(function(a,b){ return b.n-a.n; }).slice(0,6);
    if(!rows.length) return;
    var max=rows[0].n||1;
    var el=document.createElement("div"); el.className="missed-card";
    el.innerHTML='<div class="missed-title">Ce qui saute le plus souvent <span>30 derniers jours</span></div>'+
      rows.map(function(r){
        return '<div class="missed-row"><div class="missed-label"></div>'+
          '<div class="missed-bar"><i style="width:'+Math.round(r.n/max*100)+'%"></i></div>'+
          '<b>'+r.n+'&times;</b></div>';
      }).join("");
    var labels=el.querySelectorAll(".missed-label");
    rows.forEach(function(r,i){ labels[i].textContent=r.label; });
    host.appendChild(el);
  }

  function renderHistory(){''',
'fonction renderMissed')

rep(
'''    $("statCount").textContent=filteredHist().length;
  }''',
'''    $("statCount").textContent=filteredHist().length;
    renderMissed();
  }''',
'renderMissed dans renderHistory')

# ---------- 7. JS : fermeture de la visionneuse ----------
rep(
'''    $("settingsOverlay").addEventListener("click",function(e){ if(e.target===this) this.classList.remove("open"); });''',
'''    $("settingsOverlay").addEventListener("click",function(e){ if(e.target===this) this.classList.remove("open"); });
    $("photoOverlay").addEventListener("click",function(e){ if(e.target===this) this.classList.remove("open"); });''',
'listener fermeture photo')

open('public/index.html', 'w', encoding='utf-8').write(src)
print('public/index.html écrit :', len(src), 'caractères')
