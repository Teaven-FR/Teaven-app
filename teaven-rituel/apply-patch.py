# Applique la mise à jour v6.3.0 sur l'index.html téléchargé depuis la production.
# Chaque remplacement est vérifié : occurrence unique obligatoire, sinon échec du build.
import sys

src = open('index-prod.html', encoding='utf-8').read()

# Déjà patché (re-build après mise en ligne) : copie telle quelle
if 'makeDraggable' in src:
    open('public/index.html', 'w', encoding='utf-8').write(src)
    print('index.html déjà en v6.3.0 — copie telle quelle')
    sys.exit(0)

def rep(old, new, label):
    global src
    n = src.count(old)
    if n != 1:
        sys.exit(f'ECHEC [{label}] : {n} occurrence(s) au lieu de 1')
    src = src.replace(old, new)
    print(f'ok  {label}')

# ---------- 1. CSS : poignée de drag à la place des boutons monter/descendre ----------
rep(
'''  .move{display:none;flex-direction:column;gap:2px;flex:0 0 auto;}
  body.editing .task .move{display:flex;}
  .move button{width:30px;height:20px;border:1px solid var(--line);background:var(--card);border-radius:var(--radius-sm);
    font-size:9px;line-height:1;color:var(--texte-doux);padding:0;display:grid;place-items:center;}
  .move button:disabled{opacity:.3;}''',
'''  .drag{display:none;width:40px;height:44px;margin:-8px 0 -8px -8px;flex:0 0 auto;place-items:center;
    color:var(--texte-tres-doux);cursor:grab;touch-action:none;border-radius:var(--radius-sm);padding:0;
    transition:color var(--dur-fast) var(--ease-out);}
  body.editing .task .drag{display:grid;}
  .drag:hover,.drag:focus-visible{color:var(--green);}
  .drag:active{cursor:grabbing;}
  .drag svg{width:17px;height:17px;pointer-events:none;}
  .task.dragging{background:var(--card);border:1px solid var(--vert-line);border-bottom:1px solid var(--vert-line);
    border-radius:var(--radius);box-shadow:var(--shadow-md);z-index:100;}
  .task-ph{margin:0 -8px;border:1.5px dashed var(--vert-line);border-radius:var(--radius);background:var(--vert-soft);opacity:.65;}
  .edit-hint{display:none;align-items:flex-start;gap:10px;background:var(--vert-soft);border:1px solid var(--vert-line);
    border-radius:var(--radius);padding:var(--s3) var(--s4);margin-bottom:var(--s5);font-size:13.5px;font-weight:600;
    color:var(--vert-fonce);line-height:1.5;}
  .edit-hint svg{width:16px;height:16px;flex:0 0 auto;margin-top:2px;}
  body.editing .edit-hint{display:flex;}
  body.editing #validateBtn{display:none;}''',
'CSS drag + hint')

# ---------- 2. CSS : le + d'ajout devient un vrai bouton, zone de tap élargie ----------
rep(
'''  .add-plus{width:24px;height:24px;flex:0 0 auto;display:grid;place-items:center;color:var(--green);}
  .add-plus svg{width:18px;height:18px;}''',
'''  .add-plus{width:44px;height:44px;margin:-10px;flex:0 0 auto;display:grid;place-items:center;color:var(--green);
    padding:0;border-radius:var(--radius-sm);transition:color var(--dur-fast) var(--ease-out);}
  .add-plus:hover{color:var(--vert-fonce);}
  .add-plus svg{width:18px;height:18px;pointer-events:none;}''',
'CSS bouton +')

# ---------- 3. HTML : encart d'aide du mode édition, au-dessus des sections ----------
rep(
'''    <div id="sectionsHost"></div>''',
'''    <div class="edit-hint" id="editHint">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5.5" r="1.7"/><circle cx="15" cy="5.5" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18.5" r="1.7"/><circle cx="15" cy="18.5" r="1.7"/></svg>
      <span>Maintenez la poign&eacute;e d&rsquo;un geste et glissez-le pour le d&eacute;placer dans la liste. Le + ou Entr&eacute;e ajoute un geste.</span>
    </div>
    <div id="sectionsHost"></div>''',
'HTML encart aide')

# ---------- 4. Icône poignée ----------
rep(
'''  var PLUS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';''',
'''  var PLUS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  var GRIP='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5.5" r="1.7"/><circle cx="15" cy="5.5" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18.5" r="1.7"/><circle cx="15" cy="18.5" r="1.7"/></svg>';

  /* Retour haptique discret (Android ; iOS ignore silencieusement) */
  function buzz(ms){ if(navigator.vibrate){ try{ navigator.vibrate(ms); }catch(e){} } }
  var pendingFocusAdd=null, pendingFocusHandle=null;''',
'icône GRIP + buzz + focus différés')

