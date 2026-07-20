# v6.4.0 : mode "Réorganiser" hors édition + onglet Fiches de service + rappel horaire.
# S'applique sur public/index.html (déjà en v6.3.0). Remplacements à occurrence unique.
import sys

src = open('public/index.html', encoding='utf-8').read()

if 'renderFiches' in src:
    print('index.html déjà en v6.4.0 — aucun changement')
    sys.exit(0)
if 'makeDraggable' not in src:
    sys.exit('ECHEC : le patch v6.3.0 doit être appliqué avant')

def rep(old, new, label):
    global src
    n = src.count(old)
    if n != 1:
        sys.exit(f'ECHEC [{label}] : {n} occurrence(s) au lieu de 1')
    src = src.replace(old, new)
    print(f'ok  {label}')

# ---------- 1. CSS : mode réorganisation + fiches de service + rappel horaire ----------
rep(
'''  @media (prefers-reduced-motion:reduce){html{scroll-behavior:auto;}*{animation:none !important;transition:none !important;}}''',
'''  /* ---------- Mode réorganisation (hors édition) ---------- */
  body.reordering .task .drag{display:grid;}
  body.editing #reorderToggle{display:none;}
  body.reordering #editToggle{display:none;}

  /* ---------- Rappel horaire de la fiche de service ---------- */
  .now-hint{display:none;align-items:center;gap:8px;width:100%;text-align:left;font-size:13px;font-weight:600;
    color:var(--vert-fonce);-webkit-text-fill-color:var(--vert-fonce);background:var(--vert-soft);border:1px solid var(--vert-line);
    border-radius:var(--radius);padding:9px 13px;margin:-10px 0 var(--s5);line-height:1.45;}
  .now-hint b{font-variant-numeric:tabular-nums;flex:0 0 auto;}

  /* ---------- Fiches de service ---------- */
  .fiche{background:var(--card);border:1px solid var(--card-border);border-radius:var(--radius);box-shadow:var(--shadow-sm);
    padding:20px;margin-bottom:var(--s5);}
  .fiche h2{font-family:var(--font-title);font-size:19px;font-weight:700;margin:0 0 var(--s1);color:var(--ink);}
  .fiche-badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
    color:var(--vert-fonce);background:var(--vert-soft);border:1px solid var(--vert-line);border-radius:var(--radius-sm);
    padding:3px 8px;margin-bottom:var(--s3);}
  .fiche-motto{font-size:13.5px;color:var(--texte-doux);line-height:1.55;margin-bottom:var(--s4);}
  .fiche-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s2);margin-bottom:var(--s5);}
  .fiche-step{background:var(--bg);border:1px solid var(--line-soft);border-radius:var(--radius);padding:10px;}
  .fiche-step b{display:block;font-size:11px;font-weight:800;letter-spacing:.05em;color:var(--vert-fonce);margin-bottom:4px;}
  .fiche-step span{font-size:12px;color:var(--texte-doux);line-height:1.45;display:block;}
  .tl{position:relative;margin:0;padding:0;list-style:none;}
  .tl li{position:relative;padding:0 0 var(--s4) 74px;}
  .tl li::before{content:"";position:absolute;left:56px;top:8px;bottom:-4px;width:2px;background:var(--vert-line);}
  .tl li:last-child::before{display:none;}
  .tl li::after{content:"";position:absolute;left:52px;top:5px;width:8px;height:8px;border-radius:50%;
    background:var(--green);border:2px solid var(--card);}
  .tl li.now::after{background:var(--vert-fonce);box-shadow:0 0 0 4px var(--vert-soft);}
  .tl-time{position:absolute;left:0;top:1px;width:44px;text-align:right;font-family:var(--font-title);font-weight:700;
    font-size:12.5px;color:var(--vert-fonce);font-variant-numeric:tabular-nums;}
  .tl-t{font-weight:600;font-size:14.5px;color:var(--ink);margin-bottom:2px;line-height:1.4;}
  .tl-d{font-size:13px;color:var(--texte-doux);line-height:1.5;}
  .fiche-note{font-size:13px;color:var(--texte-doux);border-top:1px solid var(--line-soft);padding-top:var(--s3);line-height:1.55;font-style:italic;}

  @media (prefers-reduced-motion:reduce){html{scroll-behavior:auto;}*{animation:none !important;transition:none !important;}}''',
'CSS réorganisation + fiches')

