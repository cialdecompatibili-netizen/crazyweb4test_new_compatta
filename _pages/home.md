---
layout: about
title: Home
permalink: /
nav: true
nav_order: 0.3

selected_papers: false # includes a list of papers marked as "selected={true}"
social: true # includes social icons at the bottom of the page

announcements:
  enabled: false # TEMPORANEO: news spente in home. Per riattivarle: true (e togli 'news' da 'off' in admin/admin.js + class="off" in admin/index.html)
  scrollable: true # adds a vertical scroll bar if there are more than 3 news items
  limit: 5 # leave blank to include all the news in the `_news` folder

latest_posts:
  enabled: true
  scrollable: true # adds a vertical scroll bar if there are more than 3 new posts items
  limit: 3 # leave blank to include all the blog posts
seo_title: "{title} | Smart Web Agency"
seo_description: "Web agency a Roma dal 2013: siti web, e-commerce, SEO, Google Ads e brand identity su misura per imprenditori, start up e PA. Prima consulenza gratuita, risposta entro 24 ore."
---

<style>
.post-header{display:none}
.rete-box{position:relative;overflow:visible;isolation:isolate;text-align:center;width:100%;max-width:none;margin:0;padding:3rem 0}
.rete-box canvas{position:absolute;inset:0;width:100%;height:100%;z-index:-1;display:block;pointer-events:none}
.rete-box > *{position:relative}
.rete-box h2{margin-top:0}
/* ===== MARTE START (css) - INTERRUTTORE: home_marte in _config.yml (admin > Impostazioni, CLAUDE.md punto 27). HTML e JS sono dentro una condizione Liquid su site.home_marte: tieni START/END e i relativi if/endif in coppia, altrimenti la home si rompe senza errori. Per rimuovere Marte del tutto: cancella da qui a MARTE END (css), il blocco MARTE nell'HTML, lo script MARTE (js) e assets/img/marte.webp ===== */
.rete-box .marte-orbita{position:absolute;z-index:-2;pointer-events:none;left:50%;top:50%;width:0;height:0;will-change:transform}
.rete-box .marte-orbita .marte-y{position:absolute;left:0;top:0;width:0;height:0;will-change:transform}
.rete-box .marte{position:absolute;--mt:clamp(72px,10vw,104px);width:var(--mt);height:var(--mt);
  left:calc(var(--mt) / -2);top:calc(var(--mt) / -2);border-radius:50%;display:block;
  opacity:.6;filter:saturate(.85);box-shadow:0 0 34px 10px rgba(150,150,158,.10)}
html[data-theme=dark] .rete-box .marte{opacity:.66;box-shadow:0 0 34px 10px rgba(150,150,160,.07)}
@media (max-width:600px){.rete-box .marte{--mt:17vw}}
/* ===== MARTE END (css) ===== */

/* ===== SERVIZI HOME (nuova sezione, sotto il box costellazione) =====
   Semplice griglia di 6 card che riprendono i PRIMI 6 servizi di _pages/servizi.md,
   con link "Vedi tutti i servizi" verso /servizi/. Nessun altro blocco esistente toccato.
   Per aggiungere/rimuovere una card: duplica/elimina un .srv-home-card qui sotto e nell'HTML. */
.srv-home{margin:2.5rem 0}
.srv-home h2{text-align:center;margin-bottom:1.4rem}
.srv-home-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:900px;margin:0 auto}
.srv-home-card{display:block;color:inherit;text-decoration:none;padding:16px 18px;border:1px solid rgba(0,0,0,.12);border-radius:12px;background:#fffdf5;text-align:left}
.srv-home-card b{display:block;margin-bottom:4px}
.srv-home-card small{opacity:.65;display:block}
html[data-theme="dark"] .srv-home-card{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15)}
.srv-home-more{text-align:center;margin-top:1.6rem}
.srv-home-more a{display:inline-block;padding:.55rem 1.4rem;border-radius:999px;border:1px solid rgba(0,0,0,.2);text-decoration:none;font-weight:600}
html[data-theme="dark"] .srv-home-more a{border-color:rgba(255,255,255,.3)}
@media (max-width:700px){.srv-home-grid{grid-template-columns:1fr}}

