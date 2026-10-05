/* Admin - al-folio v1. Vedi admin/claude.md */
var A = (function () {
  /* CHIAVI DEL BROWSER (localStorage) - regola "zero hardcoded" + "piu' siti sullo stesso dominio":
     il browser tiene i dati PER DOMINIO, non per sito. Due siti GitHub Pages dello stesso utente
     (utente.github.io/sito-a/ e utente.github.io/sito-b/) hanno lo STESSO dominio: con chiavi fisse (adm_tok, adm_repo)
     il secondo admin trovava token e repo del primo e SCRIVEVA SUL REPO SBAGLIATO. Bug reale visto tra due siti clonati uno dall'altro.
     Soluzione: il nome della chiave contiene il percorso dell'admin (location.pathname senza il nome del file),
     che e' diverso per ogni sito e non va scritto a mano. Es. /nome-repo/admin/ -> adm_tok:/nome-repo/admin/
     [FONTE: MDN Web Storage API, localStorage e' separato per origine (schema+host+porta), non per percorso.] */
  var SCOPE = location.pathname.replace(/[^\/]*$/, ''), K_TOK = 'adm_tok:' + SCOPE, K_REPO = 'adm_repo:' + SCOPE;
  var TOK = '', REPO = '', BR = 'main', main, busy = false, BASEURL = '';
  /* SKEW = (ora server GitHub) - (ora del PC), in millisecondi. Aggiornato a ogni chiamata API.
     SITE_TZ = fuso del sito, letto da "timezone:" in _config.yml (mai scritto qui: vedi sez. 0 claude.md).
     Ordine di fiducia per l'ora dei post: GitHub (Date header) > orologio PC. Il fuso NON viene dal PC. */
  var SKEW = 0, SITE_TZ = '', SITEURL = '';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  /* jq: valore da mettere dentro una stringa JS tra apici in un attributo HTML: onclick="A.x('<qui>')". Prima si escapano \ e ', poi l'HTML (esc).
     Con esc() da solo un nome come l'immagine.jpg chiudeva la stringa JS: il bottone moriva (e un nome costruito apposta poteva eseguire codice). Usarlo per OGNI nome/id dentro un onclick. */
  var jq = function (s) { return esc(String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")); };
  var b64e = function (s) { return btoa(unescape(encodeURIComponent(s))); };
  var b64d = function (s) { return decodeURIComponent(escape(atob(s.replace(/\n/g, '')))); };

  function toast(m, err) {
    var t = $('toast'); t.textContent = m; t.style.background = err ? '#b32d2e' : '#1d2327';
    t.style.display = 'block'; clearTimeout(t._t); t._t = setTimeout(function () { t.style.display = 'none'; }, 3500);
  }

  function api(method, path, body) {
    var o = { method: method, headers: { Authorization: 'token ' + TOK, Accept: 'application/vnd.github+json' } };
    if (body) { o.body = JSON.stringify(body); o.headers['Content-Type'] = 'application/json'; }
    /* RICHIESTE CONDIZIONALI: cache:'no-cache' = il browser RIVALIDA sempre con GitHub mandando If-None-Match (ETag).
       Se nulla e' cambiato GitHub risponde 304 e quella richiesta NON conta per il limite orario (5000/h), purche' sia
       autenticata (lo e': header Authorization). In piu' evita i dati vecchi: GitHub manda 'Cache-Control: max-age=60', e senza
       questa riga il browser poteva riservire per un minuto un elenco o un file letto prima di un salvataggio.
       Solo per GET: PUT/DELETE/POST non sono condizionali. [FONTE: docs.github.com > REST API > Best practices > Use conditional requests] */
    if (method === 'GET') o.cache = 'no-cache'; else TREE_P = null;
    return fetch('https://api.github.com/repos/' + REPO + path, o).then(function (r) {
      /* OROLOGIO: ogni risposta GitHub porta l'header "Date" (ora esatta del server, UTC). Lo confronto
         con l'orologio del PC e tengo lo scarto in SKEW. Cosi' un PC con l'ora sballata non altera
         piu' la data dei post ne' la finestra del deploy. Vedi serverNow() e admin/claude.md sez. 0e.
         Se l'header manca o e' illeggibile SKEW resta com'era: si ricade sull'orologio del PC. */
      var sd = r.headers.get('Date'), st = sd ? Date.parse(sd) : NaN;
      if (!isNaN(st)) SKEW = st - Date.now();
      if (method !== 'GET') TREE_P = null;
      if (r.status === 204) return {};
      /* json() puo' fallire (502/503 con pagina HTML, corpo vuoto): senza il catch l'errore diventava "Unexpected token <" senza stato HTTP e errMsg non riconosceva 401/403/5xx. */
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!r.ok) { var e = new Error((j && j.message) || ('HTTP ' + r.status)); e.status = r.status; throw e; }
        return j == null ? {} : j;
      });
    }, function () {
      /* fetch rifiuta SOLO se la rete non c'e' (offline, DNS, blocco): status 0 = "rete", cosi' errMsg dice una cosa chiara invece di "Failed to fetch". */
      var e = new Error('Rete non raggiungibile'); e.status = 0; throw e;
    });
  }
  function errMsg(e) {
    e = e || {};
    if (e.status === 0) return 'Rete non raggiungibile: controlla la connessione e riprova';
    if (e.status === 401) return 'Token non valido o scaduto (401)';
    if (e.status === 404) return 'Non trovato (404): controlla repo e token';
    if (e.status === 409 || e.status === 422) return 'Conflitto: ricarica e riprova (' + e.status + ')';
    if (e.status === 403) return 'Permesso negato o troppe richieste a GitHub (403): ' + (e.message || '') + '. Controlla i permessi del token o riprova tra qualche minuto';
    if (e.status >= 500) return 'GitHub non risponde (' + e.status + '): riprova tra poco';
    return e.message;
  }
  /* ep: codifica ogni segmento del percorso (spazi, #, ?, %, apostrofi nei nomi file) lasciando gli '/'. Prima il percorso andava nell'URL cosi' com'era:
     un file "foto 1#.jpg" o "100%.md" faceva una richiesta sbagliata (404 o file diverso). I chiamanti passano SEMPRE percorsi grezzi, mai gia' codificati. */
  function ep(p) { return String(p).split('/').map(encodeURIComponent).join('/'); }
  function getDirRest(p) { return api('GET', '/contents/' + ep(p) + '?ref=' + BR).catch(function (e) { if (e.status === 404) return []; throw e; }); }
  /* ELENCHI DA UN ALBERO SOLO: GET git/trees/<branch>?recursive=1 da' nome, percorso, sha e dimensione di TUTTI i file in una richiesta.
     Prima ogni cartella (_posts, _servizi, _pages...) era una richiesta: la Bacheca ne faceva 5. Ora le richieste vicine (3 s) condividono la stessa
     promessa, e la richiesta e' condizionale (api() fa GET con no-cache: 304 = gratis per il limite). Ogni scrittura azzera TREE_P (vedi api()).
     Se l'albero e' troncato o la richiesta fallisce si torna alla Contents API per 5 minuti (TREE_OFF). Forma delle voci = quella della Contents API
     (name, path, sha, size, type 'file'|'dir', download_url). opts.rest = forza la Contents API (la Libreria media usa download_url). */
  function getTree() {
    if (TREE_P && Date.now() - TREE_T < 3000) return TREE_P;
    TREE_T = Date.now();
    var pr = api('GET', '/git/trees/' + encodeURIComponent(BR) + '?recursive=1').then(function (t) {
      if (!t || t.truncated || !t.tree) throw new Error('tree');
      var m = {};
      t.tree.forEach(function (e) {
        if (e.type !== 'blob' && e.type !== 'tree') return;
        var i = e.path.lastIndexOf('/'), par = i < 0 ? '' : e.path.slice(0, i);
        (m[par] || (m[par] = [])).push({ name: e.path.slice(i + 1), path: e.path, sha: e.sha, size: e.size || 0, type: e.type === 'blob' ? 'file' : 'dir',
          download_url: e.type === 'blob' ? 'https://raw.githubusercontent.com/' + REPO + '/' + BR + '/' + ep(e.path) : null });
      });
      return m;
    });
    TREE_P = pr;
    pr.catch(function () { if (TREE_P === pr) TREE_P = null; });
    return pr;
  }
  function getDir(p, opts) {
    if ((opts && opts.rest) || Date.now() < TREE_OFF) return getDirRest(p);
    p = String(p).replace(/^\/+|\/+$/g, '');
    return getTree().then(function (m) { return (m[p] || []).slice(); }, function () { TREE_OFF = Date.now() + 300000; return getDirRest(p); });
  }
  /* tooBig: sopra 1 MB la Contents API NON manda il contenuto (encoding "none", content vuoto): text resterebbe '' e un salvataggio CANCELLEREBBE il file.
     getFile quindi RIFIUTA (errore 413, messaggio chiaro) invece di restituire testo vuoto. Il file non finisce nella cache BLOB. */
  function getFile(p) { return api('GET', '/contents/' + ep(p) + '?ref=' + BR).then(function (j) { if (j.encoding === 'none') { var e = new Error('File troppo grande (oltre 1 MB): non si puo\u0027 leggere/modificare dall\u0027admin'); e.status = 413; throw e; } j.text = b64d(j.content); if (j.sha) blobSet(j.sha, j.text); return j; }); }
  /* ---- LETTURA DI PIU' FILE INSIEME (ottimizzazione richieste API) ----
     PRIMA: ogni vista che aveva bisogno del contenuto di N file faceva N richieste REST IN PARALLELO. Caso peggiore: l'editor di un
     articolo (loadCats) e 'Categorie articoli' leggevano TUTTI i post a ogni apertura (60-100 richieste). Le richieste parallele in massa
     sono anche quello che GitHub sconsiglia (limiti secondari). ORA getFiles(dir, files, opts):
       1. CACHE PER SHA (BLOB): lo sha di un file identifica il suo contenuto in modo immutabile, quindi una voce in cache non puo' mai
          essere vecchia. Dopo un salvataggio lo sha cambia e SOLO quel file viene riletto. Nessuna invalidazione da gestire.
       2. I file mancanti in cache si leggono con UNA query GraphQL (un alias per file, a blocchi di 100) invece di N richieste REST.
       3. Se GraphQL non risponde (token senza permesso, rete, errore) si ripiega sulle richieste REST singole, come prima ma a gruppi
          di 6 invece che tutte insieme; per 5 minuti non si riprova GraphQL (GQL_OFF).
     files = elenco di getDir (servono name, path, sha). Ritorna un array NELLO STESSO ORDINE di oggetti {...file, text}.
     Un file illeggibile vale null, salvo opts.strict: allora la promessa fallisce al primo errore (come faceva Promise.all su getFile).
     NON usare questa funzione prima di una scrittura: per putFile/delFile serve lo sha letto un attimo prima con getFile (vedi sotto). */
  var BLOB = {}, GQL_OFF = 0, TREE_P = null, TREE_T = 0, TREE_OFF = 0, PEND = {}, PEND_T = 0;
  /* CACHE PERSISTENTE (IndexedDB 'adm_cache'): BLOB (sha -> testo) salvata nel browser. Lo sha identifica il contenuto in modo immutabile, quindi una voce
     non diventa MAI vecchia e non serve invalidarla: dopo un F5 gli elenchi non rileggono nulla da GitHub (restano solo le richieste condizionali).
     Se IndexedDB non c'e' o fallisce non succede niente (si lavora in memoria come prima). Si svuota al logout; oltre 3000 voci si azzera. File > 400 KB non si salvano. */
  function idb() { return new Promise(function (ok, no) { try { var r = indexedDB.open('adm_cache', 1); r.onupgradeneeded = function () { r.result.createObjectStore('blob'); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); }; } catch (e) { no(e); } }); }
  function idbClear() { return idb().then(function (db) { return new Promise(function (ok) { var tx = db.transaction('blob', 'readwrite'); tx.objectStore('blob').clear(); tx.oncomplete = tx.onerror = function () { db.close(); ok(); }; }); }).catch(function () {}); }
  var BLOB_READY = idb().then(function (db) {
    return new Promise(function (ok) {
      var q = db.transaction('blob').objectStore('blob').openCursor(), n = 0;
      q.onsuccess = function () { var c = q.result; if (c) { if (!(c.key in BLOB)) BLOB[c.key] = c.value; n++; c.continue(); } else { db.close(); if (n > 3000) idbClear(); ok(); } };
      q.onerror = function () { ok(); };
    });
  }).catch(function () {});
  function blobFlush() { var p = PEND; PEND = {}; idb().then(function (db) { var tx = db.transaction('blob', 'readwrite'), st = tx.objectStore('blob'); for (var k in p) st.put(p[k], k); tx.oncomplete = tx.onerror = function () { db.close(); }; }).catch(function () {}); }
  function blobSet(sha, text) { BLOB[sha] = text; if (typeof text !== 'string' || text.length > 400000) return; PEND[sha] = text; clearTimeout(PEND_T); PEND_T = setTimeout(blobFlush, 800); }
  function gqlTexts(items) {
    var rp = REPO.split('/');
    var q = 'query{repository(owner:' + JSON.stringify(rp[0]) + ',name:' + JSON.stringify(rp[1]) + '){' + items.map(function (it, i) {
      return 'f' + i + ':object(expression:' + JSON.stringify(BR + ':' + it.path) + '){... on Blob{oid text isTruncated}}';
    }).join('') + '}}';
    return fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: 'token ' + TOK, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.errors || !j.data || !j.data.repository) throw new Error('graphql'); return j.data.repository; }); })
      .then(function (repo) { items.forEach(function (it, i) { var b = repo['f' + i]; if (b && b.oid && !b.isTruncated && typeof b.text === 'string') blobSet(b.oid, b.text); }); });
  }
  function getFiles(dir, files, opts) { return BLOB_READY.then(function () { return getFiles0(dir, files, opts); }); }
  function getFiles0(dir, files, opts) {
    var strict = opts && opts.strict, miss = files.filter(function (f) { return !(f.sha in BLOB); }), step = Promise.resolve();
    if (miss.length && Date.now() > GQL_OFF) {
      for (var i = 0; i < miss.length; i += 100) (function (part) { step = step.then(function () { return gqlTexts(part); }); })(miss.slice(i, i + 100));
    }
    return step.catch(function () { GQL_OFF = Date.now() + 300000; }).then(function () {
      var out = new Array(files.length), todo = [];
      files.forEach(function (f, i) {
        if (f.sha in BLOB) { var c = {}; for (var k in f) c[k] = f[k]; c.text = BLOB[f.sha]; out[i] = c; } else todo.push(i);
      });
      var chain = Promise.resolve();
      for (var j = 0; j < todo.length; j += 6) (function (grp) {
        chain = chain.then(function () {
          return Promise.all(grp.map(function (ix) {
            var f = files[ix];
            return getFile(f.path || (dir + '/' + f.name)).then(function (r) { out[ix] = r; }, function (e) { if (strict) throw e; out[ix] = null; });
          }));
        });
      })(todo.slice(j, j + 6));
      return chain.then(function () { return out; });
    });
  }
  /* GitHub Contents API usa concorrenza ottimistica: PUT/DELETE su un file esistente RICHIEDONO
     lo sha corrente (letto con getFile), altrimenti 409/422 "conflitto". Se due salvataggi sullo
     stesso file partono ravvicinati (doppio click, due tab aperte) il secondo puo' fallire con
     409 perche' lo sha che ha in mano non e' piu' quello vero: in quel caso l'utente deve
     ricaricare la vista (A.go) per riprendere lo sha aggiornato, NON ritentare con lo sha vecchio.
     wrap() (sotto) previene solo il doppio click nella STESSA vista, non le due tab aperte. */
  function putFile(p, text, sha, msg, isB64) {
    var b = { message: msg || 'admin: aggiorna ' + p, content: isB64 ? text : b64e(text), branch: BR };
    if (sha) b.sha = sha;
    return api('PUT', '/contents/' + ep(p), b).then(function (r) { pollDeploy(); return r; });
  }
  /* delFile: DELETE su GitHub Contents API richiede lo sha corrente del file (stessa concorrenza ottimistica di putFile). Va sempre letto un attimo prima con getFile: uno sha vecchio da' 409. Dopo l'eliminazione parte pollDeploy() perche' la cancellazione e' un commit e fa ripartire il build. [FONTE: docs.github.com REST 'Delete a file'] */
  function delFile(p, sha) {
    return api('DELETE', '/contents/' + ep(p), { message: 'admin: elimina ' + p, sha: sha, branch: BR }).then(function (r) { pollDeploy(); return r; });
  }

  /* commitFiles(changes, message): UN SOLO commit con piu' file insieme (aggiunte, modifiche, cancellazioni).
     Serve ai MODULI (admin-modules.js): installare/disinstallare un modulo tocca 5-30 file, e con putFile/
     delFile sarebbero 5-30 commit = 5-30 build "Deploy site" in coda, e un'operazione a meta' se la rete cade.
     Con un commit solo l'operazione e' ATOMICA: o entrano tutti i file o nessuno.
       changes = [ {path:'a/b.md', text:'...'}   (testo UTF-8)
                 | {path:'x.png', b64:'...'}     (contenuto gia' in base64, SENZA prefisso 'data:...;base64,')
                 | {path:'old.md', del:true} ]   (cancella)
     In OGNI voce si puo' aggiungere sha:'<sha letto con getFile/getFiles>': prima di scrivere si verifica che nel repo il file abbia ANCORA quello sha,
     altrimenti il commit fallisce con 409 ("e' cambiato nel frattempo") e non tocca niente. Senza sha vince l'ultima scrittura (come prima).
     Serve a tutto cio' che legge, modifica e riscrive N file (azioni di gruppo, cestino, categorie): senza il controllo, un file salvato da un'altra scheda
     nel frattempo veniva sovrascritto in silenzio con la versione vecchia.
     Sequenza (Git Data API) [DOC GitHub REST: docs.github.com/rest/git/refs, /commits, /blobs, /trees]:
       1. GET  git/ref/heads/<branch>  -> sha del commit in cima
       2. GET  git/commits/<sha>       -> sha dell'albero (tree) di quel commit
       3. POST git/blobs   (uno per file) -> sha del contenuto
       4. POST git/trees   {base_tree, tree:[...]} -> nuovo albero. base_tree = albero attuale: i file NON elencati restano
          identici, quelli elencati vengono sovrascritti [DOC GitHub "Create a tree"].
       5. POST git/commits {message, tree, parents:[sha]}
       6. PATCH git/refs/heads/<branch> {sha, force:false}  -> il branch avanza al nuovo commit.
     TRAPPOLE (tutte dalla doc "Create a tree", verificata):
       - sha:null in una voce dell'albero CANCELLA il file, MA "returns an error if you try to delete a file that does not exist":
         una cancellazione di un file gia' sparito farebbe fallire TUTTO il commit. Per questo le cancellazioni vengono filtrate
         contro l'albero reale (listExisting) e i file assenti sono saltati in silenzio.
       - force:false al punto 6 = solo avanzamento lineare: se nel frattempo qualcuno ha committato (altra scheda, altra sessione)
         GitHub risponde 422 e NON sovrascrive niente; errMsg() lo mostra come "Conflitto: ricarica e riprova".
       - le operazioni sono SEQUENZIALI apposta: la doc avverte che questi endpoint rispondono 422 se "spammati" con richieste parallele.
       - il commit parte SOLO se cambia qualcosa: se dopo il filtro non resta nessuna voce, non crea commit e ritorna null.
     Dopo il commit parte pollDeploy() (pallino verde/rosso), come putFile/delFile. Il commit va sul branch BR (quello di login).
     I percorsi sono validati: niente '/' iniziale, niente '..', niente vuoti - protegge da uno zip malevolo o da un bug del chiamante. */
  function commitFiles(changes, message) {
    if (!changes || !changes.length) return Promise.resolve(null);
    changes.forEach(function (c) {
      if (!c.path || /^\//.test(c.path) || /(^|\/)\.\.(\/|$)/.test(c.path) || /\/\//.test(c.path)) throw new Error('Percorso non valido: ' + c.path);
    });
    var headSha, baseTree, entries = [];
    /* listExisting: quali dei percorsi da cancellare esistono davvero. Un solo giro con l'albero ricorsivo; se GitHub risponde
       "truncated" (repo enorme, oltre il limite della doc) si ripiega su un controllo per file con la Contents API (404 = assente). */
    function listExisting(paths) {
      var have = {};
      return api('GET', '/git/trees/' + baseTree + '?recursive=1').then(function (t) {
        if (!t.truncated) { (t.tree || []).forEach(function (n) { have[n.path] = n.sha || true; }); return have; }
        return paths.reduce(function (pr, p) {
          return pr.then(function () {
            return api('GET', '/contents/' + p.split('/').map(encodeURIComponent).join('/') + '?ref=' + BR)
              .then(function (r) { have[p] = (r && r.sha) || true; }, function (e) { if (e.status !== 404) throw e; });
          });
        }, Promise.resolve()).then(function () { return have; });
      });
    }
    return api('GET', '/git/ref/heads/' + BR).then(function (ref) {
      headSha = ref.object.sha; return api('GET', '/git/commits/' + headSha);
    }).then(function (c) {
      baseTree = c.tree.sha;
      var chk = changes.filter(function (x) { return x.del || x.sha; }).map(function (x) { return x.path; });
      return chk.length ? listExisting(chk) : {};
    }).then(function (have) {
      /* verifica sha atteso PRIMA di creare blob/albero: se qualcosa e' cambiato non si scrive niente (409 = "Conflitto: ricarica e riprova"). */
      changes.forEach(function (ch) {
        if (ch.sha && have[ch.path] !== ch.sha) { var e = new Error('Il file ' + ch.path + ' e\' cambiato nel frattempo'); e.status = 409; throw e; }
      });
      return changes.reduce(function (pr, ch) {
        return pr.then(function () {
          if (ch.del) { if (have[ch.path]) entries.push({ path: ch.path, mode: '100644', type: 'blob', sha: null }); return; }
          var b64 = ch.b64 != null ? ch.b64 : b64e(ch.text == null ? '' : ch.text);
          return api('POST', '/git/blobs', { content: b64, encoding: 'base64' }).then(function (bl) {
            entries.push({ path: ch.path, mode: '100644', type: 'blob', sha: bl.sha });
          });
        });
      }, Promise.resolve());
    }).then(function () {
      if (!entries.length) return null;
      return api('POST', '/git/trees', { base_tree: baseTree, tree: entries }).then(function (t) {
        return api('POST', '/git/commits', { message: message || 'admin: aggiornamento', tree: t.sha, parents: [headSha] });
      }).then(function (nc) {
        return api('PATCH', '/git/refs/heads/' + BR, { sha: nc.sha, force: false }).then(function () { pollDeploy(); return nc; });
      });
    });
  }

  /* ---- front matter ----
     Jekyll legge il front matter YAML col parser Psych (Ruby). Fonti: jekyllrb.com/docs/front-matter,
     jekyllrb.com/docs/configuration/options (flag "future"), jekyllrb.com/docs/posts (tags/categories).
     - fmSet/fmGet lavorano riga per riga con regex: assumono "chiave: valore" su UNA riga, senza
       andare a capo (i blocchi multilinea come "children:" in admin-menu.js sono gestiti a parte,
       NON con fmGet/fmSet). Se un valore contiene "\n" queste funzioni lo rompono.
     - yq() quota SOLO se serve (caratteri speciali YAML o spazi ai bordi). NON usarla per "date":
       scritta senza virgolette (es. 2026-09-20 14:47:00) Psych la legge come un vero oggetto Time.
       E' il valore che Jekyll confronta con l'ora corrente per decidere se un post e' "nel futuro":
       la CLI ha il flag --future (default false, cioe' i post con data futura NON vengono
       pubblicati) — vedi jekyllrb.com/docs/configuration/options#build-command-options. Quotare la
       data la rende una stringa qualsiasi anziche' un Time: il confronto puo' comportarsi in modo
       incoerente a seconda della versione di Jekyll -> post che spariscono da blog/home senza
       errori in build. Per questo admin-views.js gestisce "date" con un <input type=date>+
       <input type=time> nativo invece che testo libero, e la scrive SEMPRE non quotata (vedi
       A.save() li'). Non reintrodurre yq() su "date".
     - "categories" e "tags" hanno gestione Jekyll dedicata [DOC Jekyll: wiki repo jekyll/jekyll, pagina "YAML Front Matter": "can be specified as a YAML list or a space-separated string"; verificata leggendo la pagina, NON l'ancora #tags-and-categories di jekyllrb.com che avevo citato senza averla aperta]:
       una stringa con spazi in front matter viene AUTOMATICAMENTE splittata in un array (es.
       "categories: sport cronaca" -> ["sport","cronaca"]). E' l'UNICA ragione per cui l'admin puo'
       permettersi di salvare piu' categorie come stringa unica separata da spazi: non serve
       costruire un array YAML a mano. Questo split automatico vale SOLO per categories/tags,
       nessun altro campo del front matter lo riceve. */
  function splitFM(t) {
    var m = t.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    return m ? { fm: m[1], body: m[2] } : { fm: '', body: t };
  }
  /* fmGet/fmSet/fmDel lavorano riga per riga con regex sul front matter: assumono 'chiave: valore' su UNA riga. Il flag 'm' fa combaciare ^ e $ con ogni riga. La chiave finisce dentro una RegExp: passare solo nomi semplici (title, date, seo_title), MAI input dell'utente (un punto o un asterisco cambierebbero il significato). fmGet toglie le virgolette esterne; fmSet NON quota (il chiamante decide se usare yq). Un valore multilinea (children:, more_info: >) NON e' gestito qui: vedi kids() in admin-menu.js. [FONTE: front matter = YAML, jekyllrb.com/docs/front-matter] */
  function fmGet(fm, k) {
    var m = fm.match(new RegExp('^' + k + ':[ \\t]*(.*)$', 'm'));
    if (!m) return '';
    return m[1].trim().replace(/^["']|["']$/g, '');
  }
  function fmSet(fm, k, v) {
    var line = k + ': ' + v, re = new RegExp('^' + k + ':.*$', 'm');
    if (re.test(fm)) return fm.replace(re, function () { return line; });
    return (fm ? fm + '\n' : '') + line;
  }
  function fmDel(fm, k) { return fm.replace(new RegExp('^' + k + ':.*\\r?\\n?', 'm'), ''); }
  /* yq: quota SOLO se serve. Caratteri che in YAML hanno significato speciale (: # [ ] { } & * ! | > % @ ') o spazi ai bordi -> stringa tra virgolette doppie, con \"\ interni escapati. Senza questo un titolo tipo 'Guida: come fare' rompe il front matter e il post sparisce dal build senza errori evidenti. NON usarla per date, booleani e numeri (vedi sez. 0c claude.md): quotati diventano stringhe. [FONTE: YAML 1.1, Psych di Jekyll] */
  function yq(s) { s = String(s); return /[:#'"\[\]{}&*!|>%@`]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s; }
  /* slugify: nome file di post/pagine. Toglie accenti (NFD), tiene solo a-z 0-9, il resto diventa '-'. Il nome del post deve restare 'YYYY-MM-DD-titolo.md': Jekyll ricava data e permalink da li'. [FONTE: al-folio docs/CUSTOMIZE.md, 'The name of the file must follow the format YYYY-MM-DD-title.md'] Attenzione: due titoli diversi possono dare lo stesso slug (es. 'Ciao!' e 'Ciao?'): il secondo sovrascriverebbe il primo se la data coincide. */
  function slugify(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'senza-titolo'; }
  /* ORA DEI POST (punto critico, vedi admin/claude.md sez. 0e):
     - serverNow(): ora ESATTA = orologio PC + SKEW (scarto misurato contro l'header Date di GitHub).
       Un PC con l'ora sballata non altera piu' la data dei post. Se SKEW non e' ancora noto vale 0.
     - Il fuso e' quello del SITO (SITE_TZ, da _config.yml "timezone:"), non quello del PC: cosi'
       il risultato e' identico su ogni computer. Intl.DateTimeFormat con timeZone fa lui l'ora legale.
     - Output "YYYY-MM-DD HH:MM:00" SENZA fuso e SENZA virgolette: Jekyll lo rilegge in "timezone:"
       (regola sez. 0c). Non aggiungere offset qui.
     - Se SITE_TZ e' vuoto o non valido (nome sbagliato in config) si ripiega sul fuso del PC. */
  function serverNow() { return new Date(Date.now() + SKEW); }
  function siteParts(d) {
    var o = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
    var f;
    try { if (SITE_TZ) { o.timeZone = SITE_TZ; } f = new Intl.DateTimeFormat('en-CA', o); }
    catch (e) { delete o.timeZone; f = new Intl.DateTimeFormat('en-CA', o); }
    var p = {}; f.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    if (p.hour === '24') p.hour = '00';
    return p;
  }
  function today() { var p = siteParts(serverNow()); return p.year + '-' + p.month + '-' + p.day; }
  function now() { var p = siteParts(serverNow()); return p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute + ':00'; }

  /* ---- PALLINO DEPLOY (in alto a destra) ----
     COME SI PUBBLICA UN SITO SU GITHUB PAGES (build_type "legacy", sorgente branch gh-pages, vedi claude.md sez. 2):
       1) push su main  -> workflow "Deploy site" (deploy.yml) builda Jekyll e SCRIVE il branch gh-pages
       2) push su gh-pages -> GitHub lancia da solo "pages build and deployment" che pubblica il sito.
     Le due run stanno su BRANCH DIVERSI: "Deploy site" su main, "pages build and deployment" su gh-pages.

     BUG STORICO (perche' il pallino non e' mai diventato verde): il codice chiedeva le run con ?branch=main,
     quindi la seconda run (branch gh-pages) NON veniva mai trovata e il pallino restava su "Pubblicazione..."
     per sempre. Filtrare per nome+branch e' fragile: dipende dal nome di un workflow di sistema.

     METODO CORRETTO, quello indicato dalla documentazione ufficiale per lo stato di pubblicazione:
     GET /repos/{o}/{r}/pages/builds/latest  ->  { status, commit, error:{message} }
       status: "queued" (richiesta, non iniziata) | "building" (in corso) | "built" (pubblicata) | "errored" (fallita)
       commit: SHA del commit di gh-pages che quella build pubblica.
     [FONTE: GitHub REST API docs, "Get latest Pages build" e sezione "Pages" (valori di status)]

     ALGORITMO (pollDeploy):
       a) all'avvio memorizza lo SHA della build "latest" attuale (base): e' la pubblicazione PRECEDENTE.
       b) fase 1 "Build": aspetta che la run "Deploy site" del commit appena salvato finisca (se fallisce -> rosso).
          Si identifica dal head_sha del commit che ha creato il salvataggio (headSha), NON dall'orario: niente
          confronti fra orologi diversi (PC / GitHub), che era un'altra fonte di errori.
       c) fase 2 "Pubblicazione": aspetta che /pages/builds/latest abbia un commit DIVERSO dalla base e status "built".
          "errored" -> rosso con il messaggio d'errore di GitHub.
     Se dopo ~6 minuti non e' finito: "Controlla su GitHub" (grigio), mai verde falso.
     Un salvataggio che non tocca file monitorati da deploy.yml (vedi claude.md sez. 2) non lancia "Deploy site":
     in quel caso dopo 40 secondi senza run si mostra "Nessun deploy necessario" invece di aspettare all'infinito. */
  /* POLL = numero del ciclo di controllo attivo. Ogni pollDeploy() ne apre uno nuovo; i callback dei cicli VECCHI (richieste gia' partite) si fermano al primo controllo `my !== POLL`.
     Senza questo, due salvataggi ravvicinati lasciavano DUE cicli vivi (ognuno si riprogrammava da solo): richieste API raddoppiate e pallino che balla tra stati diversi. */
  var pt, pf, POLL = 0;
  function setDeploy(cls, txt, pct) {
    var dot = $('deployDot'), t = $('deployTxt'), bar = $('deployBar');
    dot.className = 'dot ' + cls; t.textContent = txt; bar.style.width = pct + '%';
    if (pct >= 100) setTimeout(function () { bar.style.width = '0%'; }, 1500);
  }
  /* buildLatest: ultima pubblicazione Pages, oppure null se il sito non e' mai stato pubblicato (404). */
  function buildLatest() {
    return api('GET', '/pages/builds/latest').catch(function (e) { if (e && e.status === 404) return null; throw e; });
  }
  /* headSha: SHA dell'ultimo commit del branch di lavoro (quello appena creato dal salvataggio). */
  function headSha() {
    return api('GET', '/commits/' + BR).then(function (c) { return c.sha; });
  }
  function pollDeploy() {
    clearTimeout(pt); clearInterval(pf); var my = ++POLL;
    var pct = 5, t0 = Date.now(), base = '', sha = '', vistaBuild = false, bl0 = null;
    setDeploy('run', 'Deploy in corso...', pct);
    // la barra avanza da sola fino all'85%: e' solo un segnale visivo, il verde arriva SOLO dai dati veri
    pf = setInterval(function () { if (pct < 85) { pct += pct < 40 ? 2 : 0.6; $('deployBar').style.width = pct + '%'; } }, 1500);
    Promise.all([buildLatest(), headSha()]).then(function (v) {
      if (my !== POLL) return;
      base = v[0] ? v[0].commit : ''; sha = v[1]; bl0 = v[0];
      (function tick(first) {
        if (my !== POLL) return;
        /* Segue SEMPRE l'ultimo commit del branch (non quello preso all'avvio): se fai un secondo salvataggio (o una stella)
           mentre il deploy e' in corso, il primo deploy viene annullato da "concurrency" e ne parte uno nuovo con un altro SHA.
           Con lo SHA fisso il pallino aspettava un deploy cancellato e restava su "Pubblicazione..." per 6 minuti. */
        /* PRIMO GIRO: sha e stato Pages sono appena stati letti qui sopra (stesso istante): niente richieste doppie. */
        (first ? Promise.resolve(sha) : headSha()).then(function (s) { sha = s; return Promise.all([
          api('GET', '/actions/runs?head_sha=' + sha + '&per_page=10'),
          first ? Promise.resolve(bl0) : buildLatest()
        ]); }).then(function (v) {
          if (my !== POLL) return;
          var runs = v[0].workflow_runs || [], bl = v[1];
          var b = runs.filter(function (x) { return x.name === 'Deploy site'; })[0];
          if (b) vistaBuild = true;
          // fase 1: build
          if (b && b.status === 'completed' && b.conclusion !== 'success') { clearInterval(pf); setDeploy('ko', 'Build fallita', 100); return; }
          // fase 2: pubblicazione (build nuova, diversa da quella di prima)
          if (bl && bl.commit !== base) {
            if (bl.status === 'built') { clearInterval(pf); setDeploy('ok', 'Sito aggiornato', 100); return; }
            if (bl.status === 'errored') { clearInterval(pf); setDeploy('ko', 'Pubblicazione fallita', 100); $('deployTxt').title = (bl.error && bl.error.message) || ''; return; }
            $('deployTxt').textContent = 'Pubblicazione...';
          } else if (b && b.status === 'completed') {
            $('deployTxt').textContent = 'Pubblicazione...';
          } else if (b) {
            $('deployTxt').textContent = 'Build in corso...';
          } else if (!vistaBuild && Date.now() - t0 >= 40000) {
            // 40s senza nessuna run: il salvataggio non ha toccato file che fanno partire il deploy
            clearInterval(pf); setDeploy('ok', 'Nessun deploy necessario', 100); return;
          }
          /* INTERVALLI CRESCENTI: 5s nel primo minuto (e' li' che arriva il 'Nessun deploy necessario'), poi 8s fino a 3 minuti, poi 12s.
             Stesso limite totale di prima (6 minuti), ma fino al 40% di giri in meno (circa 25% in un deploy tipico di 2-3 minuti): ogni giro sono 3 richieste. Con le richieste
             condizionali (vedi api) quelle senza novita' non consumano comunque il limite. */
          var el = Date.now() - t0;
          if (el < 360000) pt = setTimeout(tick, el < 60000 ? 5000 : el < 180000 ? 8000 : 12000); else { clearInterval(pf); setDeploy('', 'Controlla su GitHub', 0); }
        }).catch(function () { if (my !== POLL) return; clearInterval(pf); setDeploy('', 'Stato non disponibile', 0); });
      })(true);
    }).catch(function () { if (my !== POLL) return; clearInterval(pf); setDeploy('', 'Stato non disponibile', 0); });
  }
  /* lastDeploy: stato del pallino all'apertura dell'admin (senza aver appena salvato).
     Legge SOLO /pages/builds/latest: built -> verde, errored -> rosso, queued/building -> segue la pubblicazione. */
  function lastDeploy() {
    buildLatest().then(function (bl) {
      if (!bl) return setDeploy('', 'Nessun deploy', 0);
      if (bl.status === 'built') return setDeploy('ok', 'Sito aggiornato', 0);
      if (bl.status === 'errored') return setDeploy('ko', 'Ultimo deploy fallito', 0);
      pollDeploy();
    }).catch(function () { setDeploy('', 'Stato non disponibile', 0); });
  }
  /* ---- login / nav ---- */
  function login() {
    /* REPO accetta anche l'indirizzo incollato (https://github.com/utente/repo, con .git o '/' finale): si riduce a utente/repo. Un formato diverso romperebbe silenziosamente le query GraphQL (REPO.split('/')). */
    TOK = $('tok').value.trim(); REPO = $('repo').value.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/^\/+|\/+$/g, '');
    if (!TOK || !REPO) { $('loginMsg').textContent = 'Inserisci token e repo'; return; }
    if (!/^[\w.-]+\/[\w.-]+$/.test(REPO)) { $('loginMsg').textContent = 'Il repo va scritto cosi: utente/nome-repo'; return; }
    $('repo').value = REPO;
    api('GET', '').then(function (r) {
      localStorage.setItem(K_TOK, TOK); localStorage.setItem(K_REPO, REPO);
      BR = r.default_branch || 'main'; start();
    }).catch(function (e) { $('loginMsg').textContent = errMsg(e); });
  }
  function logout() { localStorage.removeItem(K_TOK); Promise.race([idbClear(), new Promise(function (r) { setTimeout(r, 1500); })]).then(function () { location.reload(); }); }
  /* start: eseguita dopo il login. Qui si leggono da _config.yml (async) baseurl e timezone. Finche' la Promise non e' risolta BASEURL e SITE_TZ sono vuoti: vedi commento piu' sotto e sez. 0e claude.md. */
  function start() {
    $('login').style.display = 'none'; $('app').style.display = 'block';
    /* NOME DEL REPO IN EVIDENZA (punto critico: serve a non scrivere sul sito sbagliato, i cloni sono identici).
       - Si costruisce col DOM (createTextNode/textContent), MAI con innerHTML: REPO arriva da localStorage/campo di login,
         cioe' da testo scritto dall'utente, e in innerHTML sarebbe un varco XSS.
       - Compare in DUE posti: nel menu laterale (#repoName) e in una pastiglia gialla nella barra in alto (#topRepo),
         perche' su mobile il menu laterale e' chiuso. Anche il titolo della scheda del browser porta il nome del repo.
       - Il giallo e' solo CSS (.brand small b, .repochip): niente nomi nel codice, vale per qualsiasi clone. */
    var rn = $('repoName'), rp = REPO.split('/'); rn.textContent = ''; rn.appendChild(document.createTextNode(rp[0] + '/')); var hl = document.createElement('b'); hl.textContent = rp[1] || ''; rn.appendChild(hl); var tr = $('topRepo'); if (tr) tr.textContent = rp[1] || REPO; document.title = 'Admin \u00b7 ' + (rp[1] || REPO); main = $('main'); go('dash');
    var parts = REPO.split('/'), user = parts[0], repoName = parts[1];
    SITEURL = 'https://' + user + '.github.io/' + repoName + '/'; // vedi A.siteUrl(): usato dai moduli con file root/ (es. sitemap.xml) per mostrare l'URL pubblico completo
    $('siteLink').href = SITEURL;
    $('deployLink').href = 'https://github.com/' + REPO + '/actions';
    lastDeploy();
    /* baseurl (letto sotto, async) e' la variabile Jekyll standard che al-folio usa per generare
       i link del sito (vedi al-folio docs/CUSTOMIZE.md, sezione "Configuration": "the url and
       baseurl settings are used to generate the links of the website"). E' l'unica fonte di
       verita' per il sottopercorso del sito (es. /nome-repo): non va MAI hardcodato altrove
       nell'admin (vedi claude.md sez. 0, filosofia zero-hardcoded). BASEURL e' letto qui in modo
       ASINCRONO (arriva dopo start()), quindi qualsiasi modulo che usa A.baseurl() nel PRIMO
       render dopo il login puo' trovarlo ancora '' per una frazione di secondo. Non e' un bug
       bloccante (il caso d'uso e' il bottone Img della toolbar markdown, cliccato dall'utente ben
       dopo il caricamento), ma se in futuro serve BASEURL per costruire qualcosa a schermata gia'
       pronta, aspettare questa Promise invece di leggere A.baseurl() a freddo. */
    /* BASEURL DALL'INDIRIZZO DELL'ADMIN (sincrono, nessun nome nel codice): l'admin vive sempre in <baseurl>/admin/,
       quindi il sottopercorso del sito e' tutto cio' che precede l'ultimo '/admin' nel percorso della pagina
       (/nome-repo/admin/ -> /nome-repo; sito in root /admin/ -> vuoto). E' la stessa regola di deploy.yml, che
       sovrascrive url/baseurl solo in CI: il baseurl scritto in _config.yml dopo una clonazione e' quello
       del sito d'origine, quindi NON e' affidabile (causava Img/anteprime con percorso sbagliato nei cloni).
       Il valore di _config.yml resta solo come ripiego se la pagina non e' sotto /admin/ (non succede in pratica). */
    var bm = location.pathname.match(/^(.*)\/admin(?:\/|$)/);
    if (bm) BASEURL = bm[1];
    getFile('_config.yml').then(function (f) {
      /* baseurl: la riga in _config.yml ha un commento in coda ("baseurl: /nome-repo # the subpath...").
         Va tolto, altrimenti BASEURL diventa "/nome-repo # the subpath of your site..." e ogni percorso
         costruito con A.baseurl() (bottone Img, immagini) e' sbagliato. Trovato col test dal vivo col
         token reale: i test sulle singole funzioni non lo vedevano. Stessa regola del timezone sotto:
         il valore finisce al primo spazio o '#'. Un baseurl vuoto ("baseurl:" o "baseurl: ''") resta ''. */
      var m = f.text.match(/^baseurl:[ \t]*([^\s#]*)/m);
      if (!bm) BASEURL = m ? m[1].replace(/^["']|["']$/g, '') : ''; // con admin sotto /admin/ vince l'indirizzo (sopra)
      /* timezone del sito: e' quello che Jekyll usa per leggere le date dei post (sez. 0c). L'admin
         deve scrivere l'ora nello STESSO fuso, altrimenti il post nasce sfasato. Il commento in coda
         alla riga ("timezone: Europe/Rome # ...") va tolto, altrimenti Intl lo rifiuta. */
      var tz = f.text.match(/^timezone:[ \t]*([^\s#]+)/m);
      SITE_TZ = tz ? tz[1].replace(/^["']|["']$/g, '') : '';
    }).catch(function () { });
  }
  function toggleMenu(f) {
    var s = $('side'), o = $('overlay'), on = f === undefined ? !s.classList.contains('open') : f;
    s.classList.toggle('open', on); o.classList.toggle('open', on);
  }
  /* VOCI DISATTIVATE (temporaneo): chiave = vista, valore = motivo. Non cliccabili (menu, Bacheca, go). Il codice delle viste resta: per riattivare togli la riga qui e class="off" in index.html. */
  var off = { news: 'News temporaneamente disattivate' };
  var titles = { backup: 'Backup', cestino: 'Cestino', dash: 'Bacheca', posts: 'Articoli', cats: 'Categorie articoli', pages: 'Pagine', menu: 'Menu', projects: 'Progetti', news: 'News', servizi: 'Servizi', gallerie: 'Gallerie', media: 'Immagini', modules: 'Moduli', settings: 'Impostazioni', tema: 'Tema' };
  function go(p) {
    if (off[p]) { toast(off[p], true); return; }
    var links = document.querySelectorAll('.side a[data-p]');
    for (var i = 0; i < links.length; i++) links[i].classList.toggle('on', links[i].getAttribute('data-p') === p);
    $('topTitle').textContent = titles[p] || ''; toggleMenu(false);
    main.innerHTML = '<div class="card">Caricamento...</div>';
    var f = views[p]; if (f) f().catch(function (e) { main.innerHTML = '<div class="card">Errore: ' + esc(errMsg(e)) + '</div>'; });
  }
  function wrap(fn) { // evita doppio click su salvataggi
    return function () {
      if (busy) { toast('Operazione in corso, attendi un attimo...'); return; } busy = true; var a = arguments;
      return Promise.resolve().then(function () { return fn.apply(null, a); })
        .catch(function (e) { toast(errMsg(e), true); })
        .then(function () { busy = false; });
    };
  }

  var views = {};
  /* A.token(): il token del login, SOLO in lettura, per il box "Token di accesso" in Impostazioni (admin-media.js). TOK resta privato nella closure:
     non e' una variabile globale e nessun altro modulo lo usa per le chiamate (quelle passano da api()). Non loggarlo e non scriverlo in nessun file del repo. */
  var api_ = { $: $, esc: esc, jq: jq, toast: toast, getDir: getDir, getFile: getFile, getFiles: getFiles, putFile: putFile, delFile: delFile,
    commitFiles: commitFiles, splitFM: splitFM, fmGet: fmGet, fmSet: fmSet, fmDel: fmDel, yq: yq, slugify: slugify,
    today: today, now: now, wrap: wrap, views: views, go: go, off: off, main: function () { return main; }, errMsg: errMsg, api: api, token: function () { return TOK; },
    repo: function () { return REPO; }, branch: function () { return BR; }, baseurl: function () { return BASEURL; }, siteUrl: function () { return SITEURL; } };

  /*__MODULI__*/

  window.addEventListener('load', function () {
    TOK = localStorage.getItem(K_TOK) || ''; REPO = localStorage.getItem(K_REPO) || '';
    /* REPO PRECOMPILATO DAL SITO STESSO (nessun nome scritto nel codice, principio guida sez. 00):
       un sito GitHub Pages vive su <utente>.github.io/<repo>/, quindi utente e repo si ricavano
       dall'indirizzo in cui l'admin e' aperto: host = utente.github.io, primo pezzo del percorso = repo.
       Vale SOLO se e' gia' salvato niente per questo sito, e solo per host *.github.io (con un dominio
       personalizzato non si puo' dedurre: il campo resta vuoto e lo compila l'utente).
       [FONTE: GitHub Docs, URL dei siti Pages 'project site': https://<utente>.github.io/<repo>/] */
    if (!REPO) {
      var hm = location.hostname.match(/^([^.]+)\.github\.io$/i), pm = location.pathname.match(/^\/([^\/]+)\//);
      if (hm && pm && pm[1] !== 'admin') REPO = hm[1] + '/' + pm[1]; // pm[1]=='admin': sito radice <utente>.github.io, il repo non e' nel percorso -> campo vuoto, lo compila l'utente
    }
    $('repo').value = REPO;
    if (TOK) { api('GET', '').then(function (r) { BR = r.default_branch || 'main'; start(); }).catch(function () { $('login').style.display = 'flex'; }); }
  });
  api_.login = login; api_.logout = logout; api_.toggleMenu = toggleMenu;
  return api_;
})();