# ---------- 5. Rendu de la ligne : data-id + poignée à la place des deux boutons ----------
rep(
'''        var el=document.createElement("div");
        el.className="task"+(done?" done":"");''',
'''        var el=document.createElement("div");
        el.className="task"+(done?" done":"");
        el.setAttribute("data-id",it.id);''',
'data-id sur la ligne')

rep(
'''          '<div class="move"><button data-up aria-label="Monter">&#9650;</button><button data-down aria-label="Descendre">&#9660;</button></div>'+''',
'''          '<div class="drag" role="button" tabindex="0" aria-label="R&eacute;ordonner ce geste (glisser, ou fl&egrave;ches haut et bas)">'+GRIP+'</div>'+''',
'HTML poignée')

rep(
'''        el.querySelector("[data-up]").addEventListener("click",function(e){ e.stopPropagation(); moveItem(sec,ii,-1); });
        el.querySelector("[data-down]").addEventListener("click",function(e){ e.stopPropagation(); moveItem(sec,ii,1); });
        if(ii===0) el.querySelector("[data-up]").disabled=true;
        if(ii===sec.items.length-1) el.querySelector("[data-down]").disabled=true;''',
'''        makeDraggable(el.querySelector(".drag"),el,listEl,sec,ii);''',
'branchement drag')

# ---------- 6. Haptique au cochage ----------
rep(
'''        function toggle(){
          if(document.body.classList.contains("editing")) return;
          if(c[it.id]) delete c[it.id]; else c[it.id]=true;
          persistChecks(); render(); updateHero();
        }''',
'''        function toggle(){
          if(document.body.classList.contains("editing")) return;
          if(c[it.id]) delete c[it.id]; else c[it.id]=true;
          buzz(8);
          persistChecks(); render(); updateHero();
        }''',
'haptique cochage')

# ---------- 7. Titre de section : Entrée valide aussi ----------
rep(
'''      titleInput.addEventListener("blur",function(){ var v=titleInput.value.trim(); if(v){sec.section=v;saveCfg();} else {titleInput.value=sec.section;} });''',
'''      titleInput.addEventListener("blur",function(){ var v=titleInput.value.trim(); if(v){sec.section=v;saveCfg();} else {titleInput.value=sec.section;} });
      titleInput.addEventListener("keydown",function(e){ if(e.key==="Enter") titleInput.blur(); });''',
'Entrée sur titre de section')

# ---------- 8. Ajout de geste : bouton + cliquable, refocus pour enchaîner ----------
rep(
'''        '<div class="add-line"><span class="add-plus">'+PLUS+'</span><input type="text" placeholder="Ajouter un geste" aria-label="Ajouter un geste" /></div>';''',
'''        '<div class="add-line"><button class="add-plus" aria-label="Ajouter ce geste">'+PLUS+'</button><input type="text" placeholder="Ajouter un geste" aria-label="Ajouter un geste" /></div>';''',
'HTML bouton +')

rep(
'''      var addInput=secEl.querySelector(".add-line input");
      addInput.addEventListener("keydown",function(e){
        if(e.key==="Enter"){ var v=addInput.value.trim(); if(v){ sec.items.push({id:newId(),label:v}); saveCfg(); render(); updateHero(); } }
      });''',
'''      var addInput=secEl.querySelector(".add-line input");
      function addGesture(){
        var v=addInput.value.trim();
        if(!v){ addInput.focus(); return; }
        sec.items.push({id:newId(),label:v}); saveCfg();
        pendingFocusAdd=sec.id;
        render(); updateHero(); buzz(8);
      }
      addInput.addEventListener("keydown",function(e){ if(e.key==="Enter") addGesture(); });
      secEl.querySelector(".add-plus").addEventListener("click",addGesture);''',
'logique ajout geste')

# secEl identifiable pour le refocus
rep(
'''      var secEl=document.createElement("div");
      secEl.className="sec"+(collapsed?" collapsed":"")+(complete?" complete":"");''',
'''      var secEl=document.createElement("div");
      secEl.className="sec"+(collapsed?" collapsed":"")+(complete?" complete":"");
      secEl.setAttribute("data-sec-id",sec.id);''',
'data-sec-id')