# ---------- 2. HTML : rappel horaire sous la date ----------
rep(
'''    <div class="date" id="dateLabel"></div>''',
'''    <div class="date" id="dateLabel"></div>
    <button class="now-hint" id="nowHint"></button>''',
'HTML rappel horaire')

# ---------- 3. HTML : bouton Réorganiser dans les actions ----------
rep(
'''      <button class="btn btn-tertiary" id="editToggle">Modifier la liste</button>''',
'''      <button class="btn btn-tertiary" id="reorderToggle">R&eacute;organiser les gestes</button>
      <button class="btn btn-tertiary" id="editToggle">Modifier la liste</button>''',
'HTML bouton réorganiser')

# ---------- 4. HTML : vue Fiches de service ----------
rep(
'''    <div id="calDetail"></div>
  </section>''',
'''    <div id="calDetail"></div>
  </section>

  <section class="view" id="view-fiches">
    <h1>Fiches de service</h1>
    <div class="date">Le d&eacute;roul&eacute; d&rsquo;une journ&eacute;e, heure par heure</div>
    <div id="fichesHost"></div>
  </section>''',
'HTML vue fiches')

# ---------- 5. HTML : 4e onglet de navigation ----------
rep(
'''    <span>Historique</span>
  </button>
</nav>''',
'''    <span>Historique</span>
  </button>
  <button data-view="fiches" aria-label="Fiches de service">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    <span>Fiches</span>
  </button>
</nav>''',
'HTML nav fiches')

