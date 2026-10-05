/* Ingrandimento foto delle gallerie (_includes/galleria.liquid). Senza librerie. Ogni galleria e' un gruppo a se' (attributo data-galleria):
   frecce e tasti sinistra/destra scorrono solo le foto di QUELLA galleria. Esc o clic sullo sfondo chiude. Vedi CLAUDE.md > Gallerie. */
(function () {
  if (window.__galleria) return; window.__galleria = 1;
  var box = null, list = [], idx = 0, x0 = null;
  function show() {
    var a = list[idx];
    box.querySelector('img').src = a.href;
    box.querySelector('.glb-cap').textContent = a.getAttribute('data-cap') || '';
    box.querySelector('.glb-cnt').textContent = list.length > 1 ? (idx + 1) + ' / ' + list.length : '';
    box.querySelector('.glb-p').style.display = box.querySelector('.glb-n').style.display = list.length > 1 ? '' : 'none';
  }
  function step(d) { idx = (idx + d + list.length) % list.length; show(); }
  function close() { if (box) { box.remove(); box = null; } document.removeEventListener('keydown', key); }
  function key(e) { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); }
  function open(a) {
    var g = a.getAttribute('data-galleria');
    list = Array.prototype.filter.call(document.querySelectorAll('a[data-galleria]'), function (n) { return n.getAttribute('data-galleria') === g; });
    idx = Math.max(0, list.indexOf(a));
    box = document.createElement('div'); box.className = 'glb';
    box.innerHTML = '<span class="glb-cnt"></span><button class="glb-x" aria-label="Chiudi">&times;</button><button class="glb-p" aria-label="Precedente">&#8249;</button><img alt=""><button class="glb-n" aria-label="Successiva">&#8250;</button><div class="glb-cap"></div>';
    box.addEventListener('click', function (e) {
      if (e.target.classList.contains('glb-p')) step(-1);
      else if (e.target.classList.contains('glb-n')) step(1);
      else if (e.target.tagName !== 'IMG') close();
    });
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); }, { passive: true });
    document.body.appendChild(box); document.addEventListener('keydown', key); show();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-galleria]') : null;
    if (!a) return; e.preventDefault(); open(a);
  });
})();
