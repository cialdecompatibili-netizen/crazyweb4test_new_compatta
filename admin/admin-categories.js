/* Categorie articoli: elenco, rinomina/unisci, elimina. Vedi claude.md.
   In Jekyll le categorie NON hanno un elenco proprio: esistono solo perche' un post le scrive nel front matter
   ('categories: a b', separate da spazio, la forma che usa questo admin). Quindi "gestirle" = riscrivere quel
   campo nei post che le usano. Le pagine archivio (/blog/category/x/) le genera jekyll-archives da sole.
   [FONTE: jekyllrb.com/docs/posts (categories) e jekyll.github.io/jekyll-archives]
   Rinomina e elimina toccano N post ma fanno UN SOLO commit (A.commitFiles) = un solo deploy, non N. */
(function (A) {
  var esc = A.esc, M = function () { return A.main(); };
  var POSTS = []; // {path, text, fm, body, cats:[...]}

  /* Legge tutti i post (N+1 chiamate, come loadCats in admin-views.js) e ne ricava le categorie. */
  function load() {
    return A.getDir('_posts').then(function (l) {
      l = l.filter(function (f) { return f.type === 'file' && /\.md$/.test(f.name); });
      return A.getFiles('_posts', l); /* una query GraphQL + cache per sha invece di N richieste */
    }).then(function (fs) {
      POSTS = fs.filter(Boolean).map(function (f) {
        var s = A.splitFM(f.text);
        return { path: f.path, sha: f.sha, text: f.text, fm: s.fm, cats: A.fmGet(s.fm, 'categories').split(/\s+/).filter(Boolean) };
      });
    });
  }

  /* sha di ogni post (da getFiles) viaggia fino a commitFiles: se un articolo cambia mentre rinomini/elimini una categoria, il commit fallisce (409) e non sovrascrive la versione nuova con quella letta prima. */
  /* nome -> numero di post che la usano */
  function counts() {
    var c = {};
    POSTS.forEach(function (p) { p.cats.forEach(function (n) { c[n] = (c[n] || 0) + 1; }); });
    return c;
  }

  /* Riscrive 'categories:' di un post. Se non resta nessuna categoria toglie la riga (Jekyll assegna nessuna categoria). */
  function rewrite(p, cats) {
    var fm = (cats.length ? A.fmSet(p.fm, 'categories', cats.join(' ')) : A.fmDel(p.fm, 'categories')).replace(/(\r?\n)+$/, ''); // fmDel lascia un a-capo finale: senza questo resterebbe una riga vuota prima di '---'
    var eol = /\r\n/.test(p.text) ? '\r\n' : '\n';
    var body = A.splitFM(p.text).body;
    return '---' + eol + fm.replace(/\r?\n/g, eol) + eol + '---' + eol + body;
  }

  /* Un nome valido e' UNA parola (niente spazi: il campo e' separato da spazi), con caratteri semplici. */
  function clean(n) { return String(n || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, ''); }

  /* ---- Titolo/descrizione per categoria (_data/category_meta.yml) ----
     File YAML semplicissimo e prevedibile (una voce per categoria, due sotto-chiavi fisse title/desc,
     sempre tra virgolette doppie): per questo si legge/scrive con regex mirate invece di un parser YAML
     generico (zero librerie, zero build, come il resto dell'admin). Se in futuro servissero altre
     sotto-chiavi o valori con ": nel testo, va introdotto un parser vero: qui NON gestiamo escaping oltre
     alle virgolette doppie (yq() di admin.js copre lo stesso caso per il front matter dei post).
     Struttura per voce:
       nome-categoria:
         title: "..."
         desc: "..."
  */
  function cmParse(t) {
    var out = {}, re = /^([a-z0-9_-]+):\r?\n[ \t]+title:[ \t]*"((?:[^"\\]|\\.)*)"\r?\n[ \t]+desc:[ \t]*"((?:[^"\\]|\\.)*)"/gm, m;
    while ((m = re.exec(t))) out[m[1]] = { title: m[2].replace(/\\"/g, '"'), desc: m[3].replace(/\\"/g, '"') };
    return out;
  }
  function cmStringify(map) {
    var h = '# Titolo e descrizione personalizzati per ogni categoria di articoli, mostrati nella pagina\n' +
      '# /blog/category/<nome>/ (generata da jekyll-archives). Letto da _layouts/archive.liquid come\n' +
      '# site.data.category_meta[page.title] (page.title = nome esatto della categoria, es. "servizi").\n' +
      '# Editabile da admin > Categorie articoli (bottone "Modifica" accanto a Rinomina/Elimina).\n' +
      '# Una categoria senza voce qui (o con campi vuoti) usa il testo automatico di default: nessuna\n' +
      '# pagina si rompe. Vedi admin/claude.md.\n';
    Object.keys(map).sort().forEach(function (n) {
      var v = map[n];
      if (!v.title && !v.desc) return; // niente da dire su questa categoria: non scrivere una voce vuota
      h += n + ':\n  title: "' + String(v.title || '').replace(/"/g, '\\"') + '"\n  desc: "' + String(v.desc || '').replace(/"/g, '\\"') + '"\n';
    });
    return h;
  }

  A.views.cats = function () {
    return load().then(function () {
      var c = counts(), names = Object.keys(c).sort();
      var h = '<h2>Categorie articoli</h2><div class="card"><p>Le categorie nascono quando le usi in un articolo. Qui puoi rinominarle, unirle (rinomina con il nome di un\'altra) o eliminarle da tutti gli articoli. Ogni azione e\' un solo salvataggio.</p><div class="list">';
      if (!names.length) h += '<div class="it"><span>Nessuna categoria usata.</span></div>';
      names.forEach(function (n) {
        h += '<div class="it"><span>' + esc(n) + '<small>' + c[n] + ' articol' + (c[n] === 1 ? 'o' : 'i') + '</small></span>' +
          '<button class="btn sm" onclick="A.catEdit(\'' + A.jq(n) + '\')">Modifica</button>' +
          '<button class="btn sm" onclick="A.catRen(\'' + A.jq(n) + '\')">Rinomina</button>' +
          '<button class="btn sm danger" onclick="A.catDel(\'' + A.jq(n) + '\')">Elimina</button></div>';
      });
      h += '</div></div>';
      var nocat = POSTS.filter(function (p) { return !p.cats.length; }).length;
      if (nocat) h += '<div class="card"><small>' + nocat + ' articol' + (nocat === 1 ? 'o non ha' : 'i non hanno') + ' nessuna categoria (si assegna dall\'editor dell\'articolo).</small></div>';
      M().innerHTML = h;
    });
  };

  /* Rinomina 'da' in 'a'. Se 'a' esiste gia' le due si UNISCONO (un post non ripete mai la stessa categoria due volte). */
  A.catRen = A.wrap(function (da) {
    var a = clean(prompt('Nuovo nome per "' + da + '" (una parola, senza spazi).\nSe scrivi il nome di una categoria esistente le unisci:', da));
    if (!a || a === da) return;
    var ch = [];
    POSTS.forEach(function (p) {
      if (p.cats.indexOf(da) < 0) return;
      var nc = [];
      p.cats.forEach(function (x) { x = x === da ? a : x; if (nc.indexOf(x) < 0) nc.push(x); });
      ch.push({ path: p.path, sha: p.sha, text: rewrite(p, nc) });
    });
    if (!ch.length) return;
    return A.commitFiles(ch, 'admin: categoria ' + da + ' -> ' + a).then(function () { A.toast('Rinominata in ' + a + ' (' + ch.length + ' articoli)'); A.go('cats'); });
  });

  /* Elimina 'n' da tutti i post che la usano. Gli articoli restano, perdono solo quella categoria. */
  A.catDel = A.wrap(function (n) {
    var ch = [];
    POSTS.forEach(function (p) {
      if (p.cats.indexOf(n) < 0) return;
      ch.push({ path: p.path, sha: p.sha, text: rewrite(p, p.cats.filter(function (x) { return x !== n; })) });
    });
    if (!ch.length) return;
    if (!confirm('Togliere la categoria "' + n + '" da ' + ch.length + ' articol' + (ch.length === 1 ? 'o' : 'i') + '?\nGli articoli non vengono cancellati, perdono solo questa categoria.')) return;
    return A.commitFiles(ch, 'admin: elimina categoria ' + n).then(function () { A.toast('Categoria eliminata'); A.go('cats'); });
  });

  /* Vista "Modifica": titolo e descrizione mostrati nella pagina pubblica della categoria
     (/blog/category/<n>/). A.cmSave rilegge da solo lo sha corrente al momento del salvataggio
     (l'utente puo' restare aperto sul form a lungo prima di premere Salva): niente sha passato
     qui, per non rischiare di usarne uno vecchio (409/422, vedi admin.js putFile). */
  var CM_FILE = '_data/category_meta.yml';
  A.catEdit = A.wrap(function (n) {
    return A.getFile(CM_FILE).then(function (f) { return cmParse(f.text); },
      function (e) { if (e.status === 404) return {}; throw e; }
    ).then(function (map) {
      var v = map[n] || { title: '', desc: '' };
      var h = '<h2>Modifica categoria: ' + esc(n) + '</h2><div class="card">' +
        '<p><small>Testo mostrato quando si apre la pagina di questa categoria (es. /blog/category/' + esc(n) + '/). Lascia vuoto per usare il testo automatico.</small></p>' +
        '<label>Titolo</label><input id="cm_title" value="' + esc(v.title) + '" placeholder="vuoto = ' + esc(n) + '">' +
        '<label>Descrizione</label><input id="cm_desc" value="' + esc(v.desc) + '" placeholder="vuoto = elenco degli articoli in questa categoria">' +
        '<p><button class="btn primary" onclick="A.cmSave(\'' + A.jq(n) + '\')">Salva</button> <button class="btn" onclick="A.go(\'cats\')">Annulla</button></p></div>';
      M().innerHTML = h;
    });
  });
  A.cmSave = A.wrap(function (n) {
    return A.getFile(CM_FILE).then(function (f) { return { sha: f.sha, map: cmParse(f.text) }; },
      function (e) { if (e.status === 404) return { sha: '', map: {} }; throw e; }
    ).then(function (r) {
      r.map[n] = { title: A.$('cm_title').value.trim(), desc: A.$('cm_desc').value.trim() };
      return A.putFile(CM_FILE, cmStringify(r.map), r.sha, 'admin: testo categoria ' + n);
    }).then(function () { A.toast('Salvato'); A.go('cats'); });
  });
})(A);
