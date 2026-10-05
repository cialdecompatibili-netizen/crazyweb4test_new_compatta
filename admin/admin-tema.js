/* Tema (admin > Sito > Tema). Per ora UNA sola cosa: la FAVICON, con anteprima e scelta grafica. Vedi CLAUDE.md punto 33.
   COME FUNZIONA: la favicon e' la chiave `icon:` in prima colonna di _config.yml. Il tema (head.liquid della gem al_folio_core) fa cosi':
     - se `icon` e' lunga al massimo 4 caratteri la tratta come EMOJI e la disegna come SVG incorporato;
     - altrimenti la tratta come NOME FILE dentro assets/img/ (la gem aggiunge da sola il prefisso /assets/img/) e, se e' png/jpg, la usa
       anche come apple-touch-icon.
   PUNTI CRITICI:
     (1) nel config si scrive SOLO il nome del file (es. logo.png), MAI 'assets/img/logo.png': la gem aggiungerebbe il prefisso due volte.
     (2) l'emoji deve restare entro 4 caratteri (conta il carattere, non i byte; ⚛️ sono 2): oltre, la gem la scambia per un nome file.
     (3) se la riga `icon:` sparisce dal config questa vista NON la ricrea (come home_marte): mostra un errore e non scrive niente.
     (4) il commento che segue il valore nella riga (` # ...`) viene conservato.
     (5) niente graffe con percentuale o doppie graffe nei commenti/stringhe: il resto dell'admin non le usa e Liquid le eseguirebbe.
     (6) i browser tengono la favicon in cache per molto tempo: dopo il deploy puo' servire chiudere e riaprire la scheda o Ctrl+F5.
   Formati per l'immagine: png o svg consigliati, quadrata (la gem usa il png anche per iPhone: meglio 180x180 o piu'). Il selettore mostra
   jpg, png, gif, webp, svg (i file .ico non si vedono nel selettore: convertili in png). */