# ---------- 6. JS : données des fiches + rendu + étape courante ----------
rep(
'''  function encouragement(pct,done){''',
'''  /* ------- Fiches de service : le process qui encadre chaque rituel -------
     Chaque étape porte son heure en minutes depuis minuit pour retrouver
     "où on devrait en être" à l'instant T. */
  var FICHES={
    ouverture:{
      title:"L'ouverture", badge:"Franconville",
      motto:"Ouvrir, \\u00e7a se pr\\u00e9pare avant les premiers clients. Suivez l'heure : \\u00e0 chaque moment sa t\\u00e2che, et plus rien ne reste ouvert \\u00e0 midi.",
      steps:[
        ["PR\\u00c9PARER","D\\u00e8s l'arriv\\u00e9e : ouvrir la boutique, d\\u00e9rouler la to-do liste (\\u224845 min)."],
        ["OUVRIR","Priorit\\u00e9 absolue : stocks \\u00e0 jour sur toutes les plateformes."],
        ["VERROUILLER","11h \\u2192 12h : r\\u00e9servations et plan de table, plus aucun point ouvert."]
      ],
      tl:[
        ["10h00","Arriv\\u00e9e & ouverture de la boutique","Premier r\\u00e9flexe : ouvrir la to-do liste et commencer \\u00e0 la d\\u00e9rouler, point par point.",600],
        ["10h05","Stocks \\u00e0 jour sur les plateformes \\u00b7 PRIORIT\\u00c9","Uber Eats, Deliveroo et le Click & Collect : stocks \\u00e0 jour le plus t\\u00f4t possible, pour qu'aucun client ne commande un produit indisponible.",605],
        ["10h10","D\\u00e9rouler la to-do liste","On suit la liste telle qu'elle est. D\\u00e8s qu'un article manque : liste de courses et application Metro \\u00e0 jour, au fil de l'ouverture. Aucun manquement ne se r\\u00e8gle \\u00ab plus tard \\u00bb.",610],
        ["10h10","Ouverture du point de vente","Les portes ouvrent au public. Les commandes en ligne se traitent au fur et \\u00e0 mesure, sans l\\u00e2cher la to-do liste.",615],
        ["11h00","Arriv\\u00e9e du 2\\u1d49 coll\\u00e8gue : renfort si besoin","Si la to-do liste n'est pas assez avanc\\u00e9e, on lui en confie une partie en pr\\u00e9cisant quoi faire. Aucun point ne doit rester d\\u00e9croch\\u00e9.",660],
        ["11h00","R\\u00e9servations & plan de table","Le coll\\u00e8gue arriv\\u00e9 \\u00e0 11h s'en occupe au calme : plan de table, aucune r\\u00e9servation tomb\\u00e9e sans \\u00eatre accept\\u00e9e, bonnes tables attribu\\u00e9es. Dernier point de l'ouverture.",665],
        ["12h00","L'ouverture est boucl\\u00e9e","Plan de table fait, r\\u00e9servations trait\\u00e9es, stocks \\u00e0 jour, liste de courses faite : aucun point ouvert. En cas de difficult\\u00e9, on pr\\u00e9vient le responsable avant que \\u00e7a ne g\\u00eane le service.",720]
      ],
      note:"On ouvre comme on re\\u00e7oit un invit\\u00e9 : tout est pr\\u00eat avant qu'il arrive. Une difficult\\u00e9 qui bloque l'ouverture ? On en parle au responsable avant qu'elle ne g\\u00eane le service."
    },
    fermeture:{
      title:"La fermeture", badge:"Franconville",
      motto:"Fermer, \\u00e7a ne commence pas \\u00e0 19h30. \\u00c7a s'anticipe d\\u00e8s 14h. Suivez l'heure : \\u00e0 chaque moment sa t\\u00e2che.",
      steps:[
        ["ANTICIPER","D\\u00e8s 14h : pr\\u00e9parer le terrain sans rien pr\\u00e9cipiter."],
        ["BASCULER","18h30 : glisser le service de la Tea Room vers la boutique."],
        ["CL\\u00d4TURER","19h15 \\u2192 20h : \\u00e9teindre, nettoyer, ranger, encaisser."]
      ],
      tl:[
        ["14h00","Fin des jus d'orange frais","On arr\\u00eate la machine \\u00e0 jus d'orange avec les formules du midi. La machine \\u00e0 jus press\\u00e9s continue de tourner.",840],
        ["15h00","R\\u00e9servations & vaisselle au fil de l'eau","Point r\\u00e9servations \\u00e0 15h. Couverts, verres et vaisselle : au fur et \\u00e0 mesure, jamais tout \\u00e0 la fin.",900],
        ["18h00","Anticiper le nettoyage","Lavette d\\u00e8s que possible : plans de travail, portes, surfaces. Tout ce qui est fait maintenant, c'est autant de gagn\\u00e9 sur la demi-heure finale.",1080],
        ["18h30","Fermeture de la Tea Room","On n'installe plus personne en salle arri\\u00e8re : les nouveaux clients vont \\u00e0 l'avant. On cl\\u00f4ture la Tea Room (nettoyage, chaises remont\\u00e9es). Exception en cas de forte affluence.",1110],
        ["18h45","Machine \\u00e0 jus + poubelle fruits","Nettoyage de la machine \\u00e0 jus, poubelle des fruits sortie en toute discr\\u00e9tion. On lance aussi le r\\u00e9assort.",1125],
        ["19h15","Machine \\u00e0 caf\\u00e9","Extinction, puis programmes de nettoyage et d'entretien de la machine.",1155],
        ["19h20","Dernier encaissement","On va voir chaque client \\u00e0 sa table pour encaisser. Apr\\u00e8s 19h20, on termine seulement les encaissements d\\u00e9j\\u00e0 en cours.",1160],
        ["19h30","Plus aucun client \\u00b7 la demi-heure finale","Rangement des p\\u00e2tisseries + DLC, frigos (dont frigo blanc p\\u00e2tisserie), meuble \\u00e0 vaisselle, toilettes, nettoyage de la boutique, banc et affichage rentr\\u00e9s \\u2014 jusqu'\\u00e0 20h.",1170]
      ],
      note:"On ferme comme on accueille : avec calme et discr\\u00e9tion. Le client ne doit jamais sentir qu'on range autour de lui. La parenth\\u00e8se reste ouverte jusqu'\\u00e0 ce qu'il parte."
    }
  };
  function nowMinutes(){ var d=new Date(); return d.getHours()*60+d.getMinutes(); }
  function currentStep(mode){
    var f=FICHES[mode]; if(!f) return null;
    var nm=nowMinutes(), cur=null;
    f.tl.forEach(function(s){ if(nm>=s[3]) cur=s; });
    return cur;
  }
  function renderFiches(){
    var host=$("fichesHost"); if(!host) return;
    host.innerHTML="";
    ["ouverture","fermeture"].forEach(function(m){
      var f=FICHES[m], cur=currentStep(m);
      var el=document.createElement("div"); el.className="fiche"; el.id="fiche-"+m;
      el.innerHTML=
        '<span class="fiche-badge">'+f.badge+'</span>'+
        '<h2>'+f.title+'</h2>'+
        '<div class="fiche-motto">'+f.motto+'</div>'+
        '<div class="fiche-steps">'+f.steps.map(function(s){ return '<div class="fiche-step"><b>'+s[0]+'</b><span>'+s[1]+'</span></div>'; }).join("")+'</div>'+
        '<ul class="tl">'+f.tl.map(function(s){
          return '<li'+(cur===s?' class="now"':'')+'><span class="tl-time">'+s[0]+'</span><div class="tl-t">'+s[1]+'</div><div class="tl-d">'+s[2]+'</div></li>';
        }).join("")+'</ul>'+
        '<div class="fiche-note">'+f.note+'</div>';
      host.appendChild(el);
    });
  }
  function updateNowHint(){
    var el=$("nowHint"); if(!el) return;
    var cur=state.reopen?null:currentStep(state.mode);
    if(cur){ el.style.display="flex"; el.innerHTML='<b>'+cur[0]+'</b><span>'+cur[1]+' &rsaquo;</span>'; }
    else el.style.display="none";
  }

  function encouragement(pct,done){''',
'JS fiches + étape courante')