/* ===== PROGETTI HOME (sotto i servizi) =====
   Stesso aspetto della griglia servizi, classi separate (prj-home*) di proposito: gli script che riallineano le card
   dei servizi (pubblica_servizi.py) lavorano su .srv-home-card e non devono mai toccare queste.
   Le card NON sono scritte a mano: le genera il ciclo Liquid nell'HTML qui sotto dai file di _projects/. */
.prj-home{margin:2.5rem 0}
.prj-home h2{text-align:center;margin-bottom:1.4rem}
.prj-home-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:900px;margin:0 auto}
.prj-home-card{display:block;color:inherit;text-decoration:none;padding:16px 18px;border:1px solid rgba(0,0,0,.12);border-radius:12px;background:#fffdf5;text-align:left}
.prj-home-card b{display:block;margin-bottom:4px}
.prj-home-card small{opacity:.65;display:block}
html[data-theme="dark"] .prj-home-card{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15)}
.prj-home-more{text-align:center;margin-top:1.6rem}
.prj-home-more a{display:inline-block;padding:.55rem 1.4rem;border-radius:999px;border:1px solid rgba(0,0,0,.2);text-decoration:none;font-weight:600}
html[data-theme="dark"] .prj-home-more a{border-color:rgba(255,255,255,.3)}
@media (max-width:700px){.prj-home-grid{grid-template-columns:1fr}}
</style>

<div class="rete-box" id="rete-box" markdown="1">
<!-- ===== MARTE START (html) - interruttore: home_marte in _config.yml (admin > Impostazioni). Se false non esce ne' l'HTML ne' lo script ===== -->
{%- if site.home_marte != false %}<div class="marte-orbita" aria-hidden="true"><div class="marte-y"><canvas class="marte" width="208" height="208" aria-hidden="true"></canvas></div></div>{% endif %}
<!-- ===== MARTE END (html) ===== -->
<canvas id="rete-cv" aria-hidden="true"></canvas>

## Web Agency a Roma dal 2013, al fianco della crescita del tuo business.

Comunicazione, web marketing e sviluppo di piattaforme digitali: aiutiamo imprenditori, start up e grandi aziende a crescere, nel privato come nella Pubblica Amministrazione. Ogni progetto nasce da un'analisi su misura del business e degli obiettivi, combinando creatività e concretezza per ottenere risultati misurabili.

Un team unico di professionisti coordina ogni fase, dalla strategia al risultato: siti, e-commerce, campagne, brand identity e applicativi su misura. Rispondiamo entro 24 ore, festivi esclusi, e la prima consulenza è gratuita.

**Vuoi far crescere il tuo business?** Scrivici su WhatsApp o richiedi un preventivo: costruiamo insieme la soluzione giusta per te.

</div>