(function (A) {
  var $ = A.$, esc = A.esc;
  var DEF = '\u269B\uFE0F'; // emoji di partenza del tema
  /* ELENCO EMOJI (si apre col pulsante, chiuso di default). Scritte con gli escape \u per non dipendere dalla codifica del file. Per aggiungerne una:
     metti qui il suo codice \u; resta entro 4 caratteri (punto critico 2). Le prime 10 sono quelle storiche. */
  var QUICK = [DEF, '\uD83D\uDE80', '\uD83C\uDF10', '\uD83D\uDCA1', '\u2B50', '\uD83D\uDD25', '\uD83C\uDFA8', '\uD83D\uDED2', '\u26A1', '\uD83D\uDCBB',
    '\uD83C\uDF1F', '\u2728', '\uD83C\uDFAF', '\uD83D\uDC8E', '\uD83C\uDFC6', '\uD83D\uDCC8', '\uD83D\uDCF1', '\uD83D\uDDA5\uFE0F', '\uD83D\uDEE0\uFE0F', '\u2699\uFE0F',
    '\uD83D\uDD27', '\uD83D\uDD12', '\uD83D\uDD0D', '\uD83D\uDCE3', '\uD83D\uDCE2', '\u2709\uFE0F', '\uD83D\uDCE7', '\uD83D\uDCDE', '\uD83C\uDFE0', '\uD83C\uDFE2',
    '\uD83C\uDF0D', '\uD83C\uDF31', '\uD83C\uDF3F', '\uD83C\uDF38', '\uD83C\uDF40', '\u2600\uFE0F', '\uD83C\uDF19', '\u2764\uFE0F', '\uD83D\uDC9C', '\uD83D\uDC99',
    '\uD83D\uDC9A', '\uD83E\uDDE1', '\uD83E\uDD16', '\uD83E\uDDE0', '\uD83C\uDFAE', '\uD83C\uDFB5', '\uD83D\uDCF7', '\uD83C\uDFAC', '\uD83D\uDCDA', '\u270F\uFE0F',
    '\uD83E\uDDE9', '\uD83E\uDD84', '\uD83D\uDC31', '\uD83D\uDC36', '\uD83C\uDF08', '\uD83C\uDF55', '\u2615'];
  var PFX = 'assets/img/';
  var ICON_RE = /^icon:[ \t]*(.*)$/m;
  var st = { tipo: 'emoji', emoji: DEF, img: '', url: '', fb: '', orig: '' };

  function len(s) { return Array.from(String(s)).length; }
  /* legge il valore di icon: dal testo del config (senza il commento finale e senza virgolette) */
  function readIcon(t) {
    var m = t.match(ICON_RE); if (!m) return null;
    return m[1].replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '');
  }
  /* riscrive il valore di icon: tenendo l'eventuale commento sulla stessa riga; null se la riga non esiste */
  function writeIcon(t, v) {
    var m = t.match(ICON_RE); if (!m) return null;
    var start = t.indexOf(m[0]), cm = m[1].match(/(\s+#.*)$/);
    return t.slice(0, start) + 'icon: ' + v + (cm ? cm[1] : '') + t.slice(start + m[0].length);
  }
  /* indirizzi per mostrare l'immagine: prima il link diretto di GitHub (vale anche per file appena caricati), poi quello del sito
     (serve agli svg: GitHub li serve come testo e l'img non li disegna) */
  function resolveImg(name) {
    st.fb = '../' + PFX + name; st.url = st.fb;
    return A.getDir('assets/img', { rest: true }).then(function (l) {
      var f = (l || []).filter(function (x) { return x.name === name; })[0];
      if (f && f.download_url) st.url = f.download_url;
    }, function () {});
  }
  function icn(px) {
    if (st.tipo === 'emoji') return '<span style="font-size:' + Math.round(px * 0.9) + 'px;line-height:1;display:inline-block">' + esc(st.emoji || '') + '</span>';
    if (!st.img) return '<span style="color:#999;font-size:11px">nessuna</span>';
    return '<img src="' + esc(st.url) + '" data-fb="' + esc(st.fb) + '" onerror="this.onerror=null;this.src=this.getAttribute(\'data-fb\')" width="' + px + '" height="' + px + '" style="object-fit:contain;display:block">';
  }
  function paint() {
    var p = $('tm_prev'); if (!p) return;
    p.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-end">' +
        '<div><small style="display:block;margin-bottom:6px;color:#787c82">Scheda del browser</small>' +
          '<div style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid #ddd;border-bottom:0;border-radius:10px 10px 0 0;background:#f1f3f4;font-size:13px;min-width:200px">' +
            '<span style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;overflow:hidden">' + icn(16) + '</span><span>Il tuo sito</span><span style="margin-left:auto;color:#888">&#10005;</span></div></div>' +
        '<div style="text-align:center"><small style="display:block;margin-bottom:6px;color:#787c82">32 px</small><span style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid #ddd;border-radius:6px;background:#fff;overflow:hidden">' + icn(32) + '</span></div>' +
        '<div style="text-align:center"><small style="display:block;margin-bottom:6px;color:#787c82">Grande</small><span style="width:64px;height:64px;display:flex;align-items:center;justify-content:center;border:1px solid #ddd;border-radius:12px;background:#fff;overflow:hidden">' + icn(64) + '</span></div>' +
      '</div>';
    var e = $('tm_emo'); if (e && e !== document.activeElement) e.value = st.emoji;
    var nm = $('tm_imgname'); if (nm) nm.textContent = st.img ? st.img : 'Nessuna immagine scelta';
    $('tm_boxE').style.display = st.tipo === 'emoji' ? '' : 'none';
    $('tm_boxI').style.display = st.tipo === 'img' ? '' : 'none';
    $('tm_tipo').value = st.tipo;
    var cur = st.tipo === 'emoji' ? st.emoji : st.img;
    $('tm_save').disabled = !cur || cur === st.orig;
  }

  A.views.tema = function () {
    return A.getFile('_config.yml').then(function (f) {
      var v = readIcon(f.text);
      if (v === null) return A.main().innerHTML = '<h2>Tema</h2><div class="card">Nel file _config.yml manca la riga <b>icon:</b>: la favicon non si puo\' cambiare da qui finche\' non viene rimessa.</div>';
      st.orig = v;
      if (v && len(v) > 4) { st.tipo = 'img'; st.img = v; st.emoji = DEF; }
      else { st.tipo = 'emoji'; st.emoji = v || DEF; st.img = ''; }
      return (st.img ? resolveImg(st.img) : Promise.resolve()).then(function () {
        var q = QUICK.map(function (e, i) { return '<button type="button" class="btn sm" data-q="' + i + '" style="font-size:20px;padding:2px 6px;min-width:38px">' + e + '</button>'; }).join(' ');
        A.main().innerHTML = '<h2>Tema</h2><div class="card"><h3>Favicon</h3>' +
          '<p style="margin-top:0;color:#787c82">E\' la piccola icona che compare nella scheda del browser e nei preferiti.</p>' +
          '<div id="tm_prev" style="padding:14px;border:1px solid #e3e3e3;border-radius:6px;background:#fafafa;margin-bottom:14px"></div>' +
          '<label>Tipo di icona</label><select id="tm_tipo" style="width:auto"><option value="emoji">Emoji</option><option value="img">Immagine</option></select>' +
          '<div id="tm_boxE" style="margin-top:12px"><label>Emoji</label><input id="tm_emo" maxlength="8" style="width:90px;font-size:20px" autocomplete="off"> ' +
            '<p style="margin:8px 0 0"><button type="button" class="btn sm" id="tm_more">Scegli tra ' + QUICK.length + ' emoji &#9662;</button></p>' +
            '<div id="tm_grid" style="display:none;margin-top:8px;padding:8px;border:1px solid #e3e3e3;border-radius:6px;max-height:190px;overflow:auto;gap:4px;flex-wrap:wrap">' + q + '</div></div>' +
          '<div id="tm_boxI" style="margin-top:12px"><label>Immagine</label><button type="button" class="btn" id="tm_pick">Scegli o carica immagine</button> <small id="tm_imgname"></small>' +
            '<p><small style="color:#787c82"><b>Misure consigliate da Google (risultati di ricerca):</b> immagine quadrata (1:1), almeno 48x48 px e meglio un multiplo di 48 (96, 144, 192). Ideale: png 192x192, oppure svg quadrato. Il png serve anche per l\'icona su iPhone.</small></p></div>' +
          '<p style="margin-top:16px"><button type="button" class="btn primary" id="tm_save">Salva favicon</button> <small style="color:#787c82">Il sito si aggiorna in 2-3 minuti; il browser puo\' tenere la vecchia icona finche\' non ricarichi (Ctrl+F5).</small></p></div>';
        $('tm_tipo').onchange = function () { st.tipo = this.value; paint(); };
        $('tm_emo').oninput = function () { st.emoji = this.value.trim(); paint(); };
        /* l'elenco emoji e' chiuso all'apertura: il pulsante lo apre/chiude, e la scelta di una emoji lo richiude */
        $('tm_more').onclick = function () { var g = $('tm_grid'), on = g.style.display === 'none'; g.style.display = on ? 'flex' : 'none'; this.innerHTML = 'Scegli tra ' + QUICK.length + ' emoji ' + (on ? '&#9652;' : '&#9662;'); };
        $('tm_boxE').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[data-q]') : null; if (b) { st.emoji = QUICK[+b.getAttribute('data-q')]; $('tm_emo').value = st.emoji; $('tm_grid').style.display = 'none'; $('tm_more').innerHTML = 'Scegli tra ' + QUICK.length + ' emoji &#9662;'; paint(); } });
        $('tm_pick').onclick = function () {
          A.imgPick(null, { onPick: function (sel) {
            var name = String(sel).replace(/^assets\/img\//, '');
            st.img = name; st.tipo = 'img'; resolveImg(name).then(paint);
          } });
        };
        $('tm_save').onclick = A.wrap(saveIcon);
        paint();
      });
    });
  };

  /* salva: rilegge il config (sha fresco, il pannello committa in parallelo), cambia SOLO la riga icon: e fa un commit */
  function saveIcon() {
    var v = st.tipo === 'emoji' ? st.emoji : st.img;
    if (!v) return Promise.resolve(A.toast(st.tipo === 'emoji' ? 'Scrivi o scegli un\'emoji' : 'Scegli un\'immagine', true));
    if (st.tipo === 'emoji' && len(v) > 4) return Promise.resolve(A.toast('Emoji troppo lunga: massimo 4 caratteri (una sola emoji)', true));
    if (st.tipo === 'img' && /[\s:#"']/.test(v)) return Promise.resolve(A.toast('Il nome del file contiene caratteri non ammessi: rinominalo e ricaricalo', true));
    return A.getFile('_config.yml').then(function (f) {
      var t = writeIcon(f.text, v);
      if (t === null) return A.toast('Nel config manca la riga icon:', true);
      if (t === f.text) return A.toast('Nessuna modifica');
      return A.putFile('_config.yml', t, f.sha, 'admin: favicon ' + (st.tipo === 'emoji' ? '(emoji)' : v)).then(function () { st.orig = v; A.toast('Salvato: il sito si aggiorna tra 2-3 minuti'); paint(); });
    });
  }
})(A);
