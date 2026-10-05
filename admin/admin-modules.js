/* Moduli (sistema ad hoc "hook", stile PrestaShop/WordPress - NON e' al-folio ufficiale).
   Vedi claude.md sez. 11 e _includes/modules_hook.liquid per la logica lato tema.

   LOGICA (auto-discovery, come chiesto): l'admin NON riceve upload zip. Legge una cartella del
   repo, modules_source/<slug>/, che DEVE gia' esistere su GitHub (pushata a mano o da Claude via
   Desktop Commander): ogni sottocartella con un module.json dentro e' un modulo "disponibile".
   L'admin la mostra con un bottone Installa: copia i suoi file in _includes/modules/<slug>/ e
   assets/modules/<slug>/, scrive una riga in _data/modules_registry.yml, TUTTO IN UN SOLO COMMIT
   (A.commitFiles, gia' presente in admin.js per questo). Da quel momento il modulo compare
   anche fra gli "installati": attiva/disattiva/disinstalla/configura si fanno da li'.

   STANDARD di una cartella modulo (in modules_source/<slug>/):
     module.json   OBBLIGATORIO. { "name": "...", "hooks": {...}, "config_fields": [...] }
                   "hooks" e' una mappa hook -> nome file .liquid dentro la stessa cartella. Ogni
                   hook citato DEVE avere il file corrispondente, altrimenti Jekyll non trova
                   l'include e la BUILD DEL SITO FALLISCE (vedi modules_hook.liquid): l'installer
                   qui sotto lo controlla PRIMA di scrivere, e blocca con un errore chiaro.
                   "hooks" PUO' essere {} (vuoto) per un modulo che usa SOLO root/ (vedi sotto).
                   "config_fields" (OPZIONALE, stile PrestaShop): dichiara i campi che l'admin deve
                   mostrare nel bottone CONFIGURA. Se assente o vuoto, un modulo installato non ha
                   il bottone Configura. Ogni voce: { "key": "text", "label": "Testo del banner",
                   "type": "text"|"textarea"|"image"|"checkbox", "default": "..." }.
                   "key" e' il nome del campo dentro data.yml (include.data.<key> nel liquid del
                   modulo). "type":"image" mostra un campo upload che carica il file in
                   assets/modules/<slug>/ e salva il percorso relativo in data.yml.
     head.liquid, footer.liquid, ...   il codice del modulo per ciascun hook dichiarato.
     assets/...    opzionale, copiato in assets/modules/<slug>/ (immagini/css/js del modulo).
     data.yml      opzionale, VALORI DI DEFAULT dei config_fields. Installato in
                   _data/modules/<slug>.yml, poi sovrascritto dal bottone Configura quando l'utente
                   salva (letto come include.data nel liquid del modulo, vedi modules_hook.liquid).
     root/...      opzionale, ogni file qui dentro viene copiato PARI PARI nella RADICE del sito
                   (es. root/sitemap.xml -> sitemap.xml). Serve per moduli che devono creare una
                   pagina/file top-level invece di stampare dentro pagine esistenti. ATTENZIONE: un
                   file in root/ sovrascrive qualsiasi file con lo stesso nome gia' in radice - va
                   bene per file "di servizio" come sitemap.xml/robots.txt, MAI per index.html.
                   Se un modulo ha SOLO root/ (nessun config_fields), l'admin mostra al suo posto
                   un riquadro con l'URL pubblico di ogni file root/ + bottone Copia (utile per
                   servizi come Search Console che chiedono di incollare un URL).
   Il nome del modulo installato E' il nome della cartella (slug): due cartelle con lo stesso nome
   in modules_source non sono possibili (e' un elenco di file GitHub), quindi non serve validarlo. */
