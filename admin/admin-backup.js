/* Backup: copie dello stato del sito, come branch "backup-..." su GitHub, con ripristino. Vedi CLAUDE.md > Backup.
   Un backup = un branch che punta al commit attuale (2 chiamate API, istantaneo, nessuna copia di file).
   Ripristino = NUOVO commit sopra main con i file (tree) del backup, aggiornamento SENZA force: la cronologia non si perde e se nel
   frattempo main e' cambiato GitHub rifiuta e non si sovrascrive niente. Prima del ripristino si crea in automatico un backup dello
   stato attuale (nome ...-pre-ripristino), cosi' anche il ripristino si puo' annullare.
   PUNTI CRITICI: (1) mai force:true sull'aggiornamento di main. (2) il ripristino annulla TUTTO quello che e' stato fatto dopo il backup,
   anche gli articoli scritti dall'admin. (3) se il backup differisce dallo stato attuale nei file di .github/workflows GitHub puo' rifiutare
   senza il permesso "workflow" sul token: l'errore viene mostrato com'e'. (4) dopo il ripristino il sito si ricostruisce (2-3 minuti).
   (5) l'eliminazione cancella solo il branch backup (pulsante Elimina, con conferma); il sito non cambia. */
(function (A) {
  var esc = A.esc, M = function () { return A.main(); };
  var BRN = 'main', LIST = [], INFO = {};
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function stamp() { var d = new Date(); return 'backup-' + d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + '-' + p2(d.getHours()) + p2(d.getMinutes()); }
  function headSha() { return A.api('GET', '/git/ref/heads/' + BRN).then(function (r) { return r.object.sha; }); }

  function fmt(iso) {
    if (!iso) return ''; var d = new Date(iso); if (isNaN(d.getTime())) return '';
    return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  }
  /* Data/ora e messaggio di ogni backup: Git NON salva quando e' stato creato il branch, ma la data dell'ultimo commit = il momento a cui
     risale lo stato del sito salvato (e' quella che serve per scegliere). Una richiesta per commit diverso, a gruppi di 6, con cache per sha
     (uno sha non cambia mai). Se una richiesta fallisce la riga si mostra lo stesso, senza data. */
  function loadInfo(list) {
    var uniq = []; list.forEach(function (b) { if (!(b.sha in INFO) && uniq.indexOf(b.sha) < 0) uniq.push(b.sha); });
    var chain = Promise.resolve();
    for (var i = 0; i < uniq.length; i += 6) (function (grp) {
      chain = chain.then(function () {
        return Promise.all(grp.map(function (sha) {
          return A.api('GET', '/git/commits/' + sha).then(function (c) { INFO[sha] = { when: c.committer && c.committer.date, msg: (c.message || '').split('\n')[0] }; }, function () {});
        }));
      });
    })(uniq.slice(i, i + 6));
    return chain;
  }

  /* Ordine dell'elenco: dal piu' recente. Momento = ora del clic se e' nel nome (backup-AAAA-MM-GG-HHMM, anche -wip- e -pre-ripristino),
     altrimenti data dell'ultimo commit del backup (vecchi nomi col contatore: -1, -2...). Prima si ordinava per nome, e il contatore
     finiva in mezzo agli orari. */
  function when(b) {
    var m = /(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(?!\d)/.exec(b.name);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
    var t = new Date((INFO[b.sha] || {}).when || 0).getTime();
    return isNaN(t) ? 0 : t;
  }

  A.views.backup = function () {
    return A.api('GET', '').then(function (repo) {
      BRN = repo.default_branch || 'main';
      return Promise.all([headSha(), A.api('GET', '/git/matching-refs/heads/backup-?per_page=100')]);
    }).then(function (rs) {
      var head = rs[0];
      LIST = rs[1].map(function (r) { return { name: r.ref.replace('refs/heads/', ''), sha: r.object.sha }; });
      return loadInfo(LIST).then(function () {
      LIST.sort(function (a, b) { var d = when(b) - when(a); return d || (a.name < b.name ? 1 : -1); });
      var undo = -1; LIST.forEach(function (b, i) { if (undo < 0 && /-pre-ripristino$/.test(b.name) && b.sha !== head) undo = i; });
      var rows = LIST.map(function (b, i) {
        var same = b.sha === head, inf = INFO[b.sha] || {}, pre = /-pre-ripristino$/.test(b.name), parts = [fmt(inf.when), b.sha.slice(0, 7)];
        if (pre) parts.unshift('stato prima di un ripristino'); if (same) parts.push('identico allo stato attuale'); if (inf.msg) parts.push(inf.msg);
        return '<div class="it"><span>' + esc(b.name) + '<small title="' + esc(inf.msg || '') + '">' + esc(parts.filter(Boolean).join(' \u00b7 ')) + '</small></span>' +
          '<div style="flex:none;white-space:nowrap">' + (same ? '' : '<button class="btn sm danger" onclick="A.bkRestore(' + i + ')">' + (pre ? 'Torna avanti' : 'Ripristina') + '</button> ') +
          '<button class="btn sm" onclick="A.bkDelete(' + i + ')">Elimina</button></div></div>';
      }).join('');
      var undoBtn = undo < 0 ? '' : '<p style="margin:0 0 12px"><button class="btn danger sm" onclick="A.bkRestore(' + undo + ')">\u21b6 Annulla ultimo ripristino</button> <small style="color:#787c82">torna allo stato delle ' + esc(fmt((INFO[LIST[undo].sha] || {}).when) || LIST[undo].name) + '</small></p>';
      M().innerHTML = '<h2>Backup <button class="btn primary sm" onclick="A.bkNew()">+ Crea backup ora</button></h2>' +
        '<div class="card">' + undoBtn + '<p style="margin:0 0 12px;color:#787c82">Un backup \u00e8 una copia dello stato attuale del sito (un branch <code>backup-\u2026</code> su GitHub). ' +
        'Ripristinare riporta tutti i file a quella copia con un nuovo commit: la cronologia non si perde e prima viene creato in automatico un backup dello stato attuale.</p>' +
        '<div class="list">' + (rows || 'Nessun backup.') + '</div></div>';
      });
    });
  };

  A.bkNew = A.wrap(function () {
    var nm = stamp();
    return headSha().then(function (sha) { return A.api('POST', '/git/refs', { ref: 'refs/heads/' + nm, sha: sha }); })
      .then(function () { A.toast('Backup creato: ' + nm); A.go('backup'); })
      .catch(function (e) {
        if (e.status === 422) { A.toast('Esiste gi\u00e0 un backup di questo minuto (' + nm + ')', true); return; }
        throw e;
      });
  });

  /* Elimina = cancella SOLO il branch backup (DELETE /git/refs/heads/<nome>). I commit restano su GitHub finche' un altro branch o tag li raggiunge;
     il sito non cambia. Si rifiuta tutto cio' che non inizia per "backup-" e il branch del sito. */
  A.bkDelete = A.wrap(function (i) {
    var b = LIST[i]; if (!b || b.name.indexOf('backup-') !== 0 || b.name === BRN) return;
    if (!confirm('Eliminare il backup "' + b.name + '"?\n\nIl sito non cambia. Non potrai pi\u00f9 ripristinare questo backup dall\'admin.')) return;
    return A.api('DELETE', '/git/refs/heads/' + b.name)
      .then(function () { A.toast('Backup eliminato: ' + b.name); A.go('backup'); });
  });

  A.bkRestore = A.wrap(function (i) {
    var b = LIST[i]; if (!b) return;
    var head, pre = stamp() + '-pre-ripristino';
    return headSha().then(function (h) {
      head = h;
      if (b.sha === head) { A.toast('Il backup \u00e8 identico allo stato attuale: niente da ripristinare'); return null; }
      return A.api('GET', '/compare/' + b.sha + '...' + head).then(function (c) { return c.ahead_by; }, function () { return null; }).then(function (ahead) {
        var msg = 'Ripristinare "' + b.name + '"?\n\n' + (ahead != null ? 'Verranno annullati ' + ahead + ' commit fatti dopo questo backup (articoli, modifiche, foto).\n' : 'Verr\u00e0 annullato tutto quello fatto dopo questo backup.\n') +
          'Prima viene creato un backup dello stato attuale (' + pre + '), cos\u00ec puoi tornare indietro.';
        if (!confirm(msg)) return null;
        return A.api('POST', '/git/refs', { ref: 'refs/heads/' + pre, sha: head })
          .then(function () { return A.api('GET', '/git/commits/' + b.sha); })
          .then(function (c) { return A.api('POST', '/git/commits', { message: 'admin: ripristina ' + b.name, tree: c.tree.sha, parents: [head] }); })
          .then(function (nc) { return A.api('PATCH', '/git/refs/heads/' + BRN, { sha: nc.sha, force: false }); })
          .then(function () { A.LST = {}; A.toast('Ripristinato ' + b.name + ': il sito si aggiorna tra 2-3 minuti'); A.go('backup'); });
      });
    }).catch(function (e) {
      A.toast('Non ripristinato: ' + (e.message || e.status) + '. Il sito non \u00e8 stato modificato.', true);
    });
  });
})(A);
