/* Immagini (assets/img/) + Impostazioni (_config.yml). Vedi claude.md */
(function (A) {
  var $ = A.$, esc = A.esc, M = function () { return A.main(); };
  var IMG = /\.(jpe?g|png|gif|webp|svg)$/i;

  A.views.media = function () {
    return A.getDir('assets/img', { rest: true }).then(function (l) {
      var files = l.filter(function (f) { return f.type === 'file' && IMG.test(f.name); });
      var h = '<h2>Immagini</h2><div class="card"><input id="up" type="file" accept="image/*" multiple>' +
        '<p><button class="btn primary" onclick="A.upload()">Carica</button> <small>Vanno in assets/img/. Usa nei contenuti: assets/img/nome.jpg</small></p></div><div class="card"><div class="grid">';
      files.forEach(function (f) {
        h += '<div class="im"><img loading="lazy" src="' + esc(f.download_url) + '"><div>' + esc(f.name) + '</div>' +
          '<button class="btn sm" onclick="A.copyImg(\'' + A.jq(f.name) + '\')">Copia</button>' +
          '<button class="btn sm danger" onclick="A.delImg(\'' + A.jq(f.name) + '\')">x</button></div>';
      });
      M().innerHTML = h + '</div>' + (files.length ? '' : 'Nessuna immagine.') + '</div>';
    });
  };
  /* SELETTORE IMMAGINE (stile WordPress): finestra con Carica + griglia di assets/img. Clic su una foto = selezionata, 'Imposta immagine' la scrive nel campo
     nascosto <fid> (percorso 'assets/img/nome.jpg') e aggiorna l'anteprima. Le foto caricate da qui sono ridotte nel browser (max 2000 px, qualita' 0.85, come le
     gallerie) e NON sovrascrivono mai un file con lo stesso nome (si aggiunge -2, -3...). Si seleziona da sola l'ultima caricata. Usato da articoli (thumbnail) e progetti (img). */
  A.rawUrl = function (p) { return /^https?:/.test(p) ? p : 'https://raw.githubusercontent.com/' + A.repo() + '/' + A.branch() + '/' + String(p).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/'); };
  A.imgPrev = function (fid) {
    var v = ($(fid).value || '').trim(), e = $(fid + '_pv'); if (!e) return;
    e.innerHTML = v ? '<img src="' + esc(A.rawUrl(v)) + '" style="max-width:240px;max-height:150px;border-radius:4px;border:1px solid #a7aaad;display:block;margin:6px 0"><small>' + esc(v) + '</small>' : '<small>Nessuna immagine impostata</small>';
  };
  A.imgClr = function (fid) { $(fid).value = ''; A.imgPrev(fid); };
  /* MINIATURA LEGGERA per l'immagine in evidenza: assets/img/cover/<nome>.jpg, larghezza max 1200 px, JPEG 80%, ritaglio verticale max 4:3 (l'articolo la mostra in 16:9).
     Si crea quando nel selettore si preme 'Imposta immagine' sul campo f_thumbnail, solo se non esiste gia'. L'originale non si tocca (serve per thumbnail_hd). */
  A.mkCover = function (p) {
    var fn = String(p).replace(/^.*\//, ''), base = fn.replace(/\.[a-z0-9]+$/i, ''), dst = 'assets/img/cover/' + base + '.jpg';
    return A.getFile(dst).then(function () { return true; }, function () { return false; }).then(function (ex) {
      if (ex) return;
      return new Promise(function (ok, ko) {
        var im = new Image(); im.crossOrigin = 'anonymous';
        im.onload = function () {
          if ((im._sz || 1e9) < 300000 && im.naturalWidth <= 1200 && im.naturalHeight <= im.naturalWidth * 0.75) return ok(null); /* gia' leggera: niente ricompressione, l'articolo usa l'originale */ var w = Math.min(im.naturalWidth, 1200), s = w / im.naturalWidth, h = Math.round(im.naturalHeight * s), ch = Math.min(h, Math.round(w * 0.75));
          var cv = document.createElement('canvas'); cv.width = w; cv.height = ch; var cx = cv.getContext('2d');
          cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, ch);
          cx.drawImage(im, 0, -Math.round((h - ch) * 0.3), w, h);
          ok(cv.toDataURL('image/jpeg', 0.8).split(',')[1]);
        };
        im.onerror = function () { ko(new Error('miniatura: immagine non leggibile')); };
        fetch(A.rawUrl(p) + '?t=' + Date.now()).then(function (r) { return r.blob(); }).then(function (b) { im._sz = b.size; im.src = URL.createObjectURL(b); }, function () { im.src = A.rawUrl(p) + '?t=' + Date.now(); });
      }).then(function (b64) { if (!b64) return; return A.putFile(dst, b64, '', 'admin: miniatura ' + base + '.jpg', true); });
    });
  };
  function shrink(f) {
    return new Promise(function (ok, ko) {
      function rd(b) { var r = new FileReader(); r.onload = function () { ok(r.result.split(',')[1]); }; r.onerror = ko; r.readAsDataURL(b); }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return rd(f);
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(u);
        var s = Math.min(1, 2000 / Math.max(im.naturalWidth, im.naturalHeight));
        if (s === 1 && f.size < 1500000) return rd(f);
        var cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth * s); cv.height = Math.round(im.naturalHeight * s);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        cv.toBlob(function (bl) { rd(bl || f); }, f.type, 0.85);
      };
      im.onerror = function () { URL.revokeObjectURL(u); rd(f); };
      im.src = u;
    });
  }
  /* opts (facoltativo): { align: true, onPick: function (percorso, {align, alt}) } = modalita' INSERIMENTO nel testo (pulsante Img dell'editor): fid null, compaiono Sinistra/Centro/Destra e il testo alternativo, e al posto di scrivere nel campo chiama onPick. Senza opts funziona come prima (immagine in evidenza, progetti). */ A.imgPick = function (fid, opts) {
    opts = opts || {}; if ($('ip_ov')) return;
    var sel = fid ? ($(fid).value || '').trim() : '', names = [], al = 'center';
    var ov = document.createElement('div'); ov.id = 'ip_ov';
    ov.style.cssText = 'position:fixed;inset:0;background:#0008;z-index:60;display:flex;align-items:center;justify-content:center;padding:12px';
    ov.innerHTML = '<div style="background:#fff;border-radius:6px;width:100%;max-width:880px;max-height:92vh;display:flex;flex-direction:column">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #ddd"><b>Scegli o carica un\'immagine</b><button class="btn sm" id="ip_x">Chiudi</button></div>' +
      '<div style="padding:12px 16px;border-bottom:1px solid #ddd"><input type="file" id="ip_f" accept="image/*" multiple style="width:auto"> <small id="ip_s">Carica una foto dal PC: viene ridotta, salvata in assets/img e selezionata.</small></div>' +
      '<div id="ip_g" class="grid" style="padding:16px;overflow:auto;flex:1;align-content:start"></div>' +
      '<div style="padding:12px 16px;border-top:1px solid #ddd;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between">' + (opts.align ? '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><small>Posizione</small><button type="button" class="btn sm" data-al="left">Sinistra</button><button type="button" class="btn sm primary" data-al="center">Centro</button><button type="button" class="btn sm" data-al="right">Destra</button><input id="ip_alt" placeholder="Testo alternativo (descrivi la foto)" style="width:260px"></div>' : '<span></span>') + '<button class="btn primary" id="ip_ok">' + (opts.align ? 'Inserisci immagine' : 'Imposta immagine') + '</button></div></div>';
    document.body.appendChild(ov);
    function close() { ov.remove(); }
    function paint() {
      Array.prototype.forEach.call($('ip_g').querySelectorAll('.im'), function (e) { e.style.outline = e.getAttribute('data-p') === sel ? '3px solid #2271b1' : ''; });
    }
    function draw() {
      return A.getDir('assets/img', { rest: true }).then(function (l) {
        var fs = l.filter(function (f) { return f.type === 'file' && IMG.test(f.name); }); names = fs.map(function (f) { return f.name; });
        $('ip_g').innerHTML = fs.length ? fs.map(function (f) {
          return '<div class="im" style="cursor:pointer" data-p="assets/img/' + esc(f.name) + '"><img loading="lazy" src="' + esc(f.download_url) + '"><div>' + esc(f.name) + '</div></div>';
        }).join('') : 'Nessuna immagine: caricane una.';
        paint();
      }, function (e) { $('ip_g').textContent = A.errMsg(e); });
    }
    ov.addEventListener('click', function (e) {
      if (e.target === ov) return close(); var ab = e.target.closest ? e.target.closest('[data-al]') : null; if (ab) { al = ab.getAttribute('data-al'); Array.prototype.forEach.call(ov.querySelectorAll('[data-al]'), function (x) { x.classList.toggle('primary', x === ab); }); return; }
      var t = e.target; while (t && t !== ov && !(t.getAttribute && t.getAttribute('data-p'))) t = t.parentNode;
      if (t && t !== ov) { sel = t.getAttribute('data-p'); paint(); }
    });
    $('ip_x').onclick = close;
    $('ip_ok').onclick = function () { if (!sel) return A.toast('Scegli o carica un\'immagine', true); if (opts.onPick) { opts.onPick(sel, { align: al, alt: (($('ip_alt') || {}).value || '').trim() }); close(); return; } if (fid === 'f_thumbnail') { A.toast('Preparo la miniatura leggera...'); A.mkCover(sel).then(function () { $(fid).value = sel; A.imgPrev(fid); close(); }, function (e) { A.toast(A.errMsg(e), true); $(fid).value = sel; A.imgPrev(fid); close(); }); return; } $(fid).value = sel; A.imgPrev(fid); close(); };
    $('ip_f').onchange = function () {
      var fs = Array.prototype.slice.call(this.files); if (!fs.length) return;
      var inp = this, st = $('ip_s');
      fs.reduce(function (pr, f, i) {
        return pr.then(function () {
          st.textContent = 'Carico ' + (i + 1) + ' di ' + fs.length + '...';
          return shrink(f).then(function (b64) {
            var name = f.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-'), m = name.match(/^(.*?)(\.[a-z0-9]+)?$/), k = 1;
            while (names.indexOf(name) >= 0) { k++; name = m[1] + '-' + k + (m[2] || ''); }
            return A.putFile('assets/img/' + name, b64, '', 'admin: immagine ' + name, true).then(function () { names.push(name); sel = 'assets/img/' + name; });
          });
        });
      }, Promise.resolve()).then(function () { st.textContent = 'Caricata e selezionata.'; inp.value = ''; return draw(); },
        function (e) { st.textContent = 'Errore: ' + A.errMsg(e); });
    };
    draw();
  };
  A.copyImg = function (n) {
    var t = 'assets/img/' + n;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { A.toast('Copiato: ' + t); });
    else A.toast(t);
  };
  /* A.upload: carica in assets/img/. PUNTI CRITICI: (1) il file va inviato in base64 SENZA il prefisso 'data:...;base64,' (per questo split(',')[1]) e putFile con isB64=true, altrimenti lo ricodifica e l'immagine e' corrotta. (2) il nome e' normalizzato (minuscolo, solo a-z0-9._-): niente spazi ne' maiuscole, i percorsi su GitHub Pages sono case-sensitive. (3) se il file esiste gia' si legge lo sha e lo si sovrascrive; senza sha GitHub risponde 422. (4) upload in sequenza, un commit per file. Limite: file molto grandi (oltre ~25 MB) vengono rifiutati dall'API. [FONTE: docs.github.com REST 'Create or update file contents'] */
  A.upload = A.wrap(function () {
    var fs = $('up').files; if (!fs.length) return A.toast('Scegli un file', true);
    var arr = Array.prototype.slice.call(fs);
    return arr.reduce(function (pr, f) {
      return pr.then(function () {
        return new Promise(function (ok, ko) {
          var r = new FileReader();
          r.onload = function () { ok(r.result.split(',')[1]); }; r.onerror = ko; r.readAsDataURL(f);
        }).then(function (b64) {
          var name = f.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
          return A.getFile('assets/img/' + name).then(function (ex) { return ex.sha; }, function () { return ''; })
            .then(function (sha) { return A.putFile('assets/img/' + name, b64, sha, 'admin: immagine ' + name, true); });
        });
      });
    }, Promise.resolve()).then(function () { A.toast('Caricate'); A.go('media'); });
  });
  /* A.delImg: elimina un'immagine. NON controlla se e' usata in post/pagine: se lo e', li' resta un'immagine rotta. Cercare il nome (es. con la ricerca del repo) prima di eliminare. */
  A.delImg = A.wrap(function (n) {
    if (!confirm('Eliminare ' + n + '?')) return;
    return A.getFile('assets/img/' + n).then(function (f) { return A.delFile('assets/img/' + n, f.sha); })
      .then(function () { var cp = 'assets/img/cover/' + n.replace(/\.[a-z0-9]+$/i, '') + '.jpg'; return A.getFile(cp).then(function (c) { return A.delFile(cp, c.sha); }, function () {}); })
      .then(function () { A.toast('Eliminata'); A.go('media'); });
  });

  /* ---- Impostazioni: solo campi semplici di _config.yml, edit chirurgico riga per riga ---- */
  /* Come WordPress: solo cio' che serve. Titolo, Descrizione (ripiego SEO), Lingua; poi Lettura (articoli per pagina, indice).
     NON in admin (restano in _config.yml): nome/cognome/nota contatti (logica da sito personale), parole chiave (i motori le ignorano),
     testo footer, url e baseurl (li ricava deploy.yml dal repo: un clone funziona da solo, vedi CLAUDE.md).
     Titolo: vuoto = automatico dal nome del repo/baseurl (plugin _plugins/titolo_da_baseurl.rb); si salva come 'blank'. */
  var KEYS = [['title', 'Titolo'], ['description', 'Descrizione per i motori di ricerca (ripiego)'], ['lang', 'Lingua']];
  var CFG_SAVE = KEYS.concat([['toc_style', 'Indice articoli']]); // toc_style ha il suo <select> nella vista, non l'input generico
  var cfg = { sha: '', text: '' };
  function getVal(t, k) { // valore singola riga o blocco ">"
    var m = t.match(new RegExp('^' + k + ':[ \\t]*(.*)$', 'm'));
    if (!m) return '';
    var v = m[1].replace(/\s+#.*$/, '').trim();
    if (v === '>' || v === '|' || v === '>-') {
      var rest = t.slice(t.indexOf(m[0]) + m[0].length + 1).split(/\r?\n/), out = [];
      for (var i = 0; i < rest.length; i++) { if (/^\s+\S/.test(rest[i])) out.push(rest[i].trim()); else if (rest[i].trim() === '') { if (out.length) out.push(''); } else break; }
      return out.join(' ').trim();
    }
    return v.replace(/^["']|["']$/g, '');
  }
  function setVal(t, k, v) {
    var re = new RegExp('^' + k + ':[ \\t]*(.*)$', 'm'), m = t.match(re);
    if (!m) return t;
    var start = t.indexOf(m[0]), end = start + m[0].length;
    if (/^(>|\||>-)/.test(m[1].trim())) { // sostituisce anche le righe indentate del blocco
      var lines = t.slice(end + 1).split(/\r?\n/), c = 0;
      while (c < lines.length && (/^\s+\S/.test(lines[c]) || lines[c].trim() === '' && c + 1 < lines.length && /^\s+\S/.test(lines[c + 1]))) c++;
      var tail = lines.slice(c).join('\n');
      return t.slice(0, start) + k + ': >\n  ' + v + '\n' + tail;
    }
    var cm = m[1].match(/(\s+#.*)$/);
    return t.slice(0, start) + k + ': ' + (/[:#]/.test(v) && !/^https?:/.test(v) ? '"' + v.replace(/"/g, '\\"') + '"' : v) + (cm ? cm[1] : '') + t.slice(end);
  }
  /* Righe per pagina del blog: nel config e' ANNIDATA (pagination > per_page), quindi non passa da getVal/setVal (solo chiavi in prima colonna).
     jekyll-paginate-v2 la legge da qui perche' _pages/blog.md NON ha piu' per_page (se ci torna, vince blog.md e questo menu non ha effetto). */
  var PER_RE = /(^pagination:[ \t]*\r?\n(?:[ \t]+[^\r\n]*\r?\n)*?[ \t]+per_page:[ \t]*)(\d+)/m;
  function getPer(t) { var q = t.match(PER_RE); return q ? q[2] : ''; }
  function setPer(t, n) { return t.replace(PER_RE, function (_q, a) { return a + n; }); }
  /* Captcha del form contatti: chiave ANNIDATA (contatti > captcha), come per_page non passa da getVal/setVal. Valori: turnstile | altcha, tra virgolette.
     Se la riga manca nel config il menu mostra turnstile e al salvataggio non crea nulla (default del form: turnstile). */
  var CAP_RE = /(^contatti:[ \t]*\r?\n(?:[ \t]+[^\r\n]*\r?\n)*?[ \t]+captcha:[ \t]*")(turnstile|altcha)(")/m;
  function getCap(t) { var q = t.match(CAP_RE); return q ? q[2] : 'turnstile'; }
  function setCap(t, v) { return t.replace(CAP_RE, function (_q, a, _o, c) { return a + v + c; }); }
  /* Copia a mano della regola del plugin _plugins/titolo_da_baseurl.rb (serve solo al segnaposto): tenerle uguali.
     Il nome viene dall'indirizzo del sito (utente.github.io/<repo>/), che e' quello che usa il deploy; ripiego: baseurl del config. */
  function autoTitle(t) {
    var pm = location.pathname.match(/^\/([^\/]+)\//), s = (/\.github\.io$/i.test(location.hostname) && pm && pm[1] !== 'admin') ? pm[1] : '';
    if (!s) s = getVal(t, 'baseurl').replace(/^\/+|\/+$/g, '').split('/').pop() || '';
    if (!s) { var m = getVal(t, 'url').match(/^https?:\/\/([^./]+)/); s = m ? m[1] : ''; }
    s = s.replace(/[-_]/g, ' ').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }
  /* BOX TOKEN (Impostazioni): mostra il token salvato nel browser per poterlo copiare (es. per dare la gestione a un'altra persona).
     PUNTI CRITICI: (1) il campo e' type=password (pallini) e diventa testo solo col clic sull'occhio; l'occhio, quando MOSTRA, copia anche da solo.
     (2) il valore sta solo nel DOM di questa pagina, mai in localStorage a parte (c'e' gia' la chiave adm_tok:<percorso> del login) ne' nel repo.
     (3) chi ha il token puo' scrivere sul repo: per un amico meglio un token suo, da revocare su GitHub quando non serve piu'.
     (4) navigator.clipboard funziona solo in https (GitHub Pages lo e'); in caso contrario si ripiega su select + execCommand('copy'). */
  A.tokBox = function () {
    return '<div class="card"><h3>Token di accesso</h3>' +
      '<p style="margin:0 0 8px;color:#787c82">Il token salvato in questo browser. Con l\'occhio lo vedi e lo copia da solo; con Copia lo copi senza mostrarlo.</p>' +
      '<div style="display:flex;gap:8px;align-items:center"><input id="tokBox" type="password" readonly autocomplete="off" value="' + esc(A.token()) + '" style="flex:1;min-width:0">' +
      '<button class="btn" id="tokEye" title="Mostra e copia" onclick="A.tokEye()">&#128065;</button>' +
      '<button class="btn primary" onclick="A.tokCopy()">Copia</button></div>' +
      '<small style="color:#787c82">Chi ha il token pu\u00f2 modificare questo repo. Se non ti serve pi\u00f9, revocalo da GitHub (Settings &gt; Developer settings).</small></div>';
  };
  A.tokCopy = function () {
    var el = document.getElementById('tokBox'); if (!el) return;
    function ok() { A.toast('Token copiato'); }
    function fb() {
      var was = el.type; el.type = 'text'; el.select();
      var done = false; try { done = document.execCommand('copy'); } catch (e) {}
      el.type = was; if (window.getSelection) window.getSelection().removeAllRanges();
      if (done) ok(); else A.toast('Copia non riuscita: mostra il token e copialo a mano', true);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(A.token()).then(ok, fb); else fb();
  };
  A.tokEye = function () {
    var el = document.getElementById('tokBox'); if (!el) return;
    var show = el.type === 'password'; el.type = show ? 'text' : 'password';
    if (show) A.tokCopy();
  };
  /* MODALITA' ESPERTO: interruttore (localStorage 'adm_expert', per browser, spento di default). Nasconde le parti tecniche che un utente normale non deve toccare:
     oggi il front matter YAML nelle Pagine (admin-menu.js). Il campo p_fm resta nel DOM (nascosto) perche' pgSave lo legge per id. Il cambio vale alla prossima apertura della pagina. */
  A.expert = function () { try { return localStorage.getItem('adm_expert') === '1'; } catch (e) { return false; } };
  A.expSet = function (on) { try { localStorage.setItem('adm_expert', on ? '1' : '0'); } catch (e) {} A.toast(on ? 'Modalit\u00e0 esperto attiva' : 'Modalit\u00e0 esperto spenta'); };
  A.expBox = function () {
    return '<div class="card"><h3>Modalit\u00e0 esperto</h3><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" style="width:auto"' + (A.expert() ? ' checked' : '') + ' onchange="A.expSet(this.checked)"> Mostra le impostazioni tecniche (es. il front matter YAML nelle Pagine)</label>' +
      '<small style="color:#787c82">Spenta di default: serve solo a chi sa cosa sta toccando. Vale per questo browser.</small></div>';
  };
  A.views.settings = function () {
    return A.getFile('_config.yml').then(function (f) {
      cfg = { sha: f.sha, text: f.text };
      var h = '<h2>Impostazioni</h2><div class="card"><h3>Generali</h3>';
      KEYS.forEach(function (k) {
        var v = getVal(f.text, k[0]), extra = '';
        if (k[0] === 'lang') { // tendina invece del campo libero
          var LG = [['it', 'Italiano'], ['en', 'English'], ['fr', 'Fran\u00e7ais'], ['de', 'Deutsch'], ['es', 'Espa\u00f1ol']];
          if (!LG.some(function (x) { return x[0] === v; }) && v) LG.push([v, v]);
          h += '<label>' + k[1] + '</label><select id="c_lang">' + LG.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === v ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>';
          return;
        }
        if (k[0] === 'title') { // 'blank' = automatico: campo vuoto, il segnaposto mostra il titolo che ne esce
          var auto = autoTitle(f.text);
          if (v.toLowerCase() === 'blank') v = '';
          extra = ' placeholder="' + esc(auto) + '"';
        }
        h += '<label>' + k[1] + '</label><input id="c_' + k[0] + '" value="' + esc(v) + '"' + extra + '>';
        if (k[0] === 'description') h += '<small>Non compare nel sito. La usano Google e le anteprime sui social solo per le pagine senza una descrizione propria.</small>';
        if (k[0] === 'title') h += '<small>Vuoto = automatico dal nome del sito (vedi anteprima nel campo). Scrivi un testo per cambiarlo.</small>';
      });
      h += '<h3>Home</h3><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" id="c_home_marte" style="width:auto"' + (getVal(f.text, 'home_marte').toLowerCase() === 'false' ? '' : ' checked') + '> Mostra Marte animato nella home</label><small>Spento = Marte non viene proprio caricato (nemmeno l\'immagine). Dopo Salva serve il deploy (2-3 minuti).</small>';
      h += '<h3>Form contatti</h3><label>Protezione antispam</label><select id="c_captcha"><option value="turnstile"' + (getCap(f.text) === 'turnstile' ? ' selected' : '') + '>Turnstile (Cloudflare)</option><option value="altcha"' + (getCap(f.text) === 'altcha' ? ' selected' : '') + '>ALTCHA (calcolo nel browser, nessun servizio esterno)</option></select><small>Turnstile: ogni nuovo dominio va aggiunto nel pannello Cloudflare. ALTCHA: nessuna configurazione, funziona su qualsiasi dominio (già pronto e attivo).</small>';
      h += '<h3>Lettura</h3>';
      var ts = getVal(f.text, 'toc_style') === 'side' ? 'side' : 'box';
      h += '<label>Indice articoli</label><select id="c_toc_style"><option value="box"' + (ts === 'box' ? ' selected' : '') + '>Cornice in alto</option><option value="side"' + (ts === 'side' ? ' selected' : '') + '>Laterale sinistro (su mobile va in alto)</option></select>';
      var pp = parseInt(getPer(f.text), 10) || 5, ppo = [5, 10, 20, 50, 100];
      if (ppo.indexOf(pp) < 0) { ppo.push(pp); ppo.sort(function (a, b) { return a - b; }); }
      h += '<label>Articoli per pagina nel blog</label><select id="c_per_page">' + ppo.map(function (o) { return '<option' + (o === pp ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>';
      h += '<p><button class="btn primary" onclick="A.cfgSave()">Salva</button></p></div>';
      M().innerHTML = h + A.expBox() + A.tokBox();
    });
  };
  A.cfgSave = A.wrap(function () {
    var t = cfg.text;
    CFG_SAVE.forEach(function (k) {
      var nv = $('c_' + k[0]).value.trim();
      if (k[0] === 'title' && !nv) nv = 'blank'; // vuoto = automatico dal baseurl
      if (nv !== getVal(cfg.text, k[0])) t = setVal(t, k[0], nv);
    });
    var npp = $('c_per_page').value; if (npp !== getPer(cfg.text)) t = setPer(t, npp);
    var ncap = $('c_captcha').value; if (ncap !== getCap(cfg.text)) t = setCap(t, ncap);
    /* PUNTO CRITICO (CLAUDE.md punto 27): home_marte e' una chiave in prima colonna di _config.yml, letta da _pages/home.md (condizione Liquid if su site.home_marte).
       Qui NON e' in KEYS/CFG_SAVE perche' e' una spunta, non un testo. Se la riga sparisce dal config setVal non la ricrea e Marte resta acceso. */
    /* Marte in home: interruttore home_marte (true/false). Se la riga manca nel config non la creo: setVal non fa nulla e il default resta acceso. */
    var hm = $('c_home_marte').checked ? 'true' : 'false'; if (hm !== (getVal(cfg.text, 'home_marte').toLowerCase() === 'false' ? 'false' : 'true')) t = setVal(t, 'home_marte', hm);
    if (t === cfg.text) return A.toast('Nessuna modifica');
    return A.putFile('_config.yml', t, cfg.sha, 'admin: impostazioni').then(function () { A.toast('Salvato'); A.go('settings'); });
  });
})(A);
