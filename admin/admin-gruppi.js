/* Menu laterale a GRUPPI comprimibili + vista "Messaggi" (foglio dei contatti). Vedi CLAUDE.md > Menu admin.
   PUNTI CRITICI: (1) i gruppi sono in index.html (div.grp > button.gh + div.gb): senza questo file il menu resta TUTTO aperto,
   perche' il CSS nasconde i gruppi solo se .side ha la classe "js", che aggiunge questo script. (2) Stato aperto/chiuso nel browser
   (localStorage 'adm_grp'). (3) Il gruppo con la voce attiva si apre da solo (MutationObserver sulla classe "on", impostata da go()).
   (4) Il foglio Google NON si puo' incorporare in un iframe (Google lo vieta) e "pubblicare sul web" renderebbe pubbliche le email:
   per questo la vista apre il foglio in una nuova scheda. Per un cambio di foglio modifica SHEET qui sotto. */
(function (A) {
  var SHEET = 'https://docs.google.com/spreadsheets/d/109O4tr3kDdP8HCLOSfBVqVk59xeNbK9ztb9vAABRf-E/edit';
  var KEY = 'adm_grp', side = document.getElementById('side');
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } }

  if (side) {
    var st = load();
    [].slice.call(side.querySelectorAll('.grp')).forEach(function (g) {
      var n = g.getAttribute('data-g'), h = g.querySelector('.gh');
      function set(o) { g.classList.toggle('open', o); h.setAttribute('aria-expanded', o ? 'true' : 'false'); }
      set(n in st ? !!st[n] : n === 'contenuti');
      h.addEventListener('click', function () { var o = !g.classList.contains('open'); set(o); st[n] = o; save(st); });
    });
    side.classList.add('js');
    new MutationObserver(function () {
      var a = side.querySelector('a.on'), g = a && a.closest('.grp');
      if (g && !g.classList.contains('open')) g.classList.add('open');
    }).observe(side, { attributes: true, attributeFilter: ['class'], subtree: true });
  }

  A.views.messaggi = function () {
    document.getElementById('topTitle').textContent = 'Messaggi';
    A.main().innerHTML = '<div class="card"><h2 style="margin-top:0">Messaggi dal form contatti</h2>' +
      '<p>I messaggi arrivano nel foglio Google, nella scheda dei contatti (bottone <b>contatto-form</b>).</p>' +
      '<p><a class="btn primary" href="' + SHEET + '" target="_blank" rel="noopener">Apri il foglio &#8599;</a></p>' +
      '<p style="color:#646970;font-size:13px">Si apre in una nuova scheda: Google non permette di mostrarlo dentro l\'admin, ' +
      'e renderlo pubblico per incorporarlo esporrebbe nomi ed email.</p></div>';
    return Promise.resolve();
  };
})(A);