# ---------- 9. Fin de render : focus différés + makeDraggable ----------
rep(
'''      host.appendChild(secEl);
    });
  }''',
'''      host.appendChild(secEl);
    });
    if(pendingFocusAdd){
      var fa=host.querySelector('.sec[data-sec-id="'+pendingFocusAdd+'"] .add-line input');
      pendingFocusAdd=null;
      if(fa) fa.focus();
    }
    if(pendingFocusHandle){
      var fh=host.querySelector('.task[data-id="'+pendingFocusHandle+'"] .drag');
      pendingFocusHandle=null;
      if(fh) fh.focus();
    }
  }

  /* ------- Réordonnancement : glisser-déposer par la poignée (tactile et souris) -------
     La ligne saisie passe en position fixe sous le doigt, un emplacement en pointillés
     suit la position cible, la page défile toute seule près des bords. Les flèches
     haut/bas sur la poignée restent disponibles au clavier. */
  var dragActive=false;
  function makeDraggable(handle,el,listEl,sec,ii){
    if(!handle) return;
    handle.addEventListener("keydown",function(e){
      if(e.key==="ArrowUp"||e.key==="ArrowDown"){
        e.preventDefault();
        pendingFocusHandle=el.getAttribute("data-id");
        moveItem(sec,ii,e.key==="ArrowUp"?-1:1);
      }
    });
    handle.addEventListener("pointerdown",function(e){
      if(dragActive) return;
      if(e.button!==undefined && e.button>0) return;
      dragActive=true;
      e.preventDefault();
      var rect=el.getBoundingClientRect();
      var grabDY=e.clientY-rect.top;
      var ph=document.createElement("div"); ph.className="task-ph"; ph.style.height=rect.height+"px";
      listEl.insertBefore(ph,el.nextSibling);
      el.classList.add("dragging");
      el.style.position="fixed"; el.style.left=rect.left+"px"; el.style.top=rect.top+"px";
      el.style.width=rect.width+"px"; el.style.margin="0";
      try{ handle.setPointerCapture(e.pointerId); }catch(err){}
      buzz(10);
      var lastY=e.clientY, raf=null, live=true;
      function place(){
        el.style.top=(lastY-grabDY)+"px";
        var kids=[].slice.call(listEl.children), target=null;
        for(var i=0;i<kids.length;i++){
          var n=kids[i];
          if(n===el||n===ph||!n.classList.contains("task")) continue;
          var r=n.getBoundingClientRect();
          if(lastY < r.top + r.height/2){ target=n; break; }
        }
        if(target){ if(ph.nextSibling!==target) listEl.insertBefore(ph,target); }
        else if(listEl.lastElementChild!==ph) listEl.appendChild(ph);
      }
      function loop(){
        if(!live) return;
        var speed=0, top=130, bottom=window.innerHeight-110;
        if(lastY<top) speed=-Math.min(16,(top-lastY)/3);
        else if(lastY>bottom) speed=Math.min(16,(lastY-bottom)/3);
        if(speed){ window.scrollBy(0,speed); place(); }
        raf=requestAnimationFrame(loop);
      }
      raf=requestAnimationFrame(loop);
      function onMove(ev){ lastY=ev.clientY; place(); }
      function finish(){
        live=false; if(raf) cancelAnimationFrame(raf);
        handle.removeEventListener("pointermove",onMove);
        handle.removeEventListener("pointerup",finish);
        handle.removeEventListener("pointercancel",finish);
        el.classList.remove("dragging");
        el.style.position="";el.style.left="";el.style.top="";el.style.width="";el.style.margin="";
        listEl.insertBefore(el,ph); ph.remove();
        dragActive=false;
        var order=[].slice.call(listEl.querySelectorAll(".task")).map(function(n){ return n.getAttribute("data-id"); });
        sec.items.sort(function(a,b){ return order.indexOf(a.id)-order.indexOf(b.id); });
        saveCfg(); render(); updateHero(); buzz(8);
      }
      handle.addEventListener("pointermove",onMove);
      handle.addEventListener("pointerup",finish);
      handle.addEventListener("pointercancel",finish);
      place();
    });
  }''',
'fin de render + makeDraggable')

# ---------- 10. Bouton "Modifier la liste" : devient le bouton principal en mode édition ----------
rep(
'''    $("editToggle").addEventListener("click",function(){ var on=document.body.classList.toggle("editing"); this.textContent=on?"Terminer la modification":"Modifier la liste"; if(!on){ render(); updateHero(); } });''',
'''    $("editToggle").addEventListener("click",function(){
      var on=document.body.classList.toggle("editing");
      this.textContent=on?"Terminer la modification":"Modifier la liste";
      this.classList.toggle("btn-primary",on);
      this.classList.toggle("btn-tertiary",!on);
      if(!on){ render(); updateHero(); }
    });''',
'bouton édition principal')

open('public/index.html', 'w', encoding='utf-8').write(src)
print('public/index.html écrit :', len(src), 'caractères')
