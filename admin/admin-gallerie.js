/* Gallerie: contenitori di foto riusabili. Dati in _data/gallerie/<id>.json, foto in assets/img/gallerie/<id>/.
   Nel testo si inseriscono con {% include galleria.liquid id="<id>" %} (pulsante Galleria della toolbar, vedi mdGal). Vedi CLAUDE.md > Gallerie.
   PUNTI CRITICI: (1) il salvataggio e' UN SOLO commit (A.commitFiles) con foto nuove + JSON: niente commit a meta' ne' deploy multipli.
   (2) le foto vivono in una cartella per galleria: nomi uguali in gallerie diverse non si sovrascrivono; si cancellano solo le foto di QUELLA cartella.
   (3) le foto grandi sono ridotte nel browser (max 2000 px, qualita' 0.85) per non appesantire il sito. */
(function (A) {
  var $ = A.$, esc = A.esc, M = function () { return A.main(); };
  var DIR = '_data/gallerie', IMGDIR = 'assets/img/gallerie';
  var LAYOUTS = [['3col', '3 colonne'], ['2col', '2 colonne'], ['2-1', '2/3 + 1/3 (alternato)'], ['1', 'Una foto per riga']];
  var pend = null;                                          /* galleria da aprire subito dopo l'elenco (vedi galOpen) */
  var G = null, OLD = {};                                   /* G = galleria in modifica; OLD = foto gia' salvate (src -> 1) */
  function code(id) { return '{% include galleria.liquid id="' + id + '" %}'; }
  function ids(l) { return l.filter(function (x) { return x.type === 'file' && /\.json$/.test(x.name); }).map(function (x) { return x.name.replace(/\.json$/, ''); }); }

  A.views.gallerie = function () {
    return A.getDir(DIR).then(function (l) {
      var h = '<h2>Gallerie</h2><div class="card"><p>Una galleria e\' un contenitore di foto: la crei qui e la inserisci nel testo di articoli, pagine, progetti e servizi col pulsante <b>Galleria</b> dell\'editor. Ne puoi fare quante vuoi (es. lavori prima / lavori dopo) e usarle in piu punti.</p>' +
        '<p><button class="btn primary" onclick="A.galNew()">+ Nuova galleria</button></p></div><div class="card">';
      var L = ids(l);
      L.forEach(function (id) {
        h += '<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #eee"><b style="flex:1">' + esc(id) + '</b>' +
          '<button class="btn sm" onclick="A.galEdit(\'' + A.jq(id) + '\')">Modifica</button>' +
          '<button class="btn sm danger" onclick="A.galDel(\'' + A.jq(id) + '\')">x</button></div>';
      });
      M().innerHTML = h + (L.length ? '' : 'Nessuna galleria.') + '</div>';
      var q = pend; pend = null; if (q && L.indexOf(q) >= 0) A.galEdit(q);
    });
  };

  A.galNew = A.wrap(function () {
    var n = prompt('Nome della galleria (es. Lavori prima):'); if (!n || !n.trim()) return;
    var id = A.slugify(n);
    return A.getDir(DIR).then(function (l) {
      if (ids(l).indexOf(id) >= 0) { A.toast('Esiste gia una galleria con questo nome', true); return; }
      G = { id: id, titolo: n.trim(), layout: '3col', imgs: [] }; OLD = {}; drawEd();
    });
  });
  A.galEdit = A.wrap(function (id) {
    return A.getFile(DIR + '/' + id + '.json').then(function (f) {
      var j = JSON.parse(f.text); OLD = {};
      G = { id: id, titolo: j.titolo || id, layout: j.layout || '3col', imgs: (j.immagini || []).map(function (x) { OLD[x.src] = 1; return { src: x.src, cap: x.didascalia || '' }; }) };
      drawEd();
    });
  });

  function readForm() {
    if (!$('g_t')) return;
    G.titolo = ($('g_t').value || '').trim() || G.id; G.layout = $('g_l').value;
    Array.prototype.forEach.call(document.querySelectorAll('.gcap'), function (e) { G.imgs[+e.getAttribute('data-i')].cap = e.value; });
  }
  function drawEd() {
    var h = '<h2>Galleria: ' + esc(G.id) + '</h2><div class="card"><label>Titolo (solo per te)</label><input id="g_t" value="' + esc(G.titolo) + '">' +
      '<label>Disposizione</label><select id="g_l">' + LAYOUTS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === G.layout ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' +
      '<label>Foto (la prima e\' in alto a sinistra)</label><div class="grid">';
    G.imgs.forEach(function (im, i) {
      h += '<div class="im"><img src="' + esc(im.prev || (A.baseurl() + '/' + im.src)) + '">' +
        '<input class="gcap" data-i="' + i + '" placeholder="Didascalia" value="' + esc(im.cap || '') + '" style="width:100%;margin:4px 0">' +
        '<button class="btn sm" onclick="A.galMove(' + i + ',-1)">&larr;</button> <button class="btn sm" onclick="A.galMove(' + i + ',1)">&rarr;</button> ' +
        '<button class="btn sm danger" onclick="A.galRm(' + i + ')">x</button></div>';
    });
    h += '<label class="im" style="cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:44px;min-height:120px;border:2px dashed #a7aaad;color:#2271b1">' +
      '<input id="g_up" type="file" accept="image/*" multiple style="display:none" onchange="A.galAdd()">+</label></div></div>' +
      '<div class="card"><p>Codice da incollare nel testo: <code>' + esc(code(G.id)) + '</code> <button class="btn sm" onclick="A.galCopy()">Copia</button><br>' +
      '<small>Oppure, nell\'editor di un articolo/pagina/progetto, usa il pulsante <b>Galleria</b>. Le modifiche compaiono sul sito dopo 2-3 minuti.</small></p>' +
      '<button class="btn primary" onclick="A.galSave()">Salva</button> <button class="btn" onclick="A.go(\'gallerie\')">Elenco gallerie</button></div>';
    M().innerHTML = h;
  }
  A.galMove = function (i, d) { readForm(); var j = i + d; if (j < 0 || j >= G.imgs.length) return; var t = G.imgs[i]; G.imgs[i] = G.imgs[j]; G.imgs[j] = t; drawEd(); };
  A.galRm = function (i) { readForm(); G.imgs.splice(i, 1); drawEd(); };
  A.galCopy = function () { var t = code(G.id); if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { A.toast('Copiato'); }); else A.toast(t); };

  /* prep: legge la foto e, se e' jpeg/png/webp grande, la riduce (max 2000 px). Altri formati (gif, svg) restano com'erano. */
  function prep(f) {
    return new Promise(function (ok, ko) {
      function rd(b, bl) { var r = new FileReader(); r.onload = function () { ok({ blob: bl, b64: r.result.split(',')[1] }); }; r.onerror = ko; r.readAsDataURL(b); }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return rd(f, f);
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(u);
        var w = im.naturalWidth, h = im.naturalHeight, s = Math.min(1, 2000 / Math.max(w, h));
        if (s === 1 && f.size < 1500000) return rd(f, f);
        var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(function (b) { if (b) rd(b, b); else rd(f, f); }, f.type, 0.85);
      };
      im.onerror = function () { URL.revokeObjectURL(u); rd(f, f); };
      im.src = u;
    });
  }
  A.galAdd = A.wrap(function () {
    readForm();
    var fs = Array.prototype.slice.call($('g_up').files); if (!fs.length) return;
    return fs.reduce(function (pr, f) {
      return pr.then(function () {
        return prep(f).then(function (p) {
          var name = f.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-'), base = name, k = 1;
          while (G.imgs.some(function (x) { return x.src === IMGDIR + '/' + G.id + '/' + name; })) { k++; name = base.replace(/(\.[a-z0-9]+)?$/, '-' + k + '$1'); }
          G.imgs.push({ src: IMGDIR + '/' + G.id + '/' + name, cap: '', b64: p.b64, prev: URL.createObjectURL(p.blob) });
        });
      });
    }, Promise.resolve()).then(drawEd);
  });

  A.galSave = A.wrap(function () {
    readForm();
    if (!G.imgs.length) { A.toast('Aggiungi almeno una foto', true); return; }
    var ch = [], keep = {};
    G.imgs.forEach(function (im) { keep[im.src] = 1; if (im.b64) ch.push({ path: im.src, b64: im.b64 }); });
    Object.keys(OLD).forEach(function (s) { if (!keep[s] && s.indexOf(IMGDIR + '/' + G.id + '/') === 0) ch.push({ path: s, del: true }); });
    ch.push({ path: DIR + '/' + G.id + '.json', text: JSON.stringify({ titolo: G.titolo, layout: G.layout, immagini: G.imgs.map(function (im) { return { src: im.src, didascalia: im.cap || '' }; }) }, null, 2) + '\n' });
    return A.commitFiles(ch, 'admin: galleria ' + G.id).then(function () {
      OLD = {}; G.imgs.forEach(function (im) { delete im.b64; OLD[im.src] = 1; });   /* le anteprime locali restano: il sito online arriva dopo il deploy */
      A.toast('Salvata'); drawEd();
    });
  });
  /* galDel: cancella il JSON e le foto della sua cartella. I testi che la richiamano restano com'e': la galleria mancante non mostra niente (nessun errore). */
  A.galDel = A.wrap(function (id) {
    if (!confirm('Eliminare la galleria ' + id + ' e le sue foto? Dove e\' inserita nei testi non comparira piu.')) return;
    return A.getFile(DIR + '/' + id + '.json').then(function (f) {
      var j = {}; try { j = JSON.parse(f.text); } catch (e) {}
      var ch = [{ path: DIR + '/' + id + '.json', del: true }];
      (j.immagini || []).forEach(function (x) { if (x.src && x.src.indexOf(IMGDIR + '/' + id + '/') === 0) ch.push({ path: x.src, del: true }); });
      return A.commitFiles(ch, 'admin: elimina galleria ' + id);
    }).then(function () { A.toast('Eliminata'); A.go('gallerie'); });
  });

  /* ---- pulsante "Galleria" nella toolbar degli editor (articoli, pagine, progetti, servizi) ---- */
  window.mdGal = function () {
    var old = $('galPick'); if (old) { old.remove(); return; }
    A.getDir(DIR).then(function (l) {
      var L = ids(l); if (!L.length) { A.toast('Non hai ancora gallerie: creale da Gallerie nel menu', true); return; }
      var d = document.createElement('div'); d.id = 'galPick'; d.className = 'card';
      d.innerHTML = '<label>Quale galleria inserire?</label><select id="galSel">' + L.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select> <button class="btn primary sm" onclick="galIns()">Inserisci</button> <button class="btn sm" onclick="galOpen()">Modifica gallerie</button>';
      var t = document.querySelector('.tools'); if (t) t.parentNode.insertBefore(d, t.nextSibling);
    }).catch(function (e) { A.toast(A.errMsg(e), true); });
  };
  /* galOpen: dall'editor di un testo apre l'editor della galleria scelta nella tendina. Si lascia l'editor del testo: avvisa, perche' il testo non salvato andrebbe perso. */
  window.galOpen = function () {
    var id = $('galSel') ? $('galSel').value : '';
    if (!confirm('Lasci l\'editor del testo: se hai modifiche non salvate andranno perse. Continuare?')) return;
    pend = id; A.go('gallerie');
  };
  /* galIns: in modalita' visuale inserisce il blocco protetto (mdRender lo riconosce come Liquid) dove sta il cursore, altrimenti in fondo; in Sorgente nel punto del cursore. */
  window.galIns = function () {
    var raw = code($('galSel').value), t = $('body'), p = $('mdPrev');
    if (p && p.style.display === 'block') {
      p.focus(); var s = window.getSelection();
      if (!s.rangeCount || !p.contains(s.anchorNode)) { var r = document.createRange(); r.selectNodeContents(p); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
      document.execCommand('insertHTML', false, window.mdRender(raw));
      p.dispatchEvent(new Event('input'));
    } else {
      var i = t.selectionStart || t.value.length; t.value = t.value.slice(0, i) + '\n\n' + raw + '\n\n' + t.value.slice(i);
    }
    var b = $('galPick'); if (b) b.remove();
  };
})(A);