# ---------- 7. JS : le rappel horaire suit le héros ----------
rep(
'''    var s=currentStreak(cfg.site);
    if(s>0){ $("streakBox").style.display="inline-flex"; $("streakTxt").textContent=s+" j à 100%"; }
    else $("streakBox").style.display="none";
  }''',
'''    var s=currentStreak(cfg.site);
    if(s>0){ $("streakBox").style.display="inline-flex"; $("streakTxt").textContent=s+" j à 100%"; }
    else $("streakBox").style.display="none";
    updateNowHint();
  }''',
'updateNowHint dans updateHero')

# ---------- 8. JS : la vue fiches se rend au changement d'onglet ----------
rep(
'''    if(v==="calendrier") renderCalendar();''',
'''    if(v==="calendrier") renderCalendar();
    if(v==="fiches") renderFiches();''',
'switchView fiches')

# ---------- 9. JS : listeners (réorganiser, rappel horaire, rafraîchissement) ----------
rep(
'''    $("exportCsv").addEventListener("click",exportCsv);''',
'''    $("exportCsv").addEventListener("click",exportCsv);
    $("reorderToggle").addEventListener("click",function(){
      var on=document.body.classList.toggle("reordering");
      this.textContent=on?"Terminer la r\\u00e9organisation":"R\\u00e9organiser les gestes";
      this.classList.toggle("btn-primary",on);
      this.classList.toggle("btn-tertiary",!on);
      if(!on){ render(); updateHero(); showToast("Ordre enregistr\\u00e9",true); }
    });
    $("nowHint").addEventListener("click",function(){
      switchView("fiches");
      var t=$("fiche-"+state.mode);
      if(t) t.scrollIntoView({behavior:"smooth",block:"start"});
    });
    setInterval(function(){ updateNowHint(); if($("view-fiches").classList.contains("active")) renderFiches(); },60000);''',
'listeners réorganiser + rappel')

open('public/index.html', 'w', encoding='utf-8').write(src)
print('public/index.html écrit :', len(src), 'caractères')
