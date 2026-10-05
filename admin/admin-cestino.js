/* Cestino: "Elimina" di articoli, progetti, servizi, news e pagine SPOSTA il file in _cestino/<tipo>/<AAAAMMGGHHMM>__<nome> invece di cancellarlo.
   Da qui si ripristina (torna al posto di prima) o si elimina per sempre. Vedi CLAUDE.md > Cestino.
   Spostare = UN commit (aggiunge il file nel cestino e toglie l'originale, A.commitFiles): un solo deploy, e il contenuto resta identico (si copia il base64).
   PUNTI CRITICI: (1) _cestino/ e' escluso da Jekyll in _config.yml (exclude): se lo togli i file del cestino potrebbero comparire nel sito.
   (2) il prefisso AAAAMMGGHHMM__ evita che due file con lo stesso nome si sovrascrivano nel cestino; il ripristino lo toglie.
   (3) il ripristino si rifiuta se nella cartella di origine esiste gia' un file con quel nome. (4) immagini, gallerie, categorie e backup NON passano di qui.
   (5) "Elimina per sempre" e "Svuota" sono definitivi dall'admin (resta solo la cronologia di GitHub). */
(function (A) {
  var esc = A.esc, M = function () { return A.main(); };
  var SUB = { _posts: 'posts', _projects: 'projects', _servizi: 'servizi', _news: 'news', _pages: 'pages' };
  var LAB = { posts: 'Articolo', projects: 'Progetto', servizi: 'Servizio', news: 'News', pages: 'Pagina' };
  var TR = [];
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  /* stampNow: AAAAMMGGHHMM dall'ora del sito (A.now = fuso del sito, senza offset). 12 cifre esatte: la regex di A.views.cestino e il ripristino
     (/^(\d{12})__(.+)$/) si aspettano esattamente questo formato, non cambiarlo senza cambiare anche quelle. */
  function stampNow() { return A.now().replace(/\D/g, '').slice(0, 12); }
  function fmtStamp(s) { return s.slice(6, 8) + '/' + s.slice(4, 6) + '/' + s.slice(0, 4) + ' ' + s.slice(8, 10) + ':' + s.slice(10, 12); }

  /* A.toTrash([{dir:'_posts', name:'x.md'}, ...], messaggio): sposta uno o piu' file nel cestino con UN commit. Legge i file uno alla volta (sequenziale apposta). */
  A.toTrash = function (items, msg) {
    /* UN solo timestamp per tutto il gruppo: i file spostati insieme stanno nello stesso minuto e il ripristino li riconosce. */
    var st = stampNow(), changes = [];
    return items.reduce(function (pr, it) {
      return pr.then(function () {
        var sub = SUB[it.dir]; if (!sub) throw new Error('Cartella non gestita dal cestino: ' + it.dir);
        return A.getFile(it.dir + '/' + it.name).then(function (f) {
          /* CRITICO: si copia il base64 cosi' com'e' (GitHub lo manda con "\n" ogni 60 caratteri, da togliere): niente decodifica/ricodifica UTF-8,
               il file nel cestino e' identico al byte, anche con accenti o a capo CRLF. Aggiunta + cancellazione stanno nello stesso commit: o tutte e due o nessuna. */
          changes.push({ path: '_cestino/' + sub + '/' + st + '__' + it.name, b64: f.content.replace(/\n/g, '') });
          /* sha = quello letto sopra: se il file e' stato modificato da qualcun altro mentre si spostava, il commit fallisce (409) e il cestino
             non porta via una versione vecchia lasciando perdere quella nuova. */
          changes.push({ path: it.dir + '/' + it.name, del: true, sha: f.sha });
        });
      });
    }, Promise.resolve()).then(function () { return A.commitFiles(changes, msg || ('admin: cestino ' + items.map(function (i) { return i.name; }).join(', ').slice(0, 120))); });
  };

  A.views.cestino = function () {
    var subs = Object.keys(LAB), list = [];
    return subs.reduce(function (pr, sub) {
      return pr.then(function () {
        /* getDir ritorna [] se la cartella non esiste (404): _cestino/ nasce al primo spostamento, prima il cestino e' semplicemente vuoto. */
        return A.getDir('_cestino/' + sub).then(function (fs) {
          fs.forEach(function (f) {
            var m = f.type === 'file' && /^(\d{12})__(.+)$/.exec(f.name);
            if (m) list.push({ sub: sub, path: '_cestino/' + sub + '/' + f.name, stamp: m[1], name: m[2] });
          });
        });
      });
    }, Promise.resolve()).then(function () {
      list.sort(function (a, b) { return a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : 0; });
      TR = list; /* i pulsanti usano l'INDICE in TR (A.trRestore(i)): dopo ogni azione si ricarica la vista con A.go, mai riusare un indice vecchio */
      var rows = list.map(function (r, i) {
        return '<div class="it"><span>' + esc(r.name) + '<small>' + esc(LAB[r.sub] + ' \u00b7 eliminato il ' + fmtStamp(r.stamp)) + '</small></span>' +
          '<div style="flex:none;white-space:nowrap"><button class="btn sm" onclick="A.trRestore(' + i + ')">Ripristina</button> ' +
          '<button class="btn sm danger" onclick="A.trKill(' + i + ')">Elimina per sempre</button></div></div>';
      }).join('');
      M().innerHTML = '<h2>Cestino ' + (list.length ? '<button class="btn danger sm" onclick="A.trEmpty()">Svuota cestino</button>' : '') + '</h2>' +
        '<div class="card"><p style="margin:0 0 12px;color:#787c82">Qui finiscono articoli, progetti, servizi e pagine eliminati. Ripristina li rimette al loro posto; Elimina per sempre li cancella (non si torna indietro dall\'admin).</p>' +
        '<div class="list">' + (rows || 'Il cestino \u00e8 vuoto.') + '</div></div>';
    });
  };

  A.trRestore = A.wrap(function (i) {
    var r = TR[i]; if (!r) return;
    var dir = '_' + r.sub;
    return A.getDir(dir).then(function (fs) {
      /* CRITICO: non si sovrascrive mai un file vivo. Se in origine c'e' gia' un file con quel nome (ricreato nel frattempo) il ripristino si ferma: rinominare uno dei due. */
      if (fs.some(function (f) { return f.name === r.name; })) { A.toast('Esiste gi\u00e0 un file ' + r.name + ' in ' + dir + ': non ripristinato', true); return null; }
      return A.getFile(r.path).then(function (f) {
        return A.commitFiles([{ path: dir + '/' + r.name, b64: f.content.replace(/\n/g, '') }, { path: r.path, del: true }], 'admin: ripristina dal cestino ' + r.name);
      }).then(function () { A.toast('Ripristinato: ' + r.name); A.go('cestino'); });
    });
  });

  A.trKill = A.wrap(function (i) {
    var r = TR[i]; if (!r) return;
    /* DEFINITIVO: delFile cancella davvero (un commit per file). Resta solo la cronologia di GitHub. */
    if (!confirm('Eliminare per sempre "' + r.name + '"? Non si pu\u00f2 annullare dall\'admin.')) return;
    return A.getFile(r.path).then(function (f) { return A.delFile(r.path, f.sha); }).then(function () { A.toast('Eliminato per sempre'); A.go('cestino'); });
  });

  A.trEmpty = A.wrap(function () {
    if (!TR.length) return;
    if (!confirm('Svuotare il cestino? ' + TR.length + ' elementi verranno eliminati per sempre.')) return;
    /* DEFINITIVO ma in UN commit solo (non N): usa la lista TR letta all'apertura della vista. */
    return A.commitFiles(TR.map(function (r) { return { path: r.path, del: true }; }), 'admin: svuota cestino').then(function () { A.toast('Cestino svuotato'); A.go('cestino'); });
  });
})(A);