<!-- ===== SERVIZI HOME START (DINAMICO) =====
     Le card NON sono scritte a mano: il ciclo Liquid prende i documenti della collection 'servizi' con 'in_home: true' (casetta nell'admin, sezione Servizi).
     Campo SEPARATO dalla stella del blog ('featured'): non si mescolano. Ordine alfabetico per titolo (i post hanno la stessa data, per data l'ordine non sarebbe stabile).
     Titolo, descrizione (tagliata a 8 parole) e link vengono dal post. Se nessun servizio ha la casetta la sezione sparisce. NON rimettere card a mano. ===== -->
{%- assign srv_home = site.servizi | where: 'in_home', 'true' | sort: 'title' -%}
{%- if srv_home.size > 0 %}
<div class="srv-home">
  <h2>I nostri servizi</h2>
  <div class="srv-home-grid">
    {%- for p in srv_home -%}
    <a class="srv-home-card" href="{{ p.url | relative_url }}"><b>{{ p.title | escape }}</b>{% if p.description != blank %}<small>{{ p.description | truncatewords: 8 | escape }}</small>{% endif %}</a>
    {%- endfor %}
  </div>
  <div class="srv-home-more">
    <a href="{{ '/servizi/' | relative_url }}">Vedi tutti i servizi</a>
  </div>
</div>
{%- endif %}
<!-- ===== SERVIZI HOME END ===== -->

<!-- ===== PROGETTI HOME START =====
     DINAMICO: prende da solo i primi 6 progetti di _projects/ (nessuna card scritta a mano).
     Ordine = campo 'importance' del progetto (1 = per primo), come nella pagina /projects/; chi non ha 'importance' va in fondo.
     Link: se il progetto ha 'redirect:' (sito esterno) punta li', altrimenti alla sua pagina.
     Un progetto nuovo/modificato/eliminato si riflette qui al prossimo deploy, senza toccare questo file.
     Casetta nell'admin (lista Progetti, campo 'in_home: true'): se almeno un progetto ce l'ha, in home vanno SOLO quelli marcati (tutti); se nessuno e' marcato, ripiego sui primi 6 per importance. Se non ci sono progetti la sezione sparisce. ===== -->
{%- assign prj_home = site.projects | where: 'in_home', 'true' | sort: 'importance', 'last' -%}
{%- assign prj_limit = prj_home.size -%}
{%- if prj_home.size == 0 -%}{%- assign prj_home = site.projects | sort: 'importance', 'last' -%}{%- assign prj_limit = 6 -%}{%- endif -%}
{%- if prj_home.size > 0 %}
<div class="prj-home">
  <h2>I nostri progetti</h2>
  <div class="prj-home-grid">
    {%- for p in prj_home limit: prj_limit -%}
      {%- assign p_ext = false -%}
      {%- if p.redirect contains '://' -%}{%- assign p_ext = true -%}{%- endif -%}
    <a class="prj-home-card" href="{% if p_ext %}{{ p.redirect }}{% else %}{{ p.url | relative_url }}{% endif %}"{% if p_ext %} target="_blank" rel="noopener"{% endif %}><b>{{ p.title | escape }}</b>{% if p.description != blank %}<small>{{ p.description | escape }}</small>{% endif %}</a>
    {%- endfor %}
  </div>
  <div class="prj-home-more">
    <a href="{{ '/projects/' | relative_url }}">Vedi tutti i progetti</a>
  </div>
</div>
{%- endif %}
<!-- ===== PROGETTI HOME END ===== -->

{%- if site.home_marte != false %}
<script>
/* ===== MARTE START (js) =====
   COME FUNZIONA (3 pezzi indipendenti):
   1. MOTO nel box: due animazioni CSS (Web Animations API) su assi diversi, con periodi diversi (PX/PY),
      cosi' il percorso non si ripete mai uguale. Solo transform -> leggero, niente reflow.
   2. ROTAZIONE: Marte e' un <canvas> disegnato a mano pixel per pixel. Non e' una foto che scorre:
      ogni pixel del disco viene mappato su una sfera 3D e colorato dalla mappa piatta di Marte (marte.webp).
   3. PERSISTENZA: un solo timestamp (t0) in localStorage. Posizione e rotazione derivano da (adesso - t0),
      quindi dopo un refresh riprendono da dove erano, senza salvare nient'altro.
   Per togliere Marte: vedi le istruzioni nel blocco CSS. */
(function(){
  var o=document.querySelector('.marte-orbita'); if(!o) return;
  var y=o.querySelector('.marte-y'), cv=o.querySelector('.marte'); if(!y||!cv) return;
  var ridotto=false /* ignorato di proposito: animazione lenta e minima, deve partire sempre (era matchMedia prefers-reduced-motion) */;
  /* PARAMETRI DA RITOCCARE (in millisecondi):
     PX = periodo del moto orizzontale (andata+ritorno = 2*PX)   PY = idem verticale (diverso da PX di proposito)
     GIRO = tempo di un giro completo di Marte su se stesso (45000 = 45 s; piu' basso = piu' veloce)
     K = chiave localStorage. ATTENZIONE: piu' sotto, dentro img.onload, c'e' un'altra variabile PX
     (array della sfera) che nel suo scope nasconde questa: e' voluto e funziona, ma non usare PX/PY
     del periodo dentro onload. */
  var PX=173000, PY=131000, GIRO=45000, K='marte_t0';
  /* t0 = istante in cui e' iniziata l'"orbita". Se manca (prima visita) lo creo ora. Il try/catch serve
     perche' in navigazione privata o con storage bloccato setItem lancia errore: in quel caso Marte
     funziona lo stesso, semplicemente riparte da zero a ogni refresh. */
  var t0=parseInt(localStorage.getItem(K),10); if(!t0||isNaN(t0)){ t0=Date.now(); try{localStorage.setItem(K,t0);}catch(e){} }
  /* ampiezza dello spostamento orizzontale in vw: ridotta su telefono per non uscire dal box */
  function amp(){ return matchMedia('(max-width:600px)').matches?26:36; }
  function moto(){
    /* prefers-reduced-motion: chi ha "riduci movimento" attivo nel sistema vede Marte fermo */
    if(ridotto) return; var el=Date.now()-t0, ax=amp()+'vw';
    /* cancello le animazioni precedenti: senza questo, dopo un resize se ne accumulerebbero di sovrapposte */
    /* Sfasamento: currentTime = tempo trascorso modulo l'intero ciclo andata+ritorno (2*periodo).
       E' il trucco che fa riprendere la posizione dopo il refresh. */
    o.getAnimations().concat(y.getAnimations()).forEach(function(a){a.cancel();});
    o.animate([{transform:'translateX(-'+ax+')'},{transform:'translateX('+ax+')'}],{duration:PX,iterations:Infinity,direction:'alternate',easing:'ease-in-out'}).currentTime=el%(PX*2);
    y.animate([{transform:'translateY(-110px)'},{transform:'translateY(110px)'}],{duration:PY,iterations:Infinity,direction:'alternate',easing:'ease-in-out'}).currentTime=el%(PY*2);
  }
  /* al resize riparto dopo 300 ms di quiete (debounce) per non ricalcolare a ogni pixel trascinato */
  moto(); var to; addEventListener('resize',function(){clearTimeout(to);to=setTimeout(moto,300);});
  /* S = raggio in pixel del canvas: il disegno e' a 208x208 (2*S) ed e' ridimensionato via CSS, cosi' resta nitido
     sugli schermi ad alta densita'. Aumentarlo migliora la qualita' ma il costo cresce col quadrato. */
  var S=104, img=new Image(); cv.width=S*2; cv.height=S*2;
  /* Tutto il resto parte solo a immagine caricata. Leggo i pixel della mappa UNA volta in un canvas
     di appoggio (getImageData): rileggerli a ogni frame sarebbe lentissimo. */
  img.onload=function(){
    var tc=document.createElement('canvas'); tc.width=img.width; tc.height=img.height; var tx=tc.getContext('2d'); tx.drawImage(img,0,0);
    var T=tx.getImageData(0,0,tc.width,tc.height).data, TW=tc.width, TH=tc.height;
    var g=cv.getContext('2d'), N=S*2, out=g.createImageData(N,N), D=out.data;
    /* sfera vera: per ogni pixel del disco calcolo il punto 3D, lo riporto nel sistema del pianeta
       (asse polare inclinato di TILT) e da li ricavo longitudine/latitudine sulla mappa. */
    /* TILT: inclinazione dell'asse polare (Marte reale ~25). 0 = poli esattamente in alto/in basso.
       cT/sT = coseno e seno precalcolati, perche' servono per ogni pixel. */
    var TILT=25*Math.PI/180, cT=Math.cos(TILT), sT=Math.sin(TILT);
    /* direzione della luce (vettore normalizzato): da alto-sinistra e leggermente frontale.
       Il lato in ombra non e' mai nero (vedi fattore k in frame): il pianeta resta leggibile. */
    var LX=-.55, LY=.45, LZ=.70, LL=Math.sqrt(LX*LX+LY*LY+LZ*LZ); LX/=LL; LY/=LL; LZ/=LL;   /* luce da alto-sinistra */
    /* PRECALCOLO (una volta sola): per ogni pixel del disco salvo il punto 3D ruotato (PX,PY,PZ) e la luce (SH).
       SH=-1 segna i pixel fuori dal cerchio (trasparenti). Cosi' frame() non rifa' la geometria a ogni giro. */
    var PX=new Float32Array(N*N), PY=new Float32Array(N*N), PZ=new Float32Array(N*N), SH=new Float32Array(N*N);
    for(var yy=0;yy<N;yy++)for(var xx=0;xx<N;xx++){
      var nx=(xx+.5-S)/S, ny=(S-yy-.5)/S, r2=nx*nx+ny*ny, i=yy*N+xx;
      if(r2>1){SH[i]=-1;continue;}
      /* nz = profondita' del punto sulla sfera (equazione della sfera: x^2+y^2+z^2=1) */
      var nz=Math.sqrt(1-r2);
      /* rotazione inversa attorno all'asse X = inclinazione dell'asse polare rispetto alla verticale dello schermo */
      PX[i]=nx; PY[i]=ny*cT+nz*sT; PZ[i]=-ny*sT+nz*cT;
      var d=nx*LX+ny*LY+nz*LZ; SH[i]=Math.max(0,d);
    }
    /* frame(ph): disegna un fotogramma. ph = fase di rotazione in radianti (0..2*PI).
       QUESTO e' il punto piu' critico per le prestazioni: gira ogni ~50 ms su ~34.000 pixel.
       Regole se lo modifichi: niente allocazioni qui dentro, niente Math.* inutili, tutto il resto va nel precalcolo. */
    function frame(ph){
      for(var i=0;i<N*N;i++){ var q=i*4;
        if(SH[i]<0){D[q+3]=0;continue;}
        /* longitudine = angolo attorno all'asse polare. Aggiungere ph e' l'UNICA cosa che fa ruotare il pianeta.
           latitudine = quanto in alto/basso; il clamp evita NaN per errori di arrotondamento oltre +-1. */
        var lon=Math.atan2(PX[i],PZ[i])+ph, lat=Math.asin(Math.max(-1,Math.min(1,PY[i])));
        /* u = coordinata orizzontale nella mappa (0..1), avvolta in modo che la mappa chiuda il ciclo senza cucitura */
        var u=lon/6.283185307; u-=Math.floor(u);
        var v=(.5-lat/Math.PI)*(TH-1);
        /* interpolazione bilineare: media pesata dei 4 pixel della mappa attorno al punto. Senza, il pianeta
           apparirebbe a scatti/pixelato mentre ruota. x1=(x0+1)%TW fa "girare" il bordo destro sul sinistro. */
        var xf=u*(TW-1), x0=xf|0, x1=(x0+1)%TW, fx=xf-x0, y0=v|0, y1=Math.min(TH-1,y0+1), fy=v-y0;
        var a=(y0*TW+x0)*4, b=(y0*TW+x1)*4, c=(y1*TW+x0)*4, e=(y1*TW+x1)*4;
        /* luminosita': minimo 30% (lato in ombra ancora visibile) fino a 100%; l'esponente .75 ammorbidisce il passaggio */
        var k=.30+.70*Math.pow(SH[i],.75);
        for(var ch=0;ch<3;ch++){
          var top=T[a+ch]*(1-fx)+T[b+ch]*fx, bot=T[c+ch]*(1-fx)+T[e+ch]*fx;
          D[q+ch]=(top*(1-fy)+bot*fy)*k;
        }
        D[q+3]=255; }
      g.putImageData(out,0,0);
    }
    /* ANIMAZIONE: requestAnimationFrame, ma ridisegno solo ogni 50 ms (~20 fps): per una rotazione lenta
       basta e dimezza il consumo di CPU/batteria. `last` = istante dell'ultimo disegno. */
    var last=0;
    (function tick(now){
      /* la fase dipende dal TEMPO REALE (Date.now()-t0), non da un contatore: e' cosi' che dopo un refresh o un
         tab in background Marte e' dove deve essere, senza scatti ne' salti */
      var ph=((Date.now()-t0)%GIRO)/GIRO*6.283185307;   /* fase legata al tempo: dopo il refresh riprende da dove era */
      /* con riduci-movimento disegno un solo fotogramma fisso (il ramo else-if) e non richiedo altri frame */
      if(!ridotto&&now-last>50){ frame(ph); last=now; } else if(!last){ frame(ph); last=now; }
      if(!ridotto) requestAnimationFrame(tick);
    })(0);
  };
  img.src="{{ '/assets/img/marte.webp' | relative_url }}";
})();
/* ===== MARTE END (js) ===== */
</script>
{%- endif %}

<script>
(function(){
  var box=document.getElementById('rete-box'), cv=document.getElementById('rete-cv'); if(!box||!cv) return;
  var ctx=cv.getContext('2d'), ridotto=false /* ignorato di proposito: animazione lenta e minima, deve partire sempre (era matchMedia prefers-reduced-motion) */;
  var punti=[], w=0, h=0, mouse={x:0,y:0,on:false}, raf=null, visibile=true;
  var DIST=140, DIST_M=190;
  function colore(){
    return document.documentElement.getAttribute('data-theme')==='dark' ? '105,105,115' : '150,150,160';
  }
  function dim(){
    var dpr=Math.min(devicePixelRatio||1,2); w=box.clientWidth; h=box.clientHeight;
    cv.width=w*dpr; cv.height=h*dpr; cv.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
    var n=Math.round(Math.min(100,Math.max(34,(w*h)/7500))); punti=[];
    for(var i=0;i<n;i++) punti.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,r:1.3+Math.random()*1.5});
  }
  function disegna(){
    ctx.clearRect(0,0,w,h); var c=colore();
    for(var i=0;i<punti.length;i++){
      var a=punti[i];
      if(!ridotto){ a.x+=a.vx; a.y+=a.vy; if(a.x<0||a.x>w)a.vx*=-1; if(a.y<0||a.y>h)a.vy*=-1; }
      for(var j=i+1;j<punti.length;j++){
        var b=punti[j], dx=a.x-b.x, dy=a.y-b.y, d=Math.sqrt(dx*dx+dy*dy);
        if(d<DIST){ ctx.strokeStyle='rgba('+c+','+(0.55*(1-d/DIST)).toFixed(3)+')'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
      }
      if(mouse.on){ var mx=a.x-mouse.x,my=a.y-mouse.y,md=Math.sqrt(mx*mx+my*my);
        if(md<DIST_M){ ctx.strokeStyle='rgba('+c+','+(0.75*(1-md/DIST_M)).toFixed(3)+')'; ctx.lineWidth=1.1;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(mouse.x,mouse.y); ctx.stroke(); } }
      ctx.fillStyle='rgba('+c+',0.7)'; ctx.beginPath(); ctx.arc(a.x,a.y,a.r,0,6.2832); ctx.fill();
    }
  }
  function ciclo(){ disegna(); raf=(visibile&&!ridotto)?requestAnimationFrame(ciclo):null; }
  function avvia(){ if(!raf) raf=requestAnimationFrame(ciclo); }
  box.addEventListener('pointermove',function(e){ if(e.pointerType==='touch')return; var r=box.getBoundingClientRect(); mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top; mouse.on=true; });
  box.addEventListener('pointerleave',function(){ mouse.on=false; });
  document.addEventListener('visibilitychange',function(){ visibile=!document.hidden; if(visibile)avvia(); });
  if('IntersectionObserver' in window) new IntersectionObserver(function(en){ visibile=en[0].isIntersecting; if(visibile)avvia(); }).observe(box);
  var t; addEventListener('resize',function(){ clearTimeout(t); t=setTimeout(function(){dim();disegna();},120); });
  dim(); disegna(); if(!ridotto) avvia();
})();
</script>