(function (A) {
  var $ = A.$, esc = A.esc;
  function M() { return A.main(); }
  var SRC = 'modules_source', REG = '_data/modules_registry.yml', INC = '_includes/modules', IMG = 'assets/modules', DATA = '_data/modules';

  /* ---- lettura registry (_data/modules_registry.yml) ----
     JSON dentro un file .yml (JSON e' YAML valido): niente parser YAML scritto a mano. Il nome
     .yml (non .json) serve a far ripartire il deploy (deploy.yml parte su *.yml, vedi claude.md sez. 2).
     Formato: { "installed": { "<slug>": { "name":"...", "enabled":true, "hooks":{...},
                "config_fields":[...], "roots":["sitemap.xml"] } } }
     "config_fields" e "roots" sono copiati dal manifest all'installazione: servono a questa vista
     per sapere, SENZA rileggere modules_source/ ogni volta, se un modulo installato ha il bottone
     Configura (config_fields non vuoto) o il riquadro URL (roots non vuoto). */
  function parseRegistry(t) {
    try { var j = JSON.parse(t); return (j && j.installed) || {}; } catch (e) { return {}; }
  }
  function buildRegistry(reg) {
    return JSON.stringify({ installed: reg }, null, 2) + '\n';
  }
  function getRegistry() {
    return A.getFile(REG).then(function (f) { return { sha: f.sha, reg: parseRegistry(f.text) }; },
      function (e) { if (e.status === 404) return { sha: '', reg: {} }; throw e; });
  }

  /* ---- lettura module.json di un modulo disponibile ----
     "hooks" puo' essere {} (modulo solo-root): non e' un errore, si blocca solo se manca proprio
     la chiave "hooks". "config_fields" e' sempre opzionale, normalizzato ad array vuoto se assente. */
  function getManifest(slug) {
    return A.getFile(SRC + '/' + slug + '/module.json').then(function (f) {
      var j; try { j = JSON.parse(f.text); } catch (e) { throw new Error('module.json non valido in ' + slug); }
      if (!j.hooks) throw new Error(slug + ': module.json senza "hooks" (usa {} se il modulo non ne usa nessuno)');
      j.config_fields = Array.isArray(j.config_fields) ? j.config_fields : [];
      return j;
    });
  }

  /* ---- lettura semplice di un blocco YAML "chiave: valore" (una riga per campo, come fmGet) ----
     _data/modules/<slug>.yml e' scritto SOLO da questo file (mai a mano), quindi si permette un
     formato ristretto: SEMPRE piatto, una riga "chiave: valore" per ogni config_field, valori
     stringa quotati con A.yq() se servono caratteri speciali. Niente liste/oggetti annidati: se in
     futuro un modulo avesse bisogno di struttura piu' complessa, questo parser va rifatto (per ora
     nessun modulo lo richiede). */
  /* A CAPO NEI VALORI (es. textarea con un percorso per riga): il formato e' "una riga per campo",
     quindi gli a-capo vengono salvati come la sequenza letterale \n dentro una stringa tra virgolette
     doppie (YAML la legge come a-capo vero, [FONTE: YAML 1.1 double-quoted scalars, Psych di Jekyll]),
     e ripristinati in lettura. Nel Liquid del modulo, site.data.modules.<slug>.<campo> contiene gia'
     gli a-capo veri: nel Liquid basta il filtro split con "\n" come separatore (vedi esempio in
     modules_source/sitemap/root/sitemap.xml). Regola universale: vale per QUALSIASI campo di QUALSIASI modulo. */
  function parseFlatYaml(t) {
    var o = {}; (t || '').split(/\r?\n/).forEach(function (line) {
      var m = line.match(/^([a-zA-Z0-9_]+):[ \t]*(.*)$/);
      // Un solo passaggio sulle sequenze di escape (\\ \" \n): cosi' un backslash letterale prima di una "n" non diventa un a-capo.
      if (m) o[m[1]] = m[2].trim().replace(/^"|"$/g, '').replace(/\\(\\|"|n)/g, function (_, c) { return c === 'n' ? '\n' : c; });
    });
    return o;
  }
  function buildFlatYaml(fields, values) {
    return fields.map(function (f) {
      var v = values[f.key] != null ? values[f.key] : (f.default || '');
      if (f.type === 'checkbox') return f.key + ': ' + (v === true || v === 'true' ? 'true' : 'false');
      var s = String(v);
      // Se c'e' un a-capo: forza le virgolette doppie e scrivi \n (una riga sola nel file).
      if (/[\r\n]/.test(s)) return f.key + ': "' + s.replace(/\r/g, '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
      return f.key + ': ' + A.yq(s);
    }).join('\n') + '\n';
  }

  /* ---- vista principale ---- */
  A.views.modules = function () {
    var installed, avail;
    return getRegistry().then(function (r) {
      installed = r.reg;
      return A.getDir(SRC);
    }).then(function (l) {
      var dirs = (l || []).filter(function (f) { return f.type === 'dir'; }).map(function (f) { return f.name; });
      return dirs.reduce(function (pr, slug) {
        return pr.then(function (acc) {
          return getManifest(slug).then(function (j) { acc.push({ slug: slug, manifest: j }); return acc; }, function () { return acc; });
        });
      }, Promise.resolve([]));
    }).then(function (a) {
      avail = a;
      var h = '<h2>Moduli</h2>';
      h += '<div class="card"><small>Cartelle in <code>' + SRC + '/</code> con un <code>module.json</code> valido. ' +
        'Per aggiungerne uno nuovo, crea la cartella nel repo (vedi commento in admin-modules.js per lo standard) e ricarica questa pagina.</small></div>';

      h += '<h3>Installati</h3><div class="card list">';
      var instSlugs = Object.keys(installed);
      if (!instSlugs.length) h += '<small>Nessun modulo installato.</small>';
      instSlugs.forEach(function (s) {
        var m = installed[s];
        h += '<div class="it"><span><b>' + esc(m.name) + '</b> <small>(' + esc(s) + ', hook: ' + esc(Object.keys(m.hooks || {}).join(', ') || '-') + ')</small></span>' +
          '<small class="' + (m.enabled ? 'ok' : 'ko') + '">' + (m.enabled ? 'Attivo' : 'Disattivo') + '</small> ' +
          /* REGOLA UNIVERSALE: il bottone Configura c'e' SEMPRE, per OGNI modulo installato (anche senza
             config_fields e senza roots). La pagina Configura (A.views.mdconfig) decide cosa mostrare:
             info del modulo (sempre), URL pubblici con Copia se ha roots, form se ha config_fields.
             NON legare mai questo bottone a una condizione: un modulo senza campi resta comunque configurabile/ispezionabile. */
          '<button class="btn sm" onclick="A.mdConfig(\'' + A.jq(s) + '\')">Configura</button> ' +
          '<button class="btn sm" onclick="A.mdToggle(\'' + A.jq(s) + '\')">' + (m.enabled ? 'Disattiva' : 'Attiva') + '</button> ' +
          '<button class="btn sm danger" onclick="A.mdUninstall(\'' + A.jq(s) + '\')">Disinstalla</button></div>';
        // L'URL pubblico dei file root/ non sta piu' qui: e' nella pagina Configura (A.views.mdconfig), uguale per tutti i moduli.
      });
      h += '</div>';

      h += '<h3>Disponibili</h3><div class="card list">';
      var toInstall = avail.filter(function (a) { return !installed[a.slug]; });
      if (!toInstall.length) h += '<small>Nessun modulo nuovo trovato in ' + SRC + '/.</small>';
      toInstall.forEach(function (a) {
        h += '<div class="it"><span><b>' + esc(a.manifest.name || a.slug) + '</b> <small>(' + esc(a.slug) + ', hook: ' + esc(Object.keys(a.manifest.hooks).join(', ') || '-') + ')</small></span>' +
          '<button class="btn sm primary" onclick="A.mdInstall(\'' + A.jq(a.slug) + '\')">Installa</button></div>';
      });
      h += '</div>';
      M().innerHTML = h;
    });
  };

  /* ---- vista Configura (stile PrestaShop: un form coi campi dichiarati da config_fields) ----
     Legge i valori attuali da _data/modules/<slug>.yml (se manca, usa i default del manifest
     installato) e mostra un input per campo, in base al "type": text/textarea/checkbox semplici,
     "image" mostra il valore attuale (percorso) + input file per sostituirlo. Salvare scrive SOLO
     _data/modules/<slug>.yml (putFile, non serve commitFiles: e' un file solo, non un'installazione). */
  A.views.mdconfig = function (slug) {
    var reg, manifest, dataPath = DATA + '/' + slug + '.yml';
    return getRegistry().then(function (r) {
      reg = r.reg[slug]; if (!reg) throw new Error('Modulo non installato');
      manifest = reg;
      return A.getFile(dataPath).catch(function (e) { if (e.status === 404) return { text: '', sha: '' }; throw e; });
    }).then(function (f) {
      var values = parseFlatYaml(f.text), sha = f.sha;
      var fields = manifest.config_fields || [], roots = manifest.roots || [];
      var h = '<h2>Configura: ' + esc(manifest.name) + '</h2>';
      /* PAGINA CONFIGURA UNIVERSALE (vale per OGNI modulo, vedi regola in A.views.modules):
         1) scheda INFO, sempre: slug, stato, hook. 2) scheda URL, solo se il modulo ha roots (file in
         radice come sitemap.xml): URL completo + Copia. 3) form, solo se ha config_fields.
         Se non ha ne' roots ne' campi, lo dice: cosi' la pagina non sembra mai rotta o vuota. */
      h += '<div class="card"><small><b>Slug:</b> <code>' + esc(slug) + '</code> &middot; <b>Stato:</b> ' + (manifest.enabled ? 'Attivo' : 'Disattivo') +
        ' &middot; <b>Hook:</b> ' + esc(Object.keys(manifest.hooks || {}).join(', ') || 'nessuno') + '</small></div>';
      if (roots.length) {
        h += '<div class="card"><b>Indirizzi pubblici</b><br><small>Copia e incolla dove serve (es. Google Search Console).</small>';
        roots.forEach(function (path) {
          var id = slug + '_' + path;
          h += '<div class="it" style="padding:6px 0"><code id="mdurl_' + esc(id) + '">' + esc(A.siteUrl() + path) + '</code> ' +
            '<button class="btn sm" onclick="A.mdCopy(\'' + A.jq(id) + '\')">Copia</button> ' +
            '<a class="btn sm" href="' + esc(A.siteUrl() + path) + '" target="_blank" rel="noopener">Apri</a></div>';
        });
        h += '</div>';
      }
      if (!fields.length && !roots.length) {
        h += '<div class="card"><small>Questo modulo non ha impostazioni da modificare: si comporta sempre allo stesso modo. ' +
          'Puoi solo attivarlo, disattivarlo o disinstallarlo dalla lista Moduli.</small> ' +
          '<div style="margin-top:10px"><button class="btn" onclick="A.go(\'modules\')">Indietro</button></div></div>';
        M().innerHTML = h; return;
      }
      if (!fields.length) {
        h += '<div style="margin-top:10px"><button class="btn" onclick="A.go(\'modules\')">Indietro</button></div>';
        M().innerHTML = h; return;
      }
      h += '<div class="card">';
      fields.forEach(function (fld) {
        var v = values[fld.key] != null ? values[fld.key] : (fld.default || '');
        h += '<label>' + esc(fld.label || fld.key) + '</label>';
        if (fld.type === 'textarea') {
          h += '<textarea id="mdf_' + esc(fld.key) + '" rows="4">' + esc(v) + '</textarea>';
        } else if (fld.type === 'checkbox') {
          h += '<div><input type="checkbox" id="mdf_' + esc(fld.key) + '" ' + (v === 'true' || v === true ? 'checked' : '') + '> <small>Attivo</small></div>';
        } else if (fld.type === 'image') {
          // Immagine: mostra il percorso attuale (se c'e') e un input file. L'upload vero avviene al salvataggio (A.mdConfigSave), come A.upload in admin-media.js.
          h += '<div class="it" style="padding:4px 0">' + (v ? '<small>Attuale: <code>' + esc(v) + '</code></small>' : '<small>Nessuna immagine impostata</small>') + '</div>';
          h += '<input type="file" id="mdf_' + esc(fld.key) + '" accept="image/*" data-current="' + esc(v) + '">';
        } else {
          h += '<input type="text" id="mdf_' + esc(fld.key) + '" value="' + esc(v) + '">';
        }
      });
      h += '<div style="margin-top:10px"><button class="btn primary" onclick="A.mdConfigSave(\'' + esc(slug) + '\',\'' + A.jq(sha) + '\')">Salva</button> ' +
        '<button class="btn" onclick="A.go(\'modules\')">Annulla</button></div></div>';
      M().innerHTML = h;
    });
  };
  /* NIENTE A.go('modules') qui (bug 04/10/2026): A.go lancia in parallelo la lista Moduli, che finiva DOPO e copriva la pagina Configura (si apriva e si richiudeva dopo un secondo). */
  A.mdConfig = function (slug) { M().innerHTML = '<div class="card">Caricamento...</div>'; A.views.mdconfig(slug).catch(function (e) { M().innerHTML = '<div class="card">Errore: ' + esc(A.errMsg(e)) + '</div>'; }); };

  /* mdConfigSave: legge i valori dai campi del form, carica eventuali immagini nuove (assets/modules/<slug>/,
     stesso principio base64 diretto da FileReader di A.upload in admin-media.js: niente riscrittura,
     solo il prefisso data:...;base64, va tolto), ricompone data.yml PIATTO (buildFlatYaml) e salva
     con un putFile solo (non e' un'installazione, non serve commitFiles). */
  A.mdConfigSave = A.wrap(function (slug, sha) {
    var manifest;
    return getRegistry().then(function (r) {
      manifest = r.reg[slug]; if (!manifest) throw new Error('Modulo non installato');
      var fields = manifest.config_fields || [];
      return fields.reduce(function (pr, fld) {
        return pr.then(function (values) {
          var el = $('mdf_' + fld.key);
          if (fld.type === 'checkbox') { values[fld.key] = el.checked ? 'true' : 'false'; return values; }
          if (fld.type === 'image' && el.files && el.files[0]) {
            var file = el.files[0], ext = (file.name.match(/\.[a-z0-9]+$/i) || [''])[0];
            var path = IMG + '/' + slug + '/' + fld.key + ext;
            return new Promise(function (res, rej) {
              var fr = new FileReader();
              fr.onload = function () { res(fr.result.split(',')[1]); }; fr.onerror = rej; fr.readAsDataURL(file);
            }).then(function (b64) {
              return A.putFile(path, b64, null, 'admin: immagine modulo ' + slug + ' (' + fld.key + ')', true).then(function () {
                values[fld.key] = path; return values;
              });
            });
          }
          values[fld.key] = fld.type === 'image' ? (el.getAttribute('data-current') || '') : el.value;
          return values;
        });
      }, Promise.resolve({}));
    }).then(function (values) {
      var yaml = buildFlatYaml(manifest.config_fields || [], values);
      return A.putFile(DATA + '/' + slug + '.yml', yaml, sha || undefined, 'admin: configura modulo ' + slug);
    }).then(function () { A.toast('Configurazione salvata'); A.go('modules'); });
  });

  /* mdCopy: copia negli appunti l'URL mostrato per un file root/ (vedi riquadro nella vista principale). */
  A.mdCopy = function (id) {
    var el = $('mdurl_' + id); if (!el) return;
    var text = el.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(function () { A.toast('URL copiato'); })
      .catch(function () {
        var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); document.body.removeChild(ta); A.toast('URL copiato');
      });
  };

  /* ---- installazione: legge tutti i file del modulo e li scrive con UN commit (A.commitFiles) ----
     A.commitFiles fa 1 solo commit per N file: o entra tutto o non entra niente. E' l'unica
     operazione che tocca potenzialmente decine di file insieme (include + assets + registry). */
  function listModuleFiles(slug, prefix) {
    var base = SRC + '/' + slug + (prefix ? '/' + prefix : '');
    return A.getDir(base).then(function (l) {
      return (l || []).reduce(function (pr, f) {
        return pr.then(function (acc) {
          var rel = (prefix ? prefix + '/' : '') + f.name;
          if (f.type === 'dir') return listModuleFiles(slug, rel).then(function (sub) { return acc.concat(sub); });
          acc.push({ rel: rel, item: f }); return acc;
        });
      }, Promise.resolve([]));
    });
  }
  /* Percorso di destinazione per un file del modulo, oppure null se non va copiato (module.json).
     root/<file> -> <file> in radice del sito (vedi commento in testa al file per i rischi). */
  function destFor(slug, rel) {
    if (rel === 'module.json') return null;
    if (rel === 'data.yml') return DATA + '/' + slug + '.yml';
    if (/^assets\//.test(rel)) return IMG + '/' + slug + '/' + rel.replace(/^assets\//, '');
    if (/^root\//.test(rel)) return rel.replace(/^root\//, '');
    return INC + '/' + slug + '/' + rel;
  }
  A.mdInstall = A.wrap(function (slug) {
    var manifest, roots;
    return getManifest(slug).then(function (j) {
      manifest = j;
      var missing = Object.keys(j.hooks).filter(function (h) { return !j.hooks[h]; });
      if (missing.length) throw new Error('module.json incompleto: hook senza file (' + missing.join(', ') + ')');
      return listModuleFiles(slug, '');
    }).then(function (files) {
      var relList = files.map(function (f) { return f.rel; });
      var hookFiles = Object.keys(manifest.hooks).map(function (h) { return manifest.hooks[h]; });
      var missingFiles = hookFiles.filter(function (hf) { return relList.indexOf(hf) === -1; });
      if (missingFiles.length) throw new Error('File hook mancanti in ' + slug + ': ' + missingFiles.join(', '));
      // Percorsi finali dei file root/ (per salvarli nel registry, servono al riquadro URL nella vista principale).
      roots = files.filter(function (f) { return /^root\//.test(f.rel); }).map(function (f) { return destFor(slug, f.rel); });
      return files.reduce(function (pr, f) {
        return pr.then(function (acc) {
          var dest = destFor(slug, f.rel);
          if (!dest) return acc;
          var isAsset = /^assets\//.test(f.rel);
          return A.getFile(SRC + '/' + slug + '/' + f.rel).then(function (raw) {
            if (isAsset) acc.push({ path: dest, b64: raw.content.replace(/\n/g, '') });
            else acc.push({ path: dest, text: raw.text });
            return acc;
          });
        });
      }, Promise.resolve([]));
    }).then(function (changes) {
      return A.commitFiles(changes, 'admin: installa modulo ' + slug + ' (' + changes.length + ' file)');
    }).then(function () {
      return getRegistry();
    }).then(function (r) {
      r.reg[slug] = { name: manifest.name || slug, enabled: true, hooks: manifest.hooks,
        config_fields: manifest.config_fields || [], roots: roots };
      return A.putFile(REG, buildRegistry(r.reg), r.sha, 'admin: registra modulo ' + slug);
    }).then(function () { A.toast('Modulo installato'); A.go('modules'); });
  });

  A.mdToggle = A.wrap(function (slug) {
    return getRegistry().then(function (r) {
      if (!r.reg[slug]) throw new Error('Modulo non trovato');
      r.reg[slug].enabled = !r.reg[slug].enabled;
      return A.putFile(REG, buildRegistry(r.reg), r.sha, 'admin: ' + (r.reg[slug].enabled ? 'attiva' : 'disattiva') + ' modulo ' + slug);
    }).then(function () { A.toast('Aggiornato'); A.go('modules'); });
  });

  /* mdUninstall: toglie la riga dal registry. NON cancella i file installati (restano nel repo per
     reinstallazione immediata senza perdita dati, inclusi eventuali file root/: disinstallare NON
     li rimuove dalla radice del sito, restano pubblicati finche' non cancellati a mano). */
  A.mdUninstall = A.wrap(function (slug) {
    if (!confirm('Disinstallare ' + slug + '? (i file restano nel repo, si toglie solo l\'aggancio)')) return;
    return getRegistry().then(function (r) {
      delete r.reg[slug];
      return A.putFile(REG, buildRegistry(r.reg), r.sha, 'admin: disinstalla modulo ' + slug);
    }).then(function () { A.toast('Disinstallato'); A.go('modules'); });
  });
})(A);
