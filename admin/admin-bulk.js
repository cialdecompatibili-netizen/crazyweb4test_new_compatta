/* Azioni di gruppo sugli elenchi Articoli, Progetti, Servizi, News: spunta piu' righe, poi Nascondi / Mostra / Categoria / Cestino.
   Ogni azione e' UN SOLO commit con tutti i file (A.commitFiles): un solo deploy, e o passano tutti o nessuno. Vedi CLAUDE.md > Azioni di gruppo.
   La selezione sta in A.sel[chiave] = {nomeFile:true} e resta quando cambi filtri o pagina; si svuota dopo l'azione.
   PUNTI CRITICI: (1) Nascondi/Mostra toccano solo la riga "published: false" del front matter. (2) Categoria sostituisce la riga
   categories (articoli) o category (progetti); sugli articoli CAMBIA L'URL (/blog/<categoria>/...) e i vecchi indirizzi non reindirizzano.
   Si rifiuta se la categoria e' scritta come elenco su piu' righe (non la sappiamo riscrivere senza rischi). (3) Cestino usa A.toTrash (admin-cestino.js).
   (4) i file si leggono uno alla volta, apposta (GitHub sconsiglia le richieste in parallelo). */
(function (A) {
  var esc = A.esc;
  var DIR = { posts: '_posts', projects: '_projects', servizi: '_servizi', news: '_news' };
  var CATF = { posts: 'categories', projects: 'category' };
  function names(key) { var s = A.sel[key] || {}; return Object.keys(s).filter(function (k) { return s[k]; }); }
  function label(n) { return n + (n === 1 ? ' selezionato' : ' selezionati'); }

  A.bulkBar = function (key) {
    var n = names(key).length, vis = A.lstNames(key), s = A.sel[key] || {};
    var all = vis.length > 0 && vis.every(function (x) { return s[x]; });
    function b(act, txt, cls) { return '<button class="btn sm' + (cls ? ' ' + cls : '') + '" onclick="A.bulk(\'' + key + '\',\'' + act + '\')">' + txt + '</button>'; }
    return '<div id="bk_' + key + '" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px">' +
      '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:0"><input type="checkbox" style="width:auto;margin:0"' + (all ? ' checked' : '') + ' onchange="A.selAll(\'' + key + '\',this.checked)"> Seleziona tutti</label>' +
      '<small class="bkn" style="color:#787c82">' + label(n) + '</small>' +
      b('hide', 'Nascondi') + b('show', 'Mostra') + (CATF[key] ? b('cat', 'Categoria\u2026') : '') + b('trash', 'Cestino', 'danger') + '</div>';
  };
  A.bulkRefresh = function (key) {
    var el = document.querySelector('#bk_' + key + ' .bkn'); if (el) el.textContent = label(names(key).length);
  };
  A.selTog = function (key, name, on) {
    var s = A.sel[key] || (A.sel[key] = {}); if (on) s[name] = true; else delete s[name];
    A.bulkRefresh(key);
  };
  A.selAll = function (key, on) {
    var s = A.sel[key] || (A.sel[key] = {});
    A.lstNames(key).forEach(function (x) { if (on) s[x] = true; else delete s[x]; });
    A.lstRender(key);
  };

  /* legge i file selezionati uno alla volta, applica fn(front matter) e fa UN commit con quelli cambiati */
  function editMany(key, ns, fn, msg) {
    var changes = [];
    return ns.reduce(function (pr, n) {
      return pr.then(function () {
        return A.getFile(DIR[key] + '/' + n).then(function (f) {
          var s = A.splitFM(f.text); if (!s.fm) throw new Error('Front matter non trovato in ' + n); /* un errore qui ferma TUTTO prima del commit: nessun file viene toccato */
          var fm = fn(s.fm, n); if (fm === s.fm) return; /* gia' nello stato voluto: il file si salta e non entra nel commit */
          /* CRITICO: i file del repo possono essere CRLF o LF (misti!). Si riusa lo stesso a capo del file letto, altrimenti ogni azione di gruppo
             riscriverebbe tutte le righe e il diff di GitHub mostrerebbe l'intero file cambiato. Si rimonta '---' + fm + '---' + body come fa splitFM:
             il corpo (s.body) NON si tocca mai. */
          var nl = f.text.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
          /* CRITICO: sha = quello appena letto. commitFiles confronta con il repo e, se il file e' cambiato nel frattempo (altra scheda, push da PC),
             il commit fallisce con 409 e NON scrive niente: senza, qui sotto si sovrascriveva in silenzio la versione piu' nuova. */
          changes.push({ path: DIR[key] + '/' + n, sha: f.sha, text: '---' + nl + fm.replace(/\r?\n+$/, '') + nl + '---' + nl + s.body });
        });
      });
    }, Promise.resolve()).then(function () {
      if (!changes.length) { A.toast('Niente da cambiare'); return null; }
      return A.commitFiles(changes, msg + ' (' + changes.length + ')').then(function () { return changes.length; });
    });
  }
  /* done: svuota la selezione e rilegge l'elenco dal repo (A.go): le modifiche si vedono subito nell'admin, il sito pubblico si aggiorna dopo il deploy (1-2 min). */
  function done(key, txt) { A.sel[key] = {}; A.toast(txt); A.go(key); }

  A.bulk = A.wrap(function (key, act) {
    var ns = names(key), N = ns.length;
    if (!N) { A.toast('Seleziona almeno un elemento', true); return; }
    if (act === 'hide' || act === 'show') {
      /* CRITICO: Nascondi = riga "published: false" (stesso flag dell'occhio, NON "draft"); Mostra = la riga sparisce (fmDel), non diventa "true".
         Un articolo nascosto resta nel repo ma Jekyll non lo pubblica: i link scritti a mano verso di lui danno 404. */
      return editMany(key, ns, function (fm) { return act === 'hide' ? A.fmSet(fm, 'published', 'false') : A.fmDel(fm, 'published'); }, 'admin: ' + (act === 'hide' ? 'nascondi' : 'mostra') + ' ' + key)
        .then(function (c) { if (c) done(key, (act === 'hide' ? 'Nascosti ' : 'Mostrati ') + c + ' (pubblicazione in corso)'); });
    }
    if (act === 'cat') {
      var f = CATF[key]; if (!f) return;
      /* CRITICO: la categoria scelta SOSTITUISCE tutte quelle esistenti (fmSet riscrive l'intera riga): un articolo con "sport cronaca" resta solo con la nuova.
         Il valore passa da slugify, quindi e' una sola parola senza spazi ne' due punti (niente yq necessario). Su 'posts' la prima categoria decide l'URL. */
      var v = prompt('Nuova categoria per ' + N + ' elementi (vuoto = nessuna categoria).' + (key === 'posts' ? '\nAttenzione: cambia l\'indirizzo degli articoli (/blog/<categoria>/...) e i vecchi indirizzi non reindirizzano.' : ''));
      if (v === null) return;
      v = v.trim() ? A.slugify(v) : '';
      return editMany(key, ns, function (fm, n) {
        if (new RegExp('^' + f + ':[ \\t]*$', 'm').test(fm)) throw new Error('Categoria su piu\' righe in ' + n + ': cambiala dall\'editor');
        return v ? A.fmSet(fm, f, v) : A.fmDel(fm, f);
      }, 'admin: categoria ' + (v || 'nessuna') + ' a ' + key).then(function (c) { if (c) done(key, 'Categoria cambiata su ' + c + ' (pubblicazione in corso)'); });
    }
    if (act === 'trash') {
      if (!confirm('Spostare ' + N + ' elementi nel cestino?')) return;
      return A.toTrash(ns.map(function (n) { return { dir: DIR[key], name: n }; }), 'admin: cestino ' + N + ' ' + key)
        .then(function () { done(key, N + ' spostati nel cestino'); });
    }
  });
})(A);
