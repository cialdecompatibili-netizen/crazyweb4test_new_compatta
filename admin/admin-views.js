/* Viste admin: Bacheca, Articoli, Progetti, News (lista + editor generico). Vedi claude.md */
(function (A) {
  var $ = A.$, esc = A.esc, M = function () { return A.main(); };

  /* ---- editor markdown: toolbar minima ---- */
  window.mdIns = function (a, b) {
    var t = $('body'), s = t.selectionStart, e = t.selectionEnd, v = t.value, sel = v.slice(s, e);
    t.value = v.slice(0, s) + a + sel + (b || '') + v.slice(e); t.focus();
    t.selectionStart = s + a.length; t.selectionEnd = s + a.length + sel.length;
  };
  /* ---- EDITOR VISUALE MARKDOWN (senza librerie) ------------------------------------------------
     #mdPrev e' un contenteditable: si scrive direttamente sul testo formattato. La textarea #body resta
     la fonte di verita' (il salvataggio legge $('body').value): a ogni modifica htmlToMd() la riscrive.
     Parte in VISUALE; "Sorgente" mostra il markdown grezzo.
     BLOCCHI PROTETTI: cio' che il visuale non sa modificare semanticamente (tabelle, HTML a blocchi,
     Liquid {% %} / {{ }}) diventa <div class="mdraw" data-raw="..."> con il testo ORIGINALE in un attributo,
     riscritto identico byte per byte: non si corrompe mai. Si vede la resa e con la matita si edita il sorgente.
     Liquid dentro un paragrafo = chip <span class="mdliq"> (idem: raw in data-raw).
     Il raw mostrato nel visuale e' sanificato (via <script>, on*=, javascript:): il salvato resta l'originale. */
  function safeHtml(h) {
    return String(h)
      .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form)\b[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi, '')
      .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form)\b[^>]*>/gi, '')
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|src|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');
  }
  function attr(s) { return esc(s); }
  function rawBlock(kind, raw) {
    var inner;
    if (kind === 'table') inner = mdTable(raw);
    else if (kind === 'html') inner = safeHtml(liqChips(raw));
    else if (kind === 'quote') inner = '<blockquote style="margin:0">' + esc(raw.replace(/^>\s?/gm, '')) + '</blockquote>';
    else if (kind === 'code' || kind === 'list') inner = '<pre style="margin:0;white-space:pre-wrap">' + esc(raw) + '</pre>';
    else inner = '<code class="mdliqb">' + esc(raw) + '</code>';
    return '<div class="mdraw mdraw-' + kind + '" data-kind="' + kind + '" data-raw="' + attr(raw) + '" contenteditable="false">' +
      '<button type="button" class="mdedit" title="Modifica sorgente del blocco" onclick="mdRawEdit(this)">&#9998;</button>' +
      '<button type="button" class="mdedit mddel" title="Elimina blocco" onclick="mdRawDel(this)">&#10005;</button>' +
      '<span class="mdedit mddrag" title="Trascina per spostare il blocco">&#8942;&#8942;</span>' +
      '<div class="mdraw-view">' + inner + '</div></div>';
  }
  /* {% ... %} e {{ ... }} dentro l'HTML/paragrafo: chip non modificabili (raw in data-raw) */
  function liqChips(t) {
    return String(t).replace(/(\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\})/g, function (m) {
      return '<span class="mdliq" contenteditable="false" data-raw="' + attr(m) + '">' + esc(m.length > 34 ? m.slice(0, 32) + '..' : m) + '</span>';
    });
  }
  function splitRow(r) { r = r.trim().replace(/^\|/, '').replace(/\|$/, ''); return r.split(/(?<!\\)\|/).map(function (c) { return c.trim(); }); }
  function mdTable(raw) {
    var L = raw.split('\n').filter(function (x) { return x.trim(); });
    if (L.length < 2) return '<pre>' + esc(raw) + '</pre>';
    var head = splitRow(L[0]), al = splitRow(L[1]).map(function (c) { return /^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : 'left'; });
    var h = '<table><thead><tr>' + head.map(function (c, k) { return '<th style="text-align:' + (al[k] || 'left') + '">' + mdInline(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    L.slice(2).forEach(function (r) { h += '<tr>' + splitRow(r).map(function (c, k) { return '<td style="text-align:' + (al[k] || 'left') + '">' + mdInline(c) + '</td>'; }).join('') + '</tr>'; });
    return h + '</tbody></table>';
  }
  function mdInline(s) {
    var keep = [];
    function K(m) { keep.push(m); return '\u0001' + (keep.length - 1) + '\u0002'; }
    s = String(s);
    /* 1) codice inline PRIMA di tutto: dentro ai backtick non si tocca niente (tag, liquid, asterischi) */
    s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, function (m, t, c) { return K('<code data-b="' + t.length + '">' + esc(c) + '</code>'); });
    /* 2) link/immagini il cui URL o testo contiene Liquid o HTML: restano TESTO PROTETTO (chip), mai riscritti */
    s = s.replace(/!?\[[^\]]*\]\([^)]*(\{%|\{\{|<)[^)]*\)/g, function (m) { return K('<span class="mdliq" contenteditable="false" data-raw="' + attr(m) + '">' + esc(m.length > 40 ? m.slice(0, 38) + '..' : m) + '</span>'); });
    /* 3) Liquid e HTML inline restanti: chip protetti */
    s = s.replace(/(\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\})/g, function (m) { return K(liqChips(m)); });
    s = s.replace(/<\/?[a-zA-Z][a-zA-Z0-9-]*(\s[^<>]*)?\/?>/g, function (m) { return K('<span class="mdliq" contenteditable="false" data-raw="' + attr(m) + '">' + esc(m.length > 34 ? m.slice(0, 32) + '..' : m) + '</span>'); });
    s = esc(s);
    /* 4) markdown semplice */
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%">');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    /* 5) rimetto i pezzi protetti */
    for (var n = 0; n < 3 && /\u0001\d+\u0002/.test(s); n++) s = s.replace(/\u0001(\d+)\u0002/g, function (_, k) { return keep[+k]; });
    return s;
  }
  /* Un tag "blocco": elementi HTML standard di struttura + QUALSIASI custom element (nome con trattino:
     <swiper-container>, <d-article>...) + commenti/direttive. Tutto questo diventa blocco protetto. */
  var HTML_BLOCK = /^\s*(<\/?(div|section|article|aside|header|footer|nav|figure|figcaption|table|thead|tbody|tr|td|th|ul|ol|li|details|summary|iframe|video|audio|center|p|h[1-6]|pre|blockquote|hr|style|script|form|dl|dt|dd|svg|canvas|picture|source|template|main|label|select|textarea|input|button)\b|<\/?[a-z][a-z0-9]*-[a-z0-9-]*\b|<!--)/i;
  var DEPTH_TAG = /<\/?(div|section|article|aside|figure|details|table|ul|ol|blockquote|iframe|video|audio|swiper-container|swiper-slide|d-[a-z-]+|[a-z][a-z0-9]*-[a-z0-9-]+)\b[^>]*>/gi;
  function tagDepth(line) {
    var d = 0, m; DEPTH_TAG.lastIndex = 0;
    while ((m = DEPTH_TAG.exec(line))) { if (/\/>$/.test(m[0])) continue; d += /^<\//.test(m[0]) ? -1 : 1; }
    return d;
  }
  /* Blocchi che il visuale NON deve mai reinterpretare: math display $$, direttive kramdown {: ...} sole,
     definizioni footnote [^x]:, righe con indentazione di codice (4 spazi/tab), liste annidate/checkbox. */
  function isProtectedLine(l) {
    return /^\s*\$\$/.test(l) || /^\s*\{:[^}]*\}\s*$/.test(l) || /^\s*\[\^[^\]]+\]:/.test(l) ||
      /^( {4,}|\t)\S/.test(l) || /^\s+[-*+]\s/.test(l) || /^\s*[-*+]\s+\[[ xX]\]\s/.test(l) || /^\s*\d+[.)]\s+.*$/.test(l) && /^\s{2,}/.test(l);
  }
  function roundTrips(html, orig) {
    try {
      var d = document.createElement('div'); d.innerHTML = html;
      return htmlToMd(d).replace(/\n+$/, '') === String(orig).replace(/\s+$/, '');
    } catch (e) { return false; }
  }
  window.mdRender = function (src) {
    var lines = String(src || '').replace(/\r/g, '').split('\n'), out = [], i = 0, list = null, para = [];
    function flushP() {
      if (!para.length) return;
      var html = '<p>' + para.map(mdInline).join('<br>') + '</p>', orig = para.join('\n');
      if (!roundTrips(html, orig)) html = rawBlock('html', orig);   /* non torna identico -> blocco protetto */
      out.push(html); para = [];
    }
    function flushL() { if (list) { out.push('</' + list + '>'); list = null; } }
    function protect(kind, arr) { flushP(); flushL(); out.push(rawBlock(kind, arr.join('\n'))); }
    while (i < lines.length) {
      var l = lines[i], m;
      if (/^\s*(`{3,}|~{3,})/.test(l)) {                     /* fence: SEMPRE blocco protetto; si chiude solo con >= stessi caratteri dell'apertura */
        var fm = /^\s*(`{3,}|~{3,})/.exec(l), fch = fm[1].charAt(0), fn = fm[1].length, blk = [l]; i++;
        var closeRe = new RegExp('^\\s*\\' + fch + '{' + fn + ',}\\s*$');
        while (i < lines.length && !closeRe.test(lines[i])) { blk.push(lines[i]); i++; }
        if (i < lines.length) { blk.push(lines[i]); i++; }
        protect('code', blk); continue;
      }
      if (/^\s*\$\$/.test(l)) {                               /* math display $$ ... $$ (anche su una riga) */
        var mb = [l]; var one = /^\s*\$\$[\s\S]*\$\$\s*$/.test(l) && l.trim().length > 4; i++;
        if (!one) { while (i < lines.length && !/\$\$\s*$/.test(lines[i])) { mb.push(lines[i]); i++; } if (i < lines.length) { mb.push(lines[i]); i++; } }
        protect('liquid', mb); continue;
      }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
        var tb = []; while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { tb.push(lines[i]); i++; }
        protect('table', tb); continue;
      }
      if (/^\s*\{%[^%]*%\}\s*$/.test(l) || /^\s*\{:[^}]*\}\s*$/.test(l) || /^\s*\[\^[^\]]+\]:/.test(l) || /^\s*<!--more-->\s*$/.test(l)) { protect('liquid', [l]); i++; continue; }  /* <!--more--> = taglio dell'estratto nell'elenco blog (vedi _includes/estratto.liquid) */
      if (HTML_BLOCK.test(l)) {                               /* HTML / custom element: fino a chiusura bilanciata + riga vuota */
        var hb = [l], depth = tagDepth(l); i++;
        while (i < lines.length && (depth > 0 || !/^\s*$/.test(lines[i]))) { hb.push(lines[i]); depth += tagDepth(lines[i]); i++; }
        protect('html', hb); continue;
      }
      if (isProtectedLine(l)) {                               /* liste annidate, checkbox, codice indentato: gruppo protetto */
        var gb = [l]; i++;
        while (i < lines.length && !/^\s*$/.test(lines[i]) && (isProtectedLine(lines[i]) || /^\s+\S/.test(lines[i]) || /^\s*[-*+]\s/.test(lines[i]) || /^\s*\d+[.)]\s/.test(lines[i]))) { gb.push(lines[i]); i++; }
        protect('list', gb); continue;
      }
      if (/^(?:[-*+]|\d+[.)])\s+/.test(l)) {                  /* gruppo di lista: guardo se ha righe indentate (sotto-liste, continuazioni) */
        var j = i + 1, nested = false;
        while (j < lines.length && !/^\s*$/.test(lines[j]) && (/^\s+\S/.test(lines[j]) || /^(?:[-*+]|\d+[.)])\s+/.test(lines[j]))) { if (/^\s+\S/.test(lines[j])) nested = true; j++; }
        if (nested) { protect('list', lines.slice(i, j)); i = j; continue; }
      }
      if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { flushP(); flushL(); var hh = '<h' + m[1].length + '>' + mdInline(m[2]) + '</h' + m[1].length + '>'; out.push(roundTrips(hh, l) ? hh : rawBlock('html', l)); }
      else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { flushP(); flushL(); out.push('<hr>'); }
      else if ((m = /^([-*+])\s+(.*)$/.exec(l))) { flushP(); if (list !== 'ul') { flushL(); out.push('<ul data-m="' + m[1] + '">'); list = 'ul'; } var lu = '<li>' + mdInline(m[2]) + '</li>'; out.push(lu); }
      else if ((m = /^(\d+)([.)])\s+(.*)$/.exec(l))) { flushP(); if (list !== 'ol') { flushL(); out.push('<ol start="' + m[1] + '" data-d="' + m[2] + '">'); list = 'ol'; } out.push('<li>' + mdInline(m[3]) + '</li>'); }
      else if (/^>/.test(l)) {
        flushP(); flushL(); var qb = [l]; while (i + 1 < lines.length && /^>/.test(lines[i + 1])) { i++; qb.push(lines[i]); }
        var qh = qb.length === 1 && /^>\s?\S/.test(qb[0]) ? '<blockquote>' + mdInline(qb[0].replace(/^>\s?/, '')) + '</blockquote>' : '';
        out.push(qh && roundTrips(qh, qb[0]) ? qh : rawBlock('quote', qb.join('\n')));
      }
      else if (/^\s*$/.test(l)) { flushP(); flushL(); }
      else { flushL(); para.push(l.replace(/\s+$/, '')); }
      i++;
    }
    flushP(); flushL();
    return out.join('\n');
  };
  /* --- HTML -> markdown (il contrario). I blocchi/chip protetti tornano al loro raw originale --- */
  function mdNode(n, ctx) {
    if (n.nodeType === 3) return n.nodeValue.replace(/\u00a0/g, ' ');
    if (n.nodeType !== 1) return '';
    var tag = n.tagName.toLowerCase(), inner = function () { return Array.prototype.map.call(n.childNodes, function (c) { return mdNode(c, ctx); }).join(''); };
    if (n.classList && n.classList.contains('mdraw')) return '\n\n' + n.getAttribute('data-raw') + '\n\n';
    if (n.classList && n.classList.contains('mdliq')) return n.getAttribute('data-raw');
    if (tag === 'button') return '';
    switch (tag) {
      case 'strong': case 'b': var a = inner(); return a.trim() ? '**' + a + '**' : a;
      case 'em': case 'i': var b = inner(); return b.trim() ? '*' + b + '*' : b;
      case 'code': if (n.parentNode && n.parentNode.tagName === 'PRE') return inner(); var bt = new Array((+n.getAttribute('data-b') || 1) + 1).join('`'); return bt + n.textContent + bt;
      case 'a': return '[' + inner() + '](' + (n.getAttribute('href') || '') + ')';
      case 'img': return '![' + (n.getAttribute('alt') || '') + '](' + (n.getAttribute('src') || '') + ')';
      case 'br': return '\n';
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return '\n\n' + new Array(+tag[1] + 1).join('#') + ' ' + inner().replace(/\n+/g, ' ').trim() + '\n\n';
      case 'p': case 'div': return '\n\n' + inner().trim() + '\n\n';
      case 'blockquote': return '\n\n> ' + inner().trim().replace(/\n+/g, ' ') + '\n\n';
      case 'hr': return '\n\n---\n\n';
      case 'pre': return '\n\n```' + (n.getAttribute('data-lang') || '') + '\n' + n.textContent.replace(/\n+$/, '') + '\n```\n\n';
      case 'ul': case 'ol': {
        var i = 0, out = '\n\n';
        Array.prototype.forEach.call(n.children, function (li) {
          if (li.tagName.toLowerCase() !== 'li') return; i++;
          out += (tag === 'ul' ? (n.getAttribute('data-m') || '-') + ' ' : ((+n.getAttribute('start') || 1) + i - 1) + (n.getAttribute('data-d') || '.') + ' ') + mdNode(li, ctx).trim().replace(/\n+/g, ' ') + '\n';
        });
        return out + '\n';
      }
      case 'li': return inner();
      default: return inner();
    }
  }
  function htmlToMd(el) {
    var md = Array.prototype.map.call(el.childNodes, function (c) { return mdNode(c, {}); }).join('');
    return md.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\s+$/g, '') + '\n';
  }
  function visSync() { var t = $('body'), p = $('mdPrev'); if (t && p) t.value = htmlToMd(p); }
  /* Invio dentro un titolo/citazione = paragrafo normale (come Notion/Typora) */
  function visKey(e) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    var sel = window.getSelection(); if (!sel.rangeCount) return;
    var n = sel.anchorNode; n = n && n.nodeType === 3 ? n.parentNode : n;
    while (n && n.id !== 'mdPrev') {
      if (/^(H[1-6]|BLOCKQUOTE)$/.test(n.tagName)) { e.preventDefault(); document.execCommand('insertParagraph'); document.execCommand('formatBlock', false, 'p'); return; }
      if (n.tagName === 'PRE') return;
      n = n.parentNode;
    }
  }
  function visPaste(e) {                                       /* incolla sempre testo semplice */
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
  }
  /* Matita su un blocco protetto: modifica del sorgente in un mini-editor (textarea) sopra il blocco */
  window.mdRawEdit = function (btn) {
    var blk = btn.closest('.mdraw'); if (!blk) return;
    var view = blk.querySelector('.mdraw-view'), ta = blk.querySelector('textarea.mdraw-ta');
    if (!ta) {
      ta = document.createElement('textarea'); ta.className = 'mdraw-ta'; ta.value = blk.getAttribute('data-raw');
      ta.setAttribute('spellcheck', 'false'); ta.style.minHeight = Math.max(90, Math.min(360, ta.value.split('\n').length * 20 + 20)) + 'px';
      blk.appendChild(ta); view.style.display = 'none'; btn.innerHTML = '&#10003;'; btn.title = 'Applica'; ta.focus();
    } else {
      var kind = blk.getAttribute('data-kind'), tmp = document.createElement('div');
      tmp.innerHTML = rawBlock(kind, ta.value.replace(/\s+$/, ''));
      blk.parentNode.replaceChild(tmp.firstChild, blk); visSync();
    }
  };
  /* Elimina un blocco protetto (immagine, galleria, tabella, Leggi tutto...) con conferma. Se il testo resta vuoto rimette un paragrafo per poter scrivere. */
  window.mdRawDel = function (btn) {
    var blk = btn.closest('.mdraw'), p = mdPrev; if (!blk || !p) return;
    if (!confirm('Eliminare questo blocco dal testo?')) return;
    blk.remove(); if (!p.firstChild) p.innerHTML = '<p><br></p>'; visSync();
  };
  /* Trascinare i blocchi protetti: si prende la maniglia (due puntini) e si lascia sopra o sotto un altro elemento (riga blu = dove finisce).
     Drag nativo del browser, nessuna libreria. draggable e' attivo solo mentre si tiene la maniglia, cosi' il testo normale non si trascina per sbaglio. */
  function visDnD(p) {
    var drag = null, ind = null;
    function top(n) { while (n && n.parentNode !== p) n = n.parentNode; return n; }
    function clr() { if (ind) { ind.classList.remove('dnd-before', 'dnd-after'); ind = null; } }
    function end() { clr(); if (drag) drag.removeAttribute('draggable'); drag = null; }
    p.addEventListener('mousedown', function (e) { var h = e.target.closest && e.target.closest('.mddrag'), b = h && h.closest('.mdraw'); if (b) b.setAttribute('draggable', 'true'); });
    p.addEventListener('mouseup', function () { if (!drag) Array.prototype.forEach.call(p.querySelectorAll('.mdraw[draggable]'), function (b) { b.removeAttribute('draggable'); }); });
    p.addEventListener('dragstart', function (e) {
      var b = e.target.closest && e.target.closest('.mdraw'); if (!b || b.getAttribute('draggable') !== 'true') return;
      drag = b; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', ''); } catch (x) {}
    });
    p.addEventListener('dragover', function (e) {
      if (!drag) return; e.preventDefault(); var t = top(e.target); clr(); if (!t || t === drag) return;
      var r = t.getBoundingClientRect(); ind = t; ind.classList.add(e.clientY < r.top + r.height / 2 ? 'dnd-before' : 'dnd-after');
    });
    p.addEventListener('drop', function (e) {
      if (!drag) return; e.preventDefault(); var t = top(e.target);
      if (t && t !== drag) { var bf = e.clientY < t.getBoundingClientRect().top + t.offsetHeight / 2; p.insertBefore(drag, bf ? t : t.nextSibling); }
      end(); visSync();
    });
    p.addEventListener('dragend', end);
  }
  function visActive() { var p = $('mdPrev'); return p && p.style.display === 'block'; }
  function visOpen() {
    var t = $('body'), p = $('mdPrev'), b = $('mdPrevBtn'); if (!t || !p) return;
    p.innerHTML = window.mdRender(t.value) || '<p><br></p>';
    p.setAttribute('contenteditable', 'true'); p.setAttribute('spellcheck', 'true');
    if (!p._mdInit) { p._mdInit = 1; p.addEventListener('input', visSync); p.addEventListener('keydown', visKey); p.addEventListener('paste', visPaste); visDnD(p); }
    p.style.minHeight = Math.max(t.offsetHeight, 240) + 'px';
    t.style.display = 'none'; p.style.display = 'block';
    if (b) { b.textContent = 'Sorgente'; b.classList.add('primary'); }
  }
  window.mdPrev = function () {                                /* toggle Visuale <-> Sorgente */
    var t = $('body'), p = $('mdPrev'), b = $('mdPrevBtn'); if (!t || !p) return;
    if (!visActive()) { visOpen(); p.focus(); }
    else { visSync(); p.style.display = 'none'; t.style.display = ''; if (b) { b.textContent = 'Visuale'; b.classList.remove('primary'); } t.focus(); }
  };
  /* all'apertura dell'editor si parte in VISUALE (chiamata da A.edit / A.pgEdit dopo aver messo il DOM) */
  window.mdStart = function () { if ($('mdPrev') && $('body')) visOpen(); };
  /* i bottoni della toolbar, in modalita' visuale, agiscono sulla selezione */
  var origIns = window.mdIns;
  window.mdIns = function (a, b) {
    if (!visActive()) return origIns(a, b);
    var p = $('mdPrev'); p.focus();
    if (a === '**') document.execCommand('bold');
    else if (a === '*') document.execCommand('italic');
    else if (/## /.test(a)) document.execCommand('formatBlock', false, 'h2');
    else if (/- /.test(a)) document.execCommand('insertUnorderedList');
    else if (a === '[') { var u = prompt('Indirizzo del link:', 'https://'); if (u) document.execCommand('createLink', false, u); }
    else if (a === '![') { var src = prompt('URL immagine:', A.baseurl() + '/assets/img/'); if (src) document.execCommand('insertImage', false, src); }
    visSync();
  };
  /* mdMore: pulsante "Leggi tutto". Inserisce <!--more--> dove sta il cursore (in Visuale come blocco protetto, in Sorgente come testo).
     Nell'elenco del blog l'estratto e' tutto quello che sta PRIMA del marcatore. Ne basta uno per testo: se c'e' gia', avvisa invece di duplicarlo. */
  window.mdMore = function () {
    var t = $('body'); if (!t) return;
    if (visActive()) {
      var p = $('mdPrev'); visSync();
      if (/<!--more-->/.test(t.value)) { A.toast('Il taglio "Leggi tutto" e\' gia nel testo', true); return; }
      p.focus(); var s = window.getSelection();
      if (!s.rangeCount || !p.contains(s.anchorNode)) { var r = document.createRange(); r.selectNodeContents(p); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
      document.execCommand('insertHTML', false, window.mdRender('<!--more-->'));
      visSync();
    } else {
      if (/<!--more-->/.test(t.value)) { A.toast('Il taglio "Leggi tutto" e\' gia nel testo', true); return; }
      origIns('\n\n<!--more-->\n\n', '');
    }
  };
  /* mdImg: pulsante "Img". Apre il selettore foto (lo stesso di Immagine in evidenza: carica dal PC o scegli da assets/img) con i bottoni Sinistra/Centro/Destra e il testo alternativo.
     Inserisce {% include immagine.liquid src alt align %} dove sta il cursore (in Visuale come blocco protetto, come la Galleria; in Sorgente come testo). Il sito la disegna con _includes/immagine.liquid. */
  window.mdImg = function () {
    var p = $('mdPrev'), saved = null;
    if (p && visActive()) { var s0 = window.getSelection(); if (s0.rangeCount && p.contains(s0.anchorNode)) saved = s0.getRangeAt(0).cloneRange(); }
    A.imgPick(null, { align: true, onPick: function (path, o) {
      var alt = String(o.alt || '').replace(/["{}%]/g, '').replace(/\s+/g, ' ').trim();
      var raw = '{% include immagine.liquid src="' + path + '" alt="' + alt + '" align="' + o.align + '" %}';
      if (visActive()) {
        p.focus(); var s = window.getSelection(); s.removeAllRanges();
        if (saved) s.addRange(saved); else { var r = document.createRange(); r.selectNodeContents(p); r.collapse(false); s.addRange(r); }
        document.execCommand('insertHTML', false, window.mdRender(raw)); visSync();
      } else origIns('\n\n' + raw + '\n\n', '');
    } });
  };
  function toolbar() {
    return '<div class="tools">' +
      '<button class="btn sm" id="mdPrevBtn" onclick="mdPrev()">Sorgente</button>' +
      '<button class="btn sm" onclick="mdIns(\'**\',\'**\')"><b>B</b></button>' +
      '<button class="btn sm" onclick="mdIns(\'*\',\'*\')"><i>I</i></button>' +
      '<button class="btn sm" onclick="mdIns(\'\\n## \',\'\')">H2</button>' +
      '<button class="btn sm" onclick="mdIns(\'\\n- \',\'\')">Lista</button>' +
      '<button class="btn sm" onclick="mdIns(\'[\',\'](https://)\')">Link</button>' +
      '<button class="btn sm" onclick="mdImg()" title="Scegli o carica una foto e scegli la posizione">Img</button>' +
      '<button class="btn sm" onclick="mdGal()">Galleria</button>' +
      '<button class="btn sm" onclick="mdMore()" title="Nell\'elenco del blog l\'estratto finisce qui">Leggi tutto</button>' +
      '</div>';
  }
  function ymlList(fm) { return fm; }

  /* ---- Bacheca ---- */
  A.views.dash = function () {
    var dirs = [['_posts', 'Articoli', 'posts'], ['_pages', 'Pagine', 'pages'], ['_projects', 'Progetti', 'projects'], ['_news', 'News', 'news'], ['_servizi', 'Servizi', 'servizi']];
    return Promise.all(dirs.map(function (d) { return A.getDir(d[0]); })).then(function (r) {
      var h = '<h2>Bacheca</h2><div class="row">';
      dirs.forEach(function (d, i) {
        var n = Array.isArray(r[i]) ? r[i].filter(function (x) { return x.type === 'file'; }).length : 0;
        var dis = A.off && A.off[d[2]]; /* voce disattivata (admin.js > off): riquadro spento e non cliccabile */
        h += dis ? '<div class="card" style="opacity:.45;cursor:not-allowed" title="' + esc(dis) + '"><h3>' + n + '</h3>' + d[1] + ' <small>(disattivato)</small></div>'
          : '<div class="card" style="cursor:pointer" onclick="A.go(\'' + d[2] + '\')"><h3>' + n + '</h3>' + d[1] + '</div>';
      });
      h += '</div><div class="card">Ogni salvataggio fa un commit e il sito si aggiorna in 1-2 minuti (pallino in alto: verde = pubblicato).</div>';
      M().innerHTML = h;
    });
  };

  /* ---- vista generica collezione ---- */
  /* Paginazione delle liste (stile PrestaShop): righe per pagina scelte dal menu (5/10/20/50/100), ricordate nel browser (localStorage 'admin_pp').
     La lista legge SOLO i file della pagina mostrata (l'elenco nomi arriva intero da getDir, il contenuto no): meno richieste a GitHub. */
  var PP_OPT = [5, 10, 20, 50, 100];
  A.pgn = {}; A.LST = {}; A.flt = {}; /* LST = righe gia' lette per collezione, flt = filtri correnti (vedi ELENCHI sotto) */
  A.pp = function () { var n = 20; try { n = parseInt(localStorage.getItem('admin_pp'), 10) || 20; } catch (e) {} return PP_OPT.indexOf(n) >= 0 ? n : 20; };
  A.setPP = function (key, n) { try { localStorage.setItem('admin_pp', n); } catch (e) {} A.pgn = {}; if (A.LST[key]) A.lstRender(key); else A.go(key); };
  A.setPg = function (key, n) { A.pgn[key] = n; if (A.LST[key]) A.lstRender(key); else A.go(key); };
  A.pgBar = function (key, total, pg, pages, PP) {
    if (total <= PP_OPT[0]) return '';
    function btn(n, lab, dis, on) { return '<button class="btn sm' + (on ? ' primary' : '') + '"' + (dis ? ' disabled' : ' onclick="A.setPg(\'' + key + '\',' + n + ')"') + '>' + lab + '</button> '; }
    var b = btn(1, '&laquo;', pg === 1) + btn(pg - 1, '&lsaquo;', pg === 1), s = Math.max(1, pg - 2), e = Math.min(pages, pg + 2);
    for (var i = s; i <= e; i++) b += btn(i, i, false, i === pg);
    b += btn(pg + 1, '&rsaquo;', pg === pages) + btn(pages, '&raquo;', pg === pages);
    var sel = '<select onchange="A.setPP(\'' + key + '\',this.value)">' + PP_OPT.map(function (o) { return '<option' + (o === PP ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>';
    return '<div class="pgbar" style="display:flex;flex-wrap:wrap;gap:.6em;align-items:center;justify-content:space-between;margin:.6em 0"><small>' + ((pg - 1) * PP + 1) + '-' + Math.min(total, pg * PP) + ' di ' + total + '</small><span>' + b + '</span><span><small>Mostra</small> ' + sel + ' <small>per pagina</small></span></div>';
  };
  /* ---- NASCONDI / PUBBLICA (occhio) -------------------------------------------------------------
     Usa il flag NATIVO di Jekyll "published: false" nel front matter: con quello la pagina non viene nemmeno generata
     (niente URL, niente sitemap, niente elenchi, niente ricerca Ctrl+K, niente menu automatico). Verificato con una build
     su articolo, progetto, servizio e pagina. Il file resta nel repo: si lavora in tranquillita' e poi si pubblica.
     PUNTI CRITICI: (1) il flag e' "published" e NON "draft": le bozze _drafts/ di Jekyll sono un'altra cosa. (2) un link scritto
     a mano (voce di Menu, altro testo) verso una pagina nascosta da' 404: controllare il Menu. (3) lo stesso file puo' avere anche
     stella/casetta: tutte condividono la coda starBusy[nome], cosi' i commit sullo stesso file non vanno in conflitto (sha). */
  var EYE_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  function eyeSvg(off) {
    return EYE_SVG + (off ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>' : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>') + '</svg>';
  }
  A.eyeBtn = function (name, hidden, key) {
    return '<button class="btn sm eye' + (hidden ? ' off' : '') + '" data-n="' + esc(name) + '" data-k="' + key + '" title="' + (hidden ? 'Nascosto al pubblico: clic per pubblicare' : 'Visibile: clic per nascondere') + '" onclick="A.pub(\'' + A.jq(name) + '\',' + (hidden ? 'false' : 'true') + ',this,\'' + key + '\')">' + eyeSvg(hidden) + '</button>';
  };
  function paintEye(btn, hidden) {
    btn.className = 'btn sm eye' + (hidden ? ' off' : '');
    btn.title = hidden ? 'Nascosto al pubblico: clic per pubblicare' : 'Visibile: clic per nascondere';
    btn.innerHTML = eyeSvg(hidden);
    btn.setAttribute('onclick', 'A.pub(\'' + btn.getAttribute('data-n') + '\',' + (hidden ? 'false' : 'true') + ',this,\'' + btn.getAttribute('data-k') + '\')');
    if (btn.parentNode && btn.parentNode.classList) btn.parentNode.classList.toggle('hid', hidden);
  }
  var PUBDIR = { posts: '_posts/', projects: '_projects/', servizi: '_servizi/', news: '_news/', pages: '_pages/' };
  /* A.pub: REATTIVA come stella/casetta: l'occhio cambia subito, il commit parte in background, se fallisce torna com'era. */
  A.pub = function (name, hide, btn, key) {
    if (btn) paintEye(btn, hide);
    A.lstUpd(key, name, 'hid', hide);
    var prev = starBusy[name] || Promise.resolve();
    starBusy[name] = prev.then(function () {
      var p = PUBDIR[key] + name;
      return A.getFile(p).then(function (f) {
        var s = A.splitFM(f.text);
        if (!s.fm) throw new Error('Front matter non trovato in ' + name);
        var fm = hide ? A.fmSet(s.fm, 'published', 'false') : A.fmDel(s.fm, 'published');
        var nl = f.text.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
        var out = '---' + nl + fm.replace(/\r?\n+$/, '') + nl + '---' + nl + s.body;
        return A.putFile(p, out, f.sha, 'admin: ' + (hide ? 'nascosto ' : 'pubblicato ') + name);
      }).then(function () { A.toast(hide ? 'Nascosto al pubblico (aggiornamento in corso)' : 'Visibile (pubblicazione in corso)'); });
    }).catch(function (e) {
      if (btn) paintEye(btn, !hide);
      A.lstUpd(key, name, 'hid', !hide);
      A.toast('Non salvato: ' + A.errMsg(e), true);
    }).then(function () { if (A.afterPub) return A.afterPub(key); });
    return starBusy[name];
  };
  /* spunta "Nascondi al pubblico" nell'editor (articoli, progetti, servizi, news, pagine) + etichetta del pulsante Salva */
  A.saveLbl = function (hidden) { return hidden ? 'Salva (resta nascosto)' : 'Salva e pubblica'; };
  window.pubLbl = function (c) { Array.prototype.forEach.call(document.querySelectorAll('.svb'), function (b) { b.textContent = A.saveLbl(c); }); };
  A.hideBox = function (hidden, id) {
    return '<label style="display:flex;gap:8px;align-items:center;margin:16px 0 4px;font-weight:600;cursor:pointer"><input type="checkbox" id="' + (id || 'f__hidden') + '"' + (hidden ? ' checked' : '') + ' onchange="pubLbl(this.checked)" style="width:auto;margin:0"> Nascondi al pubblico (bozza)</label>' +
      '<small style="display:block;margin:0 0 14px;color:#787c82">Si salva ma non e\' visibile sul sito: sparisce da elenchi, menu, ricerca e Google. Togli la spunta per pubblicarlo.</small>';
  };
  /* ---- ELENCHI: RICERCA / FILTRI / ORDINE (Articoli, Progetti, Servizi, News) ----------------------------------------------
     Come WordPress: barra sopra l'elenco con ricerca, stato, categoria (solo Articoli) e ordine. L'elenco legge il contenuto di TUTTI i file
     con A.getFiles (UNA query GraphQL a blocchi di 100 + cache per sha: la prima apertura costa 1 richiesta, poi 0 per i file invariati) e
     tiene le righe in A.LST[chiave]. Ricerca, filtri, ordine e paginazione lavorano su quella copia: nessuna richiesta mentre scrivi.
     Occhio, stella e casetta aggiornano la copia con A.lstUpd (e la rimettono a posto se il salvataggio fallisce).
     PUNTI CRITICI: (1) mai tornare alla lettura per pagina con getFile in parallelo (punto 22 di CLAUDE.md). (2) i filtri restano in A.flt
     finche' la pagina e' aperta; "Azzera" li svuota. (3) l'elenco Pagine (admin-menu.js) ha un suo codice e per ora non usa questa barra.
     (4) dopo un toggle la riga resta sullo schermo anche se non rispetta piu' il filtro, fino al prossimo ridisegno: e' voluto. */
  var qT = 0;
  function fltOf(key) { return A.flt[key] || (A.flt[key] = { q: '', st: '', cat: '', so: '' }); }
  function lstFiltered(key) {
    var f = fltOf(key), q = (f.q || '').toLowerCase().trim(), so = f.so || (C[key].sortDesc ? 'name_desc' : 'name_asc');
    var out = (A.LST[key] || []).filter(function (r) {
      if (q && (r.name + ' ' + r.title + ' ' + r.cats.join(' ')).toLowerCase().indexOf(q) < 0) return false;
      if (f.st === 'vis' && r.hid) return false;
      if (f.st === 'hid' && !r.hid) return false;
      if (f.st === 'feat' && !r.feat) return false;
      if (f.st === 'home' && !r.home) return false;
      if (f.cat === '__none') { if (r.cats.length) return false; }
      else if (f.cat && r.cats.indexOf(f.cat) < 0) return false;
      return true;
    });
    out.sort(function (a, b) {
      if (so === 'title_asc') { var x = (a.title || a.name).toLowerCase(), y = (b.title || b.name).toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
      return so === 'name_desc' ? (a.name < b.name ? 1 : -1) : (a.name < b.name ? -1 : 1);
    });
    return out;
  }
  /* azioni di gruppo (admin-bulk.js): A.sel = righe spuntate per collezione; lstNames = nomi file dopo i filtri */
  A.sel = {};
  A.lstNames = function (key) { return lstFiltered(key).map(function (r) { return r.name; }); };
  A.fltQ = function (key, v) { clearTimeout(qT); qT = setTimeout(function () { fltOf(key).q = v; A.pgn[key] = 1; A.lstRender(key); }, 150); };
  A.fltSet = function (key, k, v) { fltOf(key)[k] = v; A.pgn[key] = 1; A.lstRender(key); };
  A.fltReset = function (key) { A.flt[key] = null; A.pgn[key] = 1; A.go(key); };
  A.lstUpd = function (key, name, field, val) {
    var L = A.LST[key]; if (!L) return;
    for (var i = 0; i < L.length; i++) if (L[i].name === name) { L[i][field] = val; break; }
    A.lstStat(key);
  };
  A.lstStat = function (key) {
    var el = document.getElementById('lst_stat_' + key); if (!el) return;
    var all = A.LST[key] || [], nh = 0; all.forEach(function (r) { if (r.hid) nh++; });
    el.textContent = lstFiltered(key).length + ' di ' + all.length + (nh ? ' \u00b7 ' + nh + ' nascosti' : '');
  };
  function lstRow(key, r) {
    var isSrv = key === 'servizi' || key === 'projects', n = esc(r.name);
    var home = isSrv ? '<button class="btn sm home' + (r.home ? ' on' : '') + '" data-n="' + n + '" data-k="' + key + '" title="' + (r.home ? 'In home page: clic per togliere' : 'Mostra in home page') + '" onclick="A.inHome(\'' + n + '\',' + (r.home ? 'false' : 'true') + ',this,\'' + key + '\')">&#127968;</button>' : '';
    var star = key === 'posts' ? '<button class="btn sm star' + (r.feat ? ' on' : '') + '" data-n="' + n + '" title="' + (r.feat ? 'In evidenza: clic per togliere' : 'Metti in evidenza (in alto nel blog)') + '" onclick="A.feature(\'' + n + '\',' + (r.feat ? 'false' : 'true') + ',this)">' + (r.feat ? '&#9733;' : '&#9734;') + '</button>' : '';
    var catB = key === 'posts' ? '<em style="font-style:normal;font-size:.8em;white-space:nowrap;margin:0 .6em;padding:1px 9px;border-radius:10px;background:rgba(127,127,127,.18);' + (r.cats.length ? '' : 'opacity:.55;') + '" title="Categoria (la prima decide l\'URL)">' + (r.cats.length ? esc(r.cats.join(', ')) : 'senza categoria') + '</em>' : '';
    var eye = (key === 'posts' || key === 'projects' || key === 'servizi') ? A.eyeBtn(r.name, !!r.hid, key) : '';
    /* la casella esiste solo se admin-bulk.js e' caricato (A.bulkBar): se quel file manca o da' errore l'elenco funziona come prima. Il nome file e' l'identita' della riga (A.sel[key][nome]). */
    var chk = A.bulkBar ? '<input type="checkbox" style="width:auto;margin:0 8px 0 0;flex:none" title="Seleziona"' + ((A.sel[key] || {})[r.name] ? ' checked' : '') + ' onchange="A.selTog(\'' + key + '\',\'' + n + '\',this.checked)">' : '';
    return '<div class="it' + (r.hid ? ' hid' : '') + '">' + chk + eye + star + home + '<span>' + esc(r.name) + (r.title ? '<small>' + esc(r.title) + '</small>' : '') + '</span>' + catB +
      '<button class="btn sm" onclick="A.edit(\'' + key + '\',\'' + n + '\')">Modifica</button>' +
      '<button class="btn sm danger" onclick="A.del(\'' + key + '\',\'' + n + '\')">Elimina</button></div>';
  }
  A.lstRender = function (key) {
    var box = document.getElementById('lst_' + key); if (!box) return;
    var all = A.LST[key] || [], rows = lstFiltered(key), total = rows.length, PP = A.pp(), pages = Math.max(1, Math.ceil(total / PP)), pg = Math.min(A.pgn[key] || 1, pages), h = '';
    A.pgn[key] = pg;
    if (!all.length) h += 'Nessun elemento.'; else if (!total) h += 'Nessun risultato per questi filtri.';
    h += A.pgBar(key, total, pg, pages, PP);
    rows.slice((pg - 1) * PP, pg * PP).forEach(function (r) { h += lstRow(key, r); });
    box.innerHTML = h + A.pgBar(key, total, pg, pages, PP);
    A.lstStat(key);
    /* la barra di gruppo si ridisegna a ogni render (filtri, pagina) cosi' 'Seleziona tutti' e il contatore restano coerenti con le righe visibili */
    var bb = document.getElementById('bulk_' + key); if (bb && A.bulkBar) bb.innerHTML = A.bulkBar(key);
  };
  function lstBar(key) {
    var f = fltOf(key), L = A.LST[key] || [], so = f.so || (C[key].sortDesc ? 'name_desc' : 'name_asc'), recent = !!C[key].sortDesc;
    function opt(v, lab, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(lab) + '</option>'; }
    function sel(k, opts) { return '<select style="width:auto;max-width:100%" onchange="A.fltSet(\'' + key + '\',\'' + k + '\',this.value)">' + opts + '</select>'; }
    var h = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px">' +
      '<input type="search" value="' + esc(f.q) + '" placeholder="Cerca per titolo, nome file o categoria" oninput="A.fltQ(\'' + key + '\',this.value)" style="flex:1 1 220px;width:auto;min-width:180px">';
    if (key === 'posts' || key === 'projects' || key === 'servizi') {
      h += sel('st', opt('', 'Tutti', f.st) + opt('vis', 'Visibili', f.st) + opt('hid', 'Nascosti', f.st) + (key === 'posts' ? opt('feat', 'In evidenza', f.st) : opt('home', 'In home', f.st)));
    }
    if (key === 'posts') {
      var cc = {}, none = 0;
      L.forEach(function (r) { if (!r.cats.length) none++; r.cats.forEach(function (c) { cc[c] = (cc[c] || 0) + 1; }); });
      h += sel('cat', opt('', 'Tutte le categorie', f.cat) + Object.keys(cc).sort().map(function (c) { return opt(c, c + ' (' + cc[c] + ')', f.cat); }).join('') + (none ? opt('__none', 'Senza categoria (' + none + ')', f.cat) : ''));
    }
    h += sel('so', opt('name_asc', recent ? 'Pi\u00f9 vecchi' : 'Nome A-Z', so) + opt('name_desc', recent ? 'Pi\u00f9 recenti' : 'Nome Z-A', so) + opt('title_asc', 'Titolo A-Z', so));
    return h + '<button class="btn sm" onclick="A.fltReset(\'' + key + '\')">Azzera</button><small id="lst_stat_' + key + '" style="color:#787c82"></small></div>';
  }
  function collection(cfg) {
    A.views[cfg.key] = function () {
      return A.getDir(cfg.dir).then(function (files) {
        files = files.filter(function (f) { return f.type === 'file' && /\.md$/.test(f.name); });
        return A.getFiles(cfg.dir, files).then(function (rs) {
          A.LST[cfg.key] = files.map(function (f, ix) {
            var r = rs[ix], fm0 = r ? (A.splitFM(r.text).fm || '') : '';
            return {
              name: f.name,
              title: (A.fmGet(fm0, 'title') || '').replace(/^["']|["']$/g, ''),
              cats: (A.fmGet(fm0, 'categories') || A.fmGet(fm0, 'category') || '').replace(/[\[\]"']/g, '').split(/[ ,]+/).filter(Boolean),
              hid: /^published:[ \t]*false\b/m.test(fm0), home: /^in_home:[ \t]*true\b/m.test(fm0), feat: /^featured:[ \t]*true\b/m.test(fm0)
            };
          });
          M().innerHTML = '<h2>' + cfg.label + ' <button class="btn primary sm" onclick="A.edit(\'' + cfg.key + '\')">+ Nuovo</button></h2><div class="card list">' + lstBar(cfg.key) + '<div id="bulk_' + cfg.key + '"></div><div id="lst_' + cfg.key + '"></div></div>';
          A.lstRender(cfg.key);
        });
      });
    };
  }
  var C = {
    posts: { key: 'posts', dir: '_posts', label: 'Articoli', sortDesc: true },
    projects: { key: 'projects', dir: '_projects', label: 'Progetti' },
    news: { key: 'news', dir: '_news', label: 'News', sortDesc: true },
    /* SERVIZI: collection indipendente dal blog (_servizi/, URL /servizi/<nome-file>/). Nessuna data, nessuna categoria. */
    servizi: { key: 'servizi', dir: '_servizi', label: 'Servizi' }
  };
  Object.keys(C).forEach(function (k) { collection(C[k]); });

  /* campi per collezione: [nome, etichetta, tipo] - 'cat' = dropdown categorie, 'date' = selettore data+ora nativo */
  /* SEO: due campi opzionali in fondo a ogni editor. Vuoti = la riga sparisce dal front matter
     (A.save() usa fmDel su valore vuoto) e il sito applica il fallback automatico definito in
     _includes/metadata.liquid (title = titolo pagina | sito; description = estratto del testo).
     Si chiamano seo_title/seo_description e NON "description" perche' in al-folio "description" e'
     anche il sottotitolo visibile nella pagina. Vedi admin/claude.md sez. 0d. */
  var SEO = [['seo_title', 'SEO Title (vuoto = usa il titolo)', 'text'], ['seo_description', 'SEO Description (vuoto = estratto automatico del testo)', 'text']];
  /* IMMAGINE IN EVIDENZA (solo articoli): 'thumbnail' e 'thumbnail_alt' sono letti da _pages/blog.md (elenco blog e articoli in evidenza).
     Vuoti = la riga sparisce (A.save usa fmDel) e il blog non mostra l'immagine; alt vuoto = il blog usa il titolo. Il percorso e' relativo al sito (relative_url nel template). */
  var FIELDS = {
    posts: [['title', 'Titolo', 'text'], ['slug', 'Indirizzo (slug)', 'slug'], ['date', 'Data', 'date'], ['description', 'Descrizione', 'text'], ['thumbnail', 'Immagine in evidenza', 'img'], ['thumbnail_alt', 'Testo alternativo immagine (vuoto = usa il titolo)', 'text'], ['thumbnail_hide', 'Non visualizzarla nell\'articolo', 'chk'], ['thumbnail_hd', 'Usa l\'originale in alta definizione nell\'articolo (piu\' pesante, quasi mai serve)', 'chk'], ['tags', 'Tag (separati da spazio)', 'text'], ['categories', 'Categoria', 'cat']].concat(SEO),
    projects: [['title', 'Titolo', 'text'], ['slug', 'Indirizzo (slug)', 'slug'], ['description', 'Descrizione', 'text'], ['img', 'Immagine', 'img'], ['importance', 'Ordine (numero)', 'text'], ['category', 'Categoria (deve stare in display_categories di projects)', 'cat'], ['redirect', 'Redirect esterno (opzionale)', 'text']].concat(SEO),
    /* gruppo/sottotitolo/ordine: pagina /servizi/ DINAMICA (_pages/servizi.md + _includes/servizi_tabella.liquid). 'gruppo' = sezione, scelta dall'elenco di _data/servizi_gruppi.yml
       (tipo 'grp', vedi grpField e loadCats); vuoto = finisce in "Altri servizi". 'ordine' = numero (scritto SENZA virgolette, vedi A.save: quotato diventerebbe testo e l'ordinamento Liquid sbaglierebbe). */
    servizi: [['title', 'Titolo', 'text'], ['slug', 'Indirizzo (slug)', 'slug'], ['description', 'Descrizione (breve: compare anche nella card in home)', 'text'], ['gruppo', 'Sezione nella pagina Servizi', 'grp'], ['sottotitolo', 'Riga sotto il titolo nella pagina Servizi (opzionale)', 'text'], ['ordine', 'Posizione nella sezione (numero, opzionale: vuoto = in fondo, in ordine alfabetico)', 'text']].concat(SEO),
    news: [['title', 'Titolo (solo se non inline)', 'text'], ['date', 'Data', 'date'], ['inline', 'Inline (true = solo riga in home)', 'text']].concat(SEO)
  };
  var LAYOUT = { posts: 'post', projects: 'page', news: 'post', servizi: 'servizio' };
  /* campi mostrati SOTTO il Corpo nell'editor (vedi A.edit). Ordine = ordine in FIELDS. */
  var BELOW = ['tags', 'seo_title', 'seo_description'];
  var cur = {};

  /* parse "YYYY-MM-DD HH:MM:SS[ +ZZZZ]" -> {d:'YYYY-MM-DD', t:'HH:MM', tz:'+ZZZZ'|''}
     Perche' due input nativi (date + time) e non un campo testo: Jekyll legge "date:" come un vero
     oggetto Time solo se il valore e' un timestamp YAML valido; un valore malformato (es. una data
     scritta a mano con un refuso) viene letto come stringa e il post puo' sparire da blog/home
     senza alcun errore in build. Con <input type=date>/<input type=time> il browser garantisce
     il formato, quindi il valore scritto e' sempre valido (vedi commento su fmGet/fmSet in
     admin.js e save() sotto).
     Il fuso (tz) non e' modificabile da UI: se la data esistente lo contiene (es. "+0200") viene
     conservato in un campo hidden e riscritto identico al salvataggio, per non alterare l'orario
     di un post gia' pubblicato. Secondi sempre azzerati (":00"): l'input time lavora al minuto. */
  function parseDate(v) {
    var m = (v || '').match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?\s*([+-]\d{4})?/);
    if (!m) return { d: '', t: '', tz: '' };
    return { d: m[1], t: m[2], tz: m[3] || '' };
  }
  function dateField(fd, v) {
    var id = 'f_' + fd[0], p = parseDate(v);
    return '<label>' + fd[1] + '</label><div class="row"><input type="date" id="' + id + '_d" value="' + esc(p.d) + '">' +
      '<input type="time" id="' + id + '_t" value="' + esc(p.t) + '" step="60"></div>' +
      '<input type="hidden" id="' + id + '_tz" value="' + esc(p.tz) + '">';
  }

  /* legge tutte le categorie gia' usate in una collezione (per il dropdown)
     Costo: 1 chiamata API per OGNI file della cartella (N post = N+1 richieste GitHub) ogni volta
     che si apre l'editor. Va bene per un blog piccolo; il rate limit per token autenticato e' di
     5000 richieste/ora, ma con centinaia di post l'apertura dell'editor diventa lenta. Se serve
     scalare, cachare il risultato per la sessione.
     Il campo e' 'categories' per i post e 'category' (singolare) per i progetti: sono due campi
     diversi in al-folio. Split per spazi: Jekyll tratta "categories: a b" come lista ["a","b"]
     (vedi commento su categories/tags in admin.js), quindi una categoria con spazio nel nome NON
     e' rappresentabile in questa forma. */
  function loadCats(key) {
    /* SERVIZI: niente categorie, ma l'elenco delle SEZIONI di /servizi/ (righe "- nome" di _data/servizi_gruppi.yml) per la tendina 'gruppo'.
       Se il file manca o non si legge, tendina vuota: il servizio resta valido e finisce in "Altri servizi". */
    if (key === 'servizi') return Promise.resolve().then(function () { return A.getFile('_data/servizi_gruppi.yml'); }).then(function (f) {
      var out = [];
      ((f && f.text) || '').split(/\r?\n/).forEach(function (r) { var m = r.match(/^\s*-\s+(.+?)\s*$/); if (m) out.push(m[1].replace(/^["']|["']$/g, '')); });
      return out;
    }).catch(function () { return []; });
    var field = key === 'projects' ? 'category' : 'categories';
    return A.getDir(C[key].dir).then(function (files) {
      files = files.filter(function (f) { return f.type === 'file' && /\.md$/.test(f.name); });
      return A.getFiles(C[key].dir, files); /* una query GraphQL + cache per sha invece di N richieste a ogni apertura dell'editor */
    }).then(function (fs) {
      var set = {};
      fs.forEach(function (f) {
        if (!f) return;
        var v = A.fmGet(A.splitFM(f.text).fm, field);
        v.split(/\s+/).forEach(function (c) { c = c.trim(); if (c) set[c] = 1; });
      });
      /* 'senza-categoria' e' la categoria predefinita dei NUOVI articoli (vedi A.edit): sta sempre
         nel dropdown, anche se nessun post la usa ancora. Solo per i post, non per i progetti. */
      if (key === 'posts') set['senza-categoria'] = 1;
      return Object.keys(set).sort();
    });
  }

  /* imgField: campo immagine stile WordPress. L'input e' NASCOSTO ma ha lo stesso id 'f_<nome>' dei campi di testo, quindi A.save lo legge senza modifiche.
     Il selettore (A.imgPick) e l'anteprima stanno in admin-media.js. Vuoto = nessuna immagine (la riga sparisce dal front matter). */
  function imgField(fd, v) {
    var id = 'f_' + fd[0];
    return '<label>' + fd[1] + '</label><div id="' + id + '_pv">' + (v ? '<img src="' + esc(A.rawUrl(v)) + '" style="max-width:240px;max-height:150px;border-radius:4px;border:1px solid #a7aaad;display:block;margin:6px 0"><small>' + esc(v) + '</small>' : '<small>Nessuna immagine impostata</small>') + '</div>' +
      '<input type="hidden" id="' + id + '" value="' + esc(v) + '"><p><button type="button" class="btn" onclick="A.imgPick(\'' + id + '\')">Scegli o carica immagine</button> <button type="button" class="btn danger" onclick="A.imgClr(\'' + id + '\')">Rimuovi</button></p>';
  }
  function catField(fd, v) {
    var id = 'f_' + fd[0];
    var h = '<label>' + fd[1] + '</label><select id="' + id + '" onchange="if(this.value===\'__new__\'){this.style.display=\'none\';this.nextElementSibling.style.display=\'block\';this.nextElementSibling.focus();}">';
    h += '<option value="">-- nessuna --</option>';
    (cur.cats || []).forEach(function (c) { h += '<option value="' + esc(c) + '"' + (c === v ? ' selected' : '') + '>' + esc(c) + '</option>'; });
    var known = (cur.cats || []).indexOf(v) >= 0 || v === '';
    h += '<option value="__new__">+ nuova categoria...</option></select>';
    h += '<input id="' + id + '_new" placeholder="Nuova categoria" style="display:' + (known ? 'none' : 'block') + '" value="' + (known ? '' : esc(v)) + '">';
    return h;
  }

  /* grpField: tendina delle sezioni di /servizi/ (elenco da loadCats). Stesso id 'f_gruppo' dei campi di testo, quindi A.save lo legge senza codice dedicato.
     Un valore gia' salvato ma non piu' in elenco (sezione rinominata) resta selezionabile: non si perde in silenzio. */
  function grpField(fd, v) {
    var id = 'f_' + fd[0], list = (cur.cats || []).slice();
    if (v && list.indexOf(v) < 0) list.push(v);
    var h = '<label>' + fd[1] + '</label><select id="' + id + '"><option value="">-- nessuna (finisce in "Altri servizi") --</option>';
    list.forEach(function (c) { h += '<option value="' + esc(c) + '"' + (c === v ? ' selected' : '') + '>' + esc(c) + '</option>'; });
    return h + '</select>';
  }

  A.edit = function (key, name) {
    var p = name ? Promise.resolve(A.getFile(C[key].dir + '/' + name)) : Promise.resolve(null);
    Promise.all([p, loadCats(key)]).then(function (r) {
      var f = r[0]; cur = { key: key, name: name || '', sha: f ? f.sha : '', fm: f ? A.splitFM(f.text).fm : '', cats: r[1] };
      var body = f ? A.splitFM(f.text).body : '';
      var hidn = !!f && /^published:[ \t]*false\b/m.test(cur.fm);
      var h = '<h2>' + (name ? 'Modifica ' + esc(name) : 'Nuovo in ' + C[key].label) + '</h2><div class="card">';
      /* ORDINE nell'editor: i campi normali stanno SOPRA il Corpo, quelli in BELOW ('tags' + i due SEO)
         stanno SOTTO, nell'ordine di FIELDS. Solo l'ordine visivo: save() legge ogni campo per id
         ("f_<nome>"), quindi non dipende dalla posizione. Se aggiungi un campo da mettere sotto il
         Corpo, aggiungilo a BELOW. */
      var top = '', below = '';
      FIELDS[key].forEach(function (fd) {
        var v = f ? A.fmGet(cur.fm, fd[0]) : '';
        /* data iniziale di un nuovo elemento: A.now() = ora GitHub nel fuso del sito, SENZA offset.
           Prima le news aggiungevano ' +0000': con "timezone: Europe/Rome" in config avrebbe spostato
           l'ora di 1-2 ore. Regola unica per tutte le collezioni (sez. 0c/0e claude.md). */
        if (!f && fd[0] === 'date') v = A.now();
        if (!f && fd[0] === 'inline') v = 'true';
        if (!f && fd[0] === 'importance') v = '1';
        if (!f && key === 'posts' && fd[0] === 'categories') v = 'senza-categoria'; /* default nuovi articoli */
        var one;
        if (fd[2] === 'slug') one = '<label>' + fd[1] + '</label><input id="f_slug" value="' + esc(f ? (String(v).replace(/^["']|["']$/g, '') || name.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')) : '') + '" placeholder="automatico dal titolo"><small style="display:block;color:#666;margin-top:2px">Se lo cambi, il vecchio indirizzo porta in automatico al nuovo (redirect).</small>';
        else if (fd[2] === 'cat') one = catField(fd, v);
        else if (fd[2] === 'grp') one = grpField(fd, v);
        else if (fd[2] === 'date') one = dateField(fd, v);
        else if (fd[2] === 'img') one = imgField(fd, v);
        else if (fd[2] === 'chk') one = '<label style="display:flex;gap:8px;align-items:center;margin:4px 0 14px;font-weight:600;cursor:pointer"><input type="checkbox" id="f_' + fd[0] + '"' + (/^["\']?true["\']?$/i.test(String(v).trim()) ? ' checked' : '') + ' style="width:auto;margin:0"> ' + fd[1] + '</label><small style="display:block;margin:-10px 0 14px;color:#787c82">Di default l\'immagine in evidenza compare anche in cima all\'articolo. Con la spunta resta solo nell\'elenco del blog.</small>';
        else one = '<label>' + fd[1] + '</label><input id="f_' + fd[0] + '" value="' + esc(v) + '">';
        if (BELOW.indexOf(fd[0]) >= 0) below += one; else top += one;
      });
      h += top + '<label>Corpo (Markdown)</label>' + toolbar() + '<textarea id="body">' + esc(body) + '</textarea><div id="mdPrev" class="mdprev" style="display:none"></div>' + below +
        A.hideBox(hidn) + '<p><button class="btn primary svb" onclick="A.save()">' + A.saveLbl(hidn) + '</button><button class="btn" onclick="A.go(\'' + key + '\')">Annulla</button></p></div>';
      M().innerHTML = h;
      window.mdStart();
    }).catch(function (e) { A.toast(A.errMsg(e), true); });
  };

  /* A.save: scrive il front matter di articolo/progetto/news. PUNTI CRITICI: (1) 'date', 'inline', 'importance' vanno con fmSet DIRETTO, mai yq: devono restare timestamp/booleano/numero (sez. 0c). (2) valore vuoto = riga rimossa con fmDel, cosi' il sito usa il fallback (SEO, sez. 0d). (3) il nome file di un NUOVO post e' 'data-slug.md' con la data del campo Data: se la data e' nel futuro senza 'future: true' il post non esce (sez. 0c). (4) i campi si leggono per id 'f_<nome>': cambiare l'ordine visivo (BELOW) non tocca il salvataggio. (5) i post ricevono sempre 'toc: beginning: true' cosi' Jekyll (jekyll-toc del tema al-folio) genera l'indice cliccabile in automatico dai titoli ##/### del corpo, senza doverlo scrivere a mano - NON usare il layout 'distill' con 'toc:' a elenco manuale, richiede authors/affiliations e la lista deve combaciare coi titoli. [FONTE: naming file post, al-folio docs/CUSTOMIZE.md] */
  A.save = A.wrap(function () {
    var key = cur.key, fm = cur.fm || 'layout: ' + LAYOUT[key], name = cur.name;
    fm = A.fmSet(fm, 'layout', LAYOUT[key]);
    FIELDS[key].forEach(function (fd) {
      var k = fd[0], v; if (fd[2] === 'slug') return; /* lo slug si gestisce dopo il ciclo (vedi sotto) */
      if (fd[2] === 'cat') {
        var sel = $('f_' + k).value;
        v = (sel === '__new__' ? $('f_' + k + '_new').value : sel).trim();
      } else if (fd[2] === 'date') {
        var d = $('f_' + k + '_d').value, t = $('f_' + k + '_t').value || '00:00', tz = $('f_' + k + '_tz').value;
        v = d ? d + ' ' + t + ':00' + (tz ? ' ' + tz : '') : '';
      } else if (fd[2] === 'chk') {
        v = $('f_' + k).checked ? 'true' : ''; /* casella: spuntata = true (booleano), non spuntata = riga rimossa */
      } else v = $('f_' + k).value.trim();
      if (k === 'ordine') v = v.replace(/\D/g, ''); /* servizi: solo cifre; vuoto = la riga sparisce e il servizio va in fondo alla sua sezione */
      if (v === '') { if (k !== 'title' || key !== 'news') fm = k === 'img' ? A.fmSet(fm, k, '') : A.fmDel(fm, k); else fm = A.fmDel(fm, k); return; }
      /* inline/importance/date vanno scritti SENZA virgolette (fmSet diretto, non yq()):
         "inline: true" deve restare booleano, "importance: 2" numero, "date: 2026-09-20 14:47:00"
         un timestamp YAML che Jekyll legge come Time. Quotarli li trasformerebbe in stringhe. */
      if (k === 'inline' || k === 'importance' || k === 'date' || k === 'ordine' || k === 'thumbnail_hide' || k === 'thumbnail_hd') fm = A.fmSet(fm, k, v);
      else fm = A.fmSet(fm, k, A.yq(v));
    });
    var hc = $('f__hidden'), hid = !!(hc && hc.checked); /* nascosto = published: false (vedi A.pub) */
    if (hc) fm = hid ? A.fmSet(fm, 'published', 'false') : A.fmDel(fm, 'published');
    if (key === 'news' && !/^related_posts:/m.test(fm)) fm = A.fmSet(fm, 'related_posts', 'false');
    if (key === 'posts' && !/^toc:/m.test(fm)) fm = fm.replace(/\n*$/, '') + '\ntoc:\n  beginning: true';
    if (!name) {
      var t = $('f_title').value.trim();
      if (key === 'posts') { if (!t) return A.toast('Titolo obbligatorio', true); name = $('f_date_d').value + '-' + A.slugify(t) + '.md'; }
      else if (key === 'projects' || key === 'servizi') { if (!t) return A.toast('Titolo obbligatorio', true); name = A.slugify(t) + '.md'; }
      else { return A.getDir('_news').then(function (l) { var n = 1; l.forEach(function (x) { var m = x.name.match(/announcement_(\d+)/); if (m) n = Math.max(n, +m[1] + 1); }); doPut('announcement_' + n + '.md'); }); }
    }
    /* INDIRIZZO (slug). Il nome file NON cambia (cronologia git e collegamenti restano): l'URL segue 'slug:' del front matter
       (il plugin permalink_da_categoria e Jekyll lo usano al posto del nome file). Quando lo slug cambia il vecchio finisce in
       'slug_precedenti: [a, b]' e il plugin genera una pagina-redirect per ognuno (non 301 vero: GitHub Pages non lo permette,
       e' meta refresh + canonical). Se lo slug torna uguale al nome file, 'slug:' sparisce. Doppioni: si controlla il nome file degli altri. */
    var effSl = '', slugCh = false, si = $('f_slug');
    if (si) {
      var fileSl = (cur.name || '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
      if (cur.name) {
        var oldSl = (A.fmGet(cur.fm, 'slug') || '').replace(/^["']|["']$/g, '') || fileSl;
        var ns = A.slugify(si.value.trim()) || oldSl;
        var prev = (A.fmGet(cur.fm, 'slug_precedenti') || '').replace(/[\[\]"']/g, '').split(/[ ,]+/).filter(Boolean);
        if (ns !== oldSl && prev.indexOf(oldSl) < 0) prev.push(oldSl);
        prev = prev.filter(function (x) { return x !== ns; });
        fm = ns === fileSl ? A.fmDel(fm, 'slug') : A.fmSet(fm, 'slug', ns);
        fm = prev.length ? A.fmSet(fm, 'slug_precedenti', '[' + prev.join(', ') + ']') : A.fmDel(fm, 'slug_precedenti');
        effSl = ns; slugCh = ns !== oldSl;
      } else {
        var ns2 = A.slugify(si.value.trim()), tt = A.slugify(($('f_title') || { value: '' }).value.trim());
        if (ns2 && ns2 !== tt) { fm = A.fmSet(fm, 'slug', ns2); effSl = ns2; }
      }
    }
    if (slugCh) return A.getDir(C[key].dir).then(function (l) {
      var clash = (l || []).some(function (x) { return x.name !== name && x.name.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '') === effSl; });
      if (clash) return A.toast('Indirizzo gia\' usato da un altro elemento: scegline un altro', true);
      return doPut(name);
    });
    return doPut(name);
    function doPut(nm) {
      var txt = '---\n' + fm.replace(/\n+$/, '') + '\n---\n\n' + $('body').value.replace(/^\n+/, '');
      /* Messaggio commit = nome della run in Actions. Per i post usa l'URL reale (/blog/<categoria>/<articolo>/, come il plugin permalink_da_categoria), non il nome file con la data. */
      var lbl = nm;
      if (key === 'posts') {
        var c0 = (A.fmGet(fm, 'categories') || A.fmGet(fm, 'category')).replace(/[\[\]]/g, '').split(/[ ,]+/).filter(Boolean)[0];
        var cs = c0 ? A.slugify(c0) : '', sl = (effSl || nm.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')) + '/';
        /* SPECCHIO a mano di permalink_per_categoria (_config.yml) e di repos.json > sito.permalink_servizio: i servizi stanno in /servizi/ (senza /blog/).
           Serve SOLO per il nome della run in Actions: l'URL vero lo calcola il plugin Jekyll. Se aggiungi/cambi una regola nel config, aggiorna anche questa riga. */
        lbl = '/blog/' + (cs ? cs + '/' : '') + sl;
      } else if (key === 'servizi') {
        /* SPECCHIO a mano del permalink della collection 'servizi' in _config.yml (e di repos.json > sito.permalink_servizio). Serve solo per il nome della run in Actions. */
        lbl = '/servizi/' + (effSl || nm.replace(/\.md$/, '')) + '/';
      }
      return A.putFile(C[key].dir + '/' + nm, txt, cur.sha, 'admin: ' + (cur.sha ? 'aggiorna ' : 'crea ') + lbl).then(function () {
        A.toast(hid ? 'Salvato (nascosto: non visibile al pubblico)' : 'Salvato: pubblicazione in corso'); A.go(key);
      });
    }
  });

  /* A.feature: stella nella lista articoli. Aggiunge/toglie SOLO la riga "featured: true" nel front matter (fmSet/fmDel, il resto del file resta identico). Il blog (_pages/blog.md) mostra in alto i post con featured: true.
     REATTIVA (ottimistica): la stella cambia subito nel DOM, il commit parte in background e la lista NON viene ricaricata (niente 45 letture). Se il commit fallisce la stella torna com'era + avviso.
     Lock PER RIGA (starBusy), non il busy globale di A.wrap: cosi' puoi cliccare stelle di articoli diversi in fila; due clic sullo stesso articolo si accodano (lo sha del file cambia a ogni commit, senza coda darebbe conflitto 409). */
  var starBusy = {};
  function paintStar(btn, on) {
    btn.className = 'btn sm star' + (on ? ' on' : '');
    btn.innerHTML = on ? '&#9733;' : '&#9734;';
    btn.title = on ? 'In evidenza: clic per togliere' : 'Metti in evidenza (in alto nel blog)';
    btn.setAttribute('onclick', 'A.feature(\'' + btn.getAttribute('data-n') + '\',' + (on ? 'false' : 'true') + ',this)');
  }
  A.feature = function (name, on, btn) {
    if (btn) paintStar(btn, on);
    A.lstUpd('posts', name, 'feat', on);
    var prev = starBusy[name] || Promise.resolve();
    starBusy[name] = prev.then(function () {
      var p = '_posts/' + name;
      return A.getFile(p).then(function (f) {
        var s = A.splitFM(f.text);
        if (!s.fm) throw new Error('Front matter non trovato in ' + name);
        var fm = on ? A.fmSet(s.fm, 'featured', 'true') : A.fmDel(s.fm, 'featured');
        var nl = f.text.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
        var out = '---' + nl + fm.replace(/\r?\n+$/, '') + nl + '---' + nl + s.body;
        return A.putFile(p, out, f.sha, 'admin: ' + (on ? 'in evidenza ' : 'tolto da evidenza ') + name);
      }).then(function () { A.toast(on ? 'In evidenza (pubblicazione in corso)' : 'Tolto da evidenza (pubblicazione in corso)'); });
    }).catch(function (e) {
      if (btn) paintStar(btn, !on); // rollback visivo
      A.lstUpd('posts', name, 'feat', !on);
      A.toast('Stella non salvata: ' + A.errMsg(e), true);
    });
    return starBusy[name];
  };
  /* A.inHome: casetta "mostra in home" su SERVIZI (post con categoria servizi, lista Articoli) e su PROGETTI (lista Progetti). Aggiunge/toglie SOLO la riga "in_home: true" nel front matter.
     La home (_pages/home.md, box "I nostri servizi") mostra in modo DINAMICO i servizi con in_home: true.
     CAMPO SEPARATO dalla stella (featured = blog): non si mescolano mai. Sui servizi la stella non c'e', sugli altri articoli non c'e' la casetta.
     Stessa logica ottimistica e stessa coda per file (starBusy) di A.feature: stella e casetta sullo stesso file si accodano (lo sha cambia a ogni commit). */
  function paintHome(btn, on) {
    btn.className = 'btn sm home' + (on ? ' on' : '');
    btn.title = on ? 'In home page: clic per togliere' : 'Mostra in home page';
    btn.setAttribute('onclick', 'A.inHome(\'' + btn.getAttribute('data-n') + '\',' + (on ? 'false' : 'true') + ',this,\'' + btn.getAttribute('data-k') + '\')');
  }
  A.inHome = function (name, on, btn, key) {
    if (btn) paintHome(btn, on);
    A.lstUpd(key, name, 'home', on);
    var prev = starBusy[name] || Promise.resolve();
    starBusy[name] = prev.then(function () {
      var p = (key === 'projects' ? '_projects/' : key === 'servizi' ? '_servizi/' : '_posts/') + name;
      return A.getFile(p).then(function (f) {
        var s = A.splitFM(f.text);
        if (!s.fm) throw new Error('Front matter non trovato in ' + name);
        var fm = on ? A.fmSet(s.fm, 'in_home', 'true') : A.fmDel(s.fm, 'in_home');
        var nl = f.text.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
        var out = '---' + nl + fm.replace(/\r?\n+$/, '') + nl + '---' + nl + s.body;
        return A.putFile(p, out, f.sha, 'admin: ' + (on ? 'in home ' : 'tolto dalla home ') + name);
      }).then(function () { A.toast(on ? 'In home (pubblicazione in corso)' : 'Tolto dalla home (pubblicazione in corso)'); });
    }).catch(function (e) {
      if (btn) paintHome(btn, !on); // rollback visivo
      A.lstUpd(key, name, 'home', !on);
      A.toast('Casetta non salvata: ' + A.errMsg(e), true);
    });
    return starBusy[name];
  };
  /* A.del: "Elimina" = sposta nel cestino (admin-cestino.js), non cancella: si ripristina da admin > Cestino. */
  A.del = A.wrap(function (key, name) {
    if (!confirm('Spostare ' + name + ' nel cestino?')) return;
    return A.toTrash([{ dir: C[key].dir, name: name }], 'admin: cestino ' + name)
      .then(function () { A.toast('Spostato nel cestino'); A.go(key); });
  });
})(A);
