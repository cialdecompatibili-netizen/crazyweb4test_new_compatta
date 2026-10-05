/* Pagine + Menu/Submenu. Il menu al-folio si legge da front matter di _pages/*.md (nav, nav_order, dropdown, children). Vedi claude.md sez.4 */
(function (A) {
  var $ = A.$, esc = A.esc, M = function () { return A.main(); };
  var PG = []; // {name, sha, fm, body, title, nav, order, dropdown, permalink}
  var LK = [], LKSHA = ''; // voci-link da _data/menu_links.yml: [{title, url, order, blank}]
  var LKP = '_data/menu_links.yml';

  /* lkParse/lkYaml: il file e' scritto SOLO da qui, con un formato fisso (una voce = 4 righe, valori sempre tra
     virgolette doppie). Parsing manuale come kids(): se qualcuno lo edita a mano cambiando forma, le righe non
     riconosciute vengono ignorate (mai errori a caso). "[]" = nessuna voce. */
  function lkUnq(v) { return String(v || '').trim().replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\\\/g, '\\'); }
  function lkParse(t) {
    var out = [], cur = null;
    String(t || '').split(/\r?\n/).forEach(function (ln) {
      var m = ln.match(/^- title:\s*(.*)$/);
      if (m) { cur = { title: lkUnq(m[1]), url: '', order: 50, blank: false }; out.push(cur); return; }
      if (!cur) return;
      m = ln.match(/^\s+(url|order|blank):\s*(.*)$/);
      if (!m) return;
      if (m[1] === 'url') cur.url = lkUnq(m[2]);
      else if (m[1] === 'order') cur.order = parseFloat(m[2]) || 50;
      else cur.blank = /^true$/i.test(m[2].trim());
    });
    return out;
  }
  function lkQ(v) { return '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
  function lkYaml(a) {
    var head = '# Voci-link del menu (gestite da /admin/ > Menu). Non sono pagine: nessun permalink, nessuna collisione.\n';
    if (!a.length) return head + '[]\n';
    return head + a.map(function (k) { return '- title: ' + lkQ(k.title) + '\n  url: ' + lkQ(k.url) + '\n  order: ' + k.order + '\n  blank: ' + (k.blank ? 'true' : 'false'); }).join('\n') + '\n';
  }
  function lkLoad() {
    return A.getFile(LKP).then(function (f) { LK = lkParse(f.text); LKSHA = f.sha; }, function () { LK = []; LKSHA = ''; });
  }

  function load() {
    return lkLoad().then(function () { return A.getDir('_pages'); }).then(function (l) {
      l = l.filter(function (f) { return f.type === 'file' && /\.md$/.test(f.name); });
      return A.getFiles('_pages', l, { strict: true }); /* una query GraphQL + cache per sha; strict = se una pagina non si legge l'errore resta visibile come prima */
    }).then(function (fs) {
      PG = fs.map(function (f) {
        var s = A.splitFM(f.text), fm = s.fm;
        return { name: f.path.split('/').pop(), sha: f.sha, fm: fm, body: s.body, title: A.fmGet(fm, 'title'),
          nav: A.fmGet(fm, 'nav') === 'true', order: parseFloat(A.fmGet(fm, 'nav_order')),
          dropdown: A.fmGet(fm, 'dropdown') === 'true', permalink: A.fmGet(fm, 'permalink'), hidden: /^published:[ \t]*false\b/m.test(fm) };
      });
      return PG;
    });
  }
  /* IMPORTANTE: "dropdown"/"children" NON sono documentati in al-folio docs/CUSTOMIZE.md — sono
     un meccanismo interno del layout _includes/header.liquid della gem al_folio_core (v1.x, non
     presente in questo repo perche' gem-owned: vedi claude.md sez.1 e la tabella "Where common
     files moved in v1.x" in CUSTOMIZE.md). Il comportamento qui sotto e' stato dedotto studiando
     l'output della gem installata localmente (claude.md sez.4), non dalla documentazione
     ufficiale: se in un futuro aggiornamento della gem cambia il formato di "children:", questa
     funzione va riverificata contro la gem reale, non contro questo commento.
     kids() fa un parsing MANUALE (non YAML vero) del blocco multilinea:
       children:
         - title: nome
           permalink: /path/
         - title: divider
     Funziona SOLO se il blocco resta in questa identazione esatta (2 spazi per "- title", 4 per
     "permalink", come lo scrive kidsYaml() sotto). Un utente che modifica "children:" a mano nel
     Front matter grezzo (es. dal box "Front matter (YAML)" della vista Pagine) con un'indentazione
     diversa, con "- title:" e "permalink:" sulla stessa riga, o con virgolette diverse, rompe
     silenziosamente questo parser: kids() torna un array vuoto o incompleto, senza errori. */
  function kids(fm) { return kids0(fm).filter(function (k) { return k.title !== 'divider'; }); } /* divisori NON mostrati: li mette kidsYaml */
  function kids0(fm) { // legge children: [{title, permalink}]
    var out = [], m = fm.match(/^children:\s*\r?\n((?:[ \t]+.*\r?\n?)*)/m);
    if (!m) return out;
    m[1].split(/\r?\n/).forEach(function (ln) {
      var t = ln.match(/^\s*-\s*title:\s*(.*)$/);
      if (t) out.push({ title: t[1].trim().replace(/^["']|["']$/g, ''), permalink: '' });
      var p = ln.match(/^\s+permalink:\s*(.*)$/);
      if (p && out.length) out[out.length - 1].permalink = p[1].trim().replace(/^["']|["']$/g, '');
    });
    return out;
  }
  /* kidsYaml: SCRIVE il blocco children: con l'identazione esatta che kids() sa rileggere (2 spazi per '- title', 4 per 'permalink'). Se cambi l'identazione qui devi cambiare anche il regex di kids(), e viceversa. children/dropdown: [DEDOTTO dalla gem al_folio_core, NON documentato in docs/CUSTOMIZE.md - vedi commento in cima a kids()]. Il permalink e' scritto SENZA yq(): va bene per percorsi ('/books/') e URL ('https://x.it/a', i due punti non seguiti da spazio sono validi in YAML). Rompe il YAML un permalink con ': ' (due punti + spazio) o con ' #'. Il template tratta come link esterno solo cio' che contiene '://' (header.liquid, riga con child.permalink contains '://'), tutto il resto passa da relative_url. [DEDOTTO dalla gem al_folio_core, NON documentato in CUSTOMIZE.md] */
  function kidsYaml(arr) {
    arr = arr.filter(function (k) { return k.title && k.title !== 'divider'; });
    if (!arr.length) arr = [{ title: 'divider' }]; /* children: deve esistere */ if (arr.length > 1) arr = arr.reduce(function (o, k, i) { if (i) o.push({ title: 'divider' }); o.push(k); return o; }, []); /* DIVISORE AUTOMATICO: tra una voce e la successiva, mai dopo l'ultima */
    return 'children:\n' + arr.map(function (k) {
      return k.title === 'divider' ? '  - title: divider' : '  - title: ' + A.yq(k.title) + '\n    permalink: ' + k.permalink;
    }).join('\n');
  }

  /* ---- Pagine ---- */
  /* dopo aver nascosto/pubblicato una pagina l'elenco in memoria (PG, con sha) va riletto: altrimenti 'Modifica' userebbe uno sha vecchio e darebbe conflitto */
  A.afterPub = function (key) { if (key === 'pages') return load(); };
  A.views.pages = function () {
    return load().then(function () {
      var h = '<h2>Pagine <button class="btn primary sm" onclick="A.pgEdit()">+ Nuova</button></h2><div class="card list">';
      PG.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; }).forEach(function (p) {
        h += '<div class="it' + (p.hidden ? ' hid' : '') + '">' + (p.permalink === '/' ? '' : A.eyeBtn(p.name, p.hidden, 'pages')) + '<span>' + esc(p.title || p.name) + '<small>' + esc(p.name) + (p.nav ? ' - nel menu' : '') + '</small></span>' +
          '<button class="btn sm" onclick="A.pgEdit(\'' + A.jq(p.name) + '\')">Modifica</button>' +
          (p.permalink === '/' ? '' : '<button class="btn sm danger" onclick="A.pgDel(\'' + A.jq(p.name) + '\')">Elimina</button>') + '</div>';
      });
      M().innerHTML = h + '</div>';
    });
  };
  var curP = null;
  A.pgEdit = function (name) {
    var p = PG.filter(function (x) { return x.name === name; })[0];
    curP = p || { name: '', sha: '', fm: 'layout: page\ntitle: \nnav: false', body: '' };
    /* LAYOUT "WORDPRESS": prima quello che si scrive (Titolo + Corpo con toolbar), poi le impostazioni.
       Il front matter YAML NON sparisce: sta in <details> "Impostazioni avanzate" (chiuso), cosi' non
       copre piu' il testo. pgSave() lo legge comunque per id (p_fm), quindi nulla cambia nel salvataggio. */
    var pHid = !!(p && p.hidden), pHome = !!(p && p.permalink === '/'); /* la home non si nasconde */
    var save = '<button class="btn primary svb" onclick="A.pgSave()">' + A.saveLbl(pHid) + '</button><button class="btn" onclick="A.go(\'pages\')">Annulla</button>';
    var h = '<h2>' + (p ? 'Modifica ' + esc(p.name) : 'Nuova pagina') + '</h2><div class="card">' +
      '<p style="position:sticky;top:0;background:inherit;z-index:2;margin:0 0 10px">' + save + '</p>' +
      (p ? '' : '<label>Nome file (senza .md)</label><input id="p_name" placeholder="chi-siamo">') +
      '<label>Titolo</label><input id="p_title" value="' + esc(A.fmGet(curP.fm, 'title')) + '">' +
      (p ? (function () {
        /* URL pubblico: baseurl + permalink del front matter (o /<nome>/ se manca). Solo lettura. */
        var pl = (A.fmGet(curP.fm, 'permalink') || '/' + p.name.replace(/\.md$/, '') + '/').replace(/^["']|["']$/g, '');
        var u = location.origin + A.baseurl() + (pl.charAt(0) === '/' ? pl : '/' + pl);
        return '<label>URL pubblico</label><p style="margin:4px 0 10px"><a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + '</a></p>';
      })() : '') +
            '<label>Corpo (Markdown)</label>' + pgToolbar() + '<textarea id="body" style="min-height:340px">' + esc(curP.body) + '</textarea><div id="mdPrev" class="mdprev" style="display:none"></div>' +
      /* SEO sotto il Corpo (stesso ordine dell'editor articoli). Solo posizione: pgSave() li legge per id. */
      '<label>SEO Title (vuoto = usa il titolo)</label><input id="p_seot" value="' + esc(A.fmGet(curP.fm, 'seo_title')) + '">' +
      '<label>SEO Description (vuoto = estratto automatico del testo)</label><input id="p_seod" value="' + esc(A.fmGet(curP.fm, 'seo_description')) + '">' +
      (pHome ? '' : A.hideBox(pHid, 'p_hidden')) + (A.expert() ? '<details style="margin:14px 0"><summary style="cursor:pointer;font-weight:600">Impostazioni avanzate (front matter YAML)</summary>' : '<div style="display:none">') +
      '<p style="margin:6px 0"><small>Layout, permalink, menu, ecc. Se rompi il YAML la pagina sparisce dal sito senza errore visibile.</small></p>' +
      '<textarea id="p_fm" style="min-height:200px">' + esc(curP.fm) + '</textarea>' + (A.expert() ? '</details>' : '</div>') +
      '<p>' + save + '</p></div>';
    M().innerHTML = h;
    if (window.mdStart) window.mdStart();
  };
  /* Toolbar delle pagine: stessa dei post (window.mdIns e' definita in admin-views.js e agisce su #body).
     La duplico in piccolo qui per non dipendere dall'ordine di caricamento dei due file. */
  function pgToolbar() {
    return '<div class="tools">' +
      '<button class="btn sm" id="mdPrevBtn" onclick="mdPrev()">Sorgente</button>' +
      '<button class="btn sm" onclick="mdIns(\'**\',\'**\')"><b>B</b></button>' +
      '<button class="btn sm" onclick="mdIns(\'*\',\'*\')"><i>I</i></button>' +
      '<button class="btn sm" onclick="mdIns(\'\\n## \',\'\')">H2</button>' +
      '<button class="btn sm" onclick="mdIns(\'\\n- \',\'\')">Lista</button>' +
      '<button class="btn sm" onclick="mdIns(\'[\',\'](https://)\')">Link</button>' +
      '<button class="btn sm" onclick="mdImg()" title="Scegli o carica una foto e scegli la posizione">Img</button>' +
      '<button class="btn sm" onclick="mdGal()">Galleria</button>' +
      '<button class="btn sm" onclick="mdMore()" title="Nell\'elenco del blog l\'estratto finisce qui">Leggi tutto</button></div>';
  }
  /* A.pgSave: salva una pagina di _pages/. Il YAML puo' essere modificato a mano dall'utente: se lo rompe (indentazione, due punti non quotati) la pagina SPARISCE dal build, senza errore visibile. Le pagine hanno 'layout' e 'permalink' [DOC al-folio CUSTOMIZE.md: 'change the layout attribute ... and the path to access it by changing the permalink']. sha e' obbligatorio per aggiornare un file esistente (vedi putFile). Eliminare o rinominare permalink '/' rompe la home. */
  A.pgSave = A.wrap(function () {
    var name = curP.name || (($('p_name') || {}).value || '').trim();
    if (!name) return A.toast('Nome file obbligatorio', true);
    name = A.slugify(name.replace(/\.md$/, '')).replace(/-/g, '_') === '' ? name : name.replace(/\.md$/, '');
    /* SEO: i due campi (sotto il Corpo) vengono scritti DENTRO il front matter prima del salvataggio.
       Vuoto = riga rimossa (il sito usa il fallback in _includes/metadata.liquid). yq() e' obbligatorio:
       un titolo SEO con ":" o virgolette romperebbe il YAML e la pagina sparirebbe dal build. */
    var pfm = $('p_fm').value;
    /* Campi "semplici" sopra il Corpo -> riscritti nel YAML. Ordine: prima il YAML avanzato (come l'ha
       lasciato l'utente), poi sovrascrivo solo i campi che ha toccato nei box semplici.
       title passa da yq() (un ':' lo romperebbe). */
    if ($('p_title')) pfm = A.fmSet(pfm, 'title', A.yq($('p_title').value.trim()));
    /* permalink STABILE: il segnaposto '/nuova/' NON esiste piu'. Il template di una pagina nuova
       non ha permalink; al salvataggio, se manca (o e' rimasto il vecchio '/nuova/' di file creati
       prima), lo ricavo SEMPRE da '/<nome-file>/'. Un permalink scritto a mano nel YAML avanzato
       (es. '/' per la home) non viene mai toccato. */
    var pmv = A.fmGet(pfm, 'permalink');
    if (!pmv || /^["']?\/nuova\/?["']?$/.test(pmv)) pfm = A.fmSet(pfm, 'permalink', '/' + name.replace(/\.md$/, '') + '/');
    [['seo_title', 'p_seot'], ['seo_description', 'p_seod']].forEach(function (s) {
      var v = ($(s[1]).value || '').trim();
      pfm = v ? A.fmSet(pfm, s[0], A.yq(v)) : A.fmDel(pfm, s[0]);
    });
    if ($('p_hidden')) pfm = $('p_hidden').checked ? A.fmSet(pfm, 'published', 'false') : A.fmDel(pfm, 'published'); /* nascosta = published: false */
    var txt = '---\n' + pfm.replace(/\n+$/, '') + '\n---\n\n' + $('body').value.replace(/^\n+/, '');
    return A.putFile('_pages/' + name + '.md', txt, curP.sha, 'admin: pagina ' + name).then(function () { A.toast('Salvato'); A.go('pages'); });
  });
  /* A.pgDel: elimina il file. Effetti collaterali NON automatici: se la pagina era in un dropdown (children: di un'altra pagina) il link nel menu resta e punta a un 404; se era in nav resta il buco nell'ordine. L'admin avvisa solo con confirm(): controllare il Menu dopo. La pagina con permalink '/' (home) non ha il bottone Elimina: non rimuoverlo. */
  A.pgDel = A.wrap(function (name) {
    /* dal cestino (admin-cestino.js) la pagina si ripristina, ma il menu NON si ripara da solo: voci/dropdown che la puntano restano 404 finche' non e' tornata. */
    if (!confirm('Spostare ' + name + ' nel cestino? Controlla poi il menu.')) return;
    return A.toTrash([{ dir: '_pages', name: name }], 'admin: cestino pagina ' + name).then(function () { A.toast('Spostata nel cestino'); A.go('pages'); });
  });

  /* ---- Menu ---- */
  A.views.menu = function () {
    return load().then(function () {
      var top = PG.filter(function (p) { return p.nav; }).sort(function (a, b) { return (a.order || 99) - (b.order || 99); });
      var h = '<h2>Menu</h2><div class="card"><p>Cambia titolo e ordine delle voci (numero piu basso = piu a sinistra). Le pagine "Dropdown" sono submenu.</p><div id="mn">';
      top.forEach(function (p, i) {
        h += '<div class="mrow" data-n="' + esc(p.name) + '"><input class="m_t" value="' + esc(p.title) + '"><input class="m_o" type="number" value="' + (p.order || (i + 1)) + '">' +
          '<span>' + (p.dropdown ? 'Dropdown' : esc(p.permalink)) + '</span><button class="btn sm danger" onclick="A.mnOff(\'' + A.jq(p.name) + '\')">Togli</button></div>';
        if (p.dropdown) {
          h += '<div class="sub" data-d="' + esc(p.name) + '">';
          kids(p.fm).forEach(function (k) {
            h += '<div class="mrow k"><input class="k_t" value="' + esc(k.title) + '"><input class="k_p" value="' + esc(k.permalink) + '" placeholder="/percorso/ o https://"><span></span><button class="btn sm danger" onclick="this.parentNode.remove()">x</button></div>';
          });
          h += '<button class="btn sm" onclick="A.kAdd(this)">+ Voce submenu</button></div>';
        }
      });
      h += '</div><p><button class="btn primary" onclick="A.mnSave()">Salva menu</button></p></div>';
      var off = PG.filter(function (p) { return !p.nav && p.permalink && !/404/.test(p.permalink); });
      if (off.length) {
        h += '<div class="card"><h3>Aggiungi una pagina al menu</h3><p><button class="btn" id="of_b" onclick="A.ofT()">Scegli una pagina (' + off.length + ') &#9662;</button> <input id="of_q" placeholder="Cerca pagina..." oninput="A.ofF()" style="display:none"></p><div class="list" id="of_l" style="display:none;max-height:300px;overflow:auto">';
        off.forEach(function (p) { h += '<div class="it" data-s="' + esc(((p.title || p.name) + ' ' + p.permalink).toLowerCase()) + '"><span>' + esc(p.title || p.name) + '<small>' + esc(p.permalink) + '</small></span><button class="btn sm" onclick="A.mnOn(\'' + A.jq(p.name) + '\')">Aggiungi al menu</button></div>'; });
        h += '</div></div>';
      }
      h += '<div class="card"><h3>Voci link personalizzate</h3><p>Voci di menu che puntano a un URL qualsiasi (pagina del sito o link esterno). Non creano pagine: puoi avere piu voci verso la stessa destinazione senza conflitti.</p><div id="lk">';
      LK.forEach(function (k) {
        h += '<div class="mrow l"><input class="l_t" value="' + esc(k.title) + '"><input class="l_u" value="' + esc(k.url) + '" placeholder="/percorso/ o https://"><input class="l_o" type="number" value="' + esc(String(k.order)) + '"><label style="white-space:nowrap"><input class="l_b" type="checkbox"' + (k.blank ? ' checked' : '') + '> nuova scheda</label><button class="btn sm danger" onclick="this.parentNode.remove()">x</button></div>';
      });
      h += '</div><p><button class="btn sm" onclick="A.lkAdd()">+ Voce link</button> <button class="btn primary" onclick="A.lkSave()">Salva voci link</button></p></div>';
      h += '<div class="card"><h3>Nuovo submenu</h3><p>Crea un dropdown vuoto, poi aggiungi le voci.</p><input id="dd_t" placeholder="Titolo dropdown"><p><button class="btn" onclick="A.ddNew()">Crea submenu</button></p></div>';
      M().innerHTML = h;
    });
  };
  /* Tendina 'Aggiungi una pagina al menu': il pulsante apre/chiude ricerca + elenco (max 300 px, scorre). La ricerca filtra per titolo o indirizzo, solo visivo. */
  A.ofT = function () {
    var l = $('of_l'), q = $('of_q'), open = l.style.display === 'none';
    l.style.display = open ? '' : 'none'; q.style.display = open ? '' : 'none';
    if (open) { q.value = ''; A.ofF(); q.focus(); }
  };
  A.ofF = function () {
    var q = ($('of_q').value || '').toLowerCase().trim();
    Array.prototype.forEach.call(document.querySelectorAll('#of_l .it'), function (r) { r.style.display = r.getAttribute('data-s').indexOf(q) >= 0 ? '' : 'none'; });
  };
  A.kAdd = function (btn, div) {
    var d = document.createElement('div'); d.className = 'mrow k';
    d.innerHTML = div ? '<input class="k_t" value="divider" readonly><input class="k_p" value="" readonly><span></span><button class="btn sm danger" onclick="this.parentNode.remove()">x</button>'
      : '<input class="k_t" placeholder="Titolo"><input class="k_p" placeholder="/percorso/ o https://"><span></span><button class="btn sm danger" onclick="this.parentNode.remove()">x</button>';
    btn.parentNode.insertBefore(d, btn);
  };
  function setNav(name, on) {
    var p = PG.filter(function (x) { return x.name === name; })[0], fm = A.fmSet(p.fm, 'nav', on ? 'true' : 'false');
    if (on && !/^nav_order:/m.test(fm)) fm = A.fmSet(fm, 'nav_order', '20');
    if (!on) fm = A.fmDel(fm, 'nav_order');
    return A.putFile('_pages/' + name, '---\n' + fm.replace(/\n+$/, '') + '\n---\n' + (p.body.charAt(0) === '\n' ? '' : '\n') + p.body, p.sha, 'admin: menu ' + (on ? 'aggiungi ' : 'togli ') + name);
  }
  /* mnOff/mnOn: togliere/aggiungere una pagina al menu = cambiare 'nav: false/true' nel front matter [DOC al-folio: 'nav: true' nel front matter di _pages, es. bookshelf]. NON cancella la pagina: resta raggiungibile dal suo permalink. mnOn assegna nav_order 20 (finisce in fondo): [nav_order DEDOTTO dalla gem, non citato in CUSTOMIZE.md; ordine = 'sort: nav_order' in header.liquid]. */
  A.mnOff = A.wrap(function (n) { if (!confirm('Togliere dal menu?')) return; return setNav(n, false).then(function () { A.toast('Tolto'); A.go('menu'); }); });
  A.mnOn = A.wrap(function (n) { return setNav(n, true).then(function () { A.toast('Aggiunto (ordine 20, modificalo)'); A.go('menu'); }); });

  /* mvNew: crea una NUOVA pagina gia' nel menu. Il permalink deve iniziare e finire con '/' (lo forzo) e non deve gia' esistere: due pagine con lo stesso permalink si sovrascrivono in build e una sparisce. Il nome file deriva dal titolo (slugify + '_'), quindi due titoli uguali sovrascrivono lo stesso file. */
  /* mvNew: DISATTIVATO. Creava un file pagina con quel permalink: due voci verso lo stesso URL = due pagine con lo
     stesso permalink, una sostituiva l'altra e la pagina restava vuota. Ora le voci di menu personalizzate sono
     "voci link" (lkAdd/lkSave): righe in _data/menu_links.yml, non pagine, quindi zero collisioni. */
  A.mvNew = function () { A.toast('Usa "Voci link personalizzate"', true); };

  /* lkAdd: aggiunge una riga vuota nell'editor (nulla viene salvato finche non premi "Salva voci link"). */
  A.lkAdd = function () {
    var d = document.createElement('div'); d.className = 'mrow l';
    d.innerHTML = '<input class="l_t" placeholder="Titolo"><input class="l_u" placeholder="/percorso/ o https://"><input class="l_o" type="number" value="50"><label style="white-space:nowrap"><input class="l_b" type="checkbox"> nuova scheda</label><button class="btn sm danger" onclick="this.parentNode.remove()">x</button>';
    $('lk').appendChild(d);
  };
  /* lkSave: riscrive TUTTO il file dati in un solo commit (una PUT, sha letto in load()). Le righe senza titolo o
     senza url vengono scartate. Un url interno deve iniziare con '/' (lo forzo); esterno = contiene '://'.
     Nessun controllo "permalink gia usato": e' voluto, piu voci possono puntare alla stessa pagina. */
  A.lkSave = A.wrap(function () {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll('#lk > .mrow'), function (r) {
      var t = r.querySelector('.l_t').value.trim(), u = r.querySelector('.l_u').value.trim();
      if (!t || !u) return;
      if (u.indexOf('://') < 0 && u.charAt(0) !== '/') u = '/' + u;
      out.push({ title: t, url: u, order: parseFloat(r.querySelector('.l_o').value) || 50, blank: r.querySelector('.l_b').checked });
    });
    return A.putFile(LKP, lkYaml(out), LKSHA, 'admin: voci link menu').then(function () { A.toast('Voci link salvate'); A.go('menu'); });
  });

  /* ddNew: crea un submenu = pagina con 'dropdown: true' + 'children:' iniziale con un solo 'divider' (deve esistere almeno la chiave children, altrimenti il template non trova la lista). [DEDOTTO dalla gem al_folio_core / header.liquid, NON documentato in CUSTOMIZE.md]. Riverificare se si aggiorna la gem. */
  A.ddNew = A.wrap(function () {
    var t = ($('dd_t').value || '').trim(); if (!t) return A.toast('Titolo obbligatorio', true);
    var fm = 'layout: page\ntitle: ' + A.yq(t) + '\nnav: true\nnav_order: 20\ndropdown: true\nchildren:\n  - title: divider';
    return A.putFile('_pages/' + A.slugify(t).replace(/-/g, '_') + '.md', '---\n' + fm + '\n---\n', '', 'admin: nuovo submenu ' + t).then(function () { A.toast('Creato'); A.go('menu'); });
  });

  /* mnSave: salva TUTTE le righe modificate del menu, una PUT per file, in SEQUENZA (reduce). Non in parallelo: ogni PUT crea un commit e due PUT simultanee sullo stesso branch danno 409. Riscrive 'children:' rimuovendo il vecchio blocco con regex e riaccodando kidsYaml(): funziona solo con l'identazione attesa (vedi kids). Salva solo i file cambiati (fm !== p.fm) per non fare commit inutili. Ogni file salvato fa partire un deploy: molti salvataggi = molti build in coda. */
  A.mnSave = A.wrap(function () {
    var rows = document.querySelectorAll('#mn > .mrow'), jobs = [];
    for (var i = 0; i < rows.length; i++) {
      (function (r) {
        var n = r.getAttribute('data-n'), p = PG.filter(function (x) { return x.name === n; })[0], fm = p.fm;
        fm = A.fmSet(fm, 'title', A.yq(r.querySelector('.m_t').value.trim()));
        fm = A.fmSet(fm, 'nav_order', r.querySelector('.m_o').value || '20');
        if (p.dropdown) {
          var box = document.querySelector('.sub[data-d="' + n + '"]'), ks = [];
          Array.prototype.forEach.call(box.querySelectorAll('.k'), function (k) {
            ks.push({ title: k.querySelector('.k_t').value.trim(), permalink: k.querySelector('.k_p').value.trim() });
          });
          ks = ks.filter(function (k) { return k.title && k.title !== 'divider' && k.permalink; });
          fm = fm.replace(/^children:\s*\r?\n(?:[ \t]+.*\r?\n?)*/m, '').replace(/\n+$/, '') + '\n' + kidsYaml(ks);
        }
        if (fm !== p.fm) jobs.push({ n: n, p: p, fm: fm });
      })(rows[i]);
    }
    if (!jobs.length) return A.toast('Nessuna modifica');
    return jobs.reduce(function (pr, j) {
      return pr.then(function () { return A.putFile('_pages/' + j.n, '---\n' + j.fm.replace(/\n+$/, '') + '\n---\n' + (j.p.body.charAt(0) === '\n' ? '' : '\n') + j.p.body, j.p.sha, 'admin: menu ' + j.n); });
    }, Promise.resolve()).then(function () { A.toast('Menu salvato'); A.go('menu'); });
  });
})(A);
