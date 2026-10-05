#!/usr/bin/env python3
"""verifica_perf.py --build <_site>: controlla che _plugins/performance.rb non abbia rotto nessuna pagina e conta cosa e' stato tolto.
Regole: (1) se la pagina ha matematica -> MathJax presente; (2) se ha classi academicons -> CSS presente; (3) se ha .grid -> Masonry presente;
(4) se ha un badge -> script del badge presente; (5) FontAwesome sempre presente; (6) font: solo Roboto, non bloccante, con <noscript>.
Esce con 1 se una regola e' violata."""
import os, re, sys
d = sys.argv[sys.argv.index('--build') + 1] if '--build' in sys.argv else os.path.join(os.environ.get('TEMP', '.'), '_site_check')
SCRIPT = re.compile(r'<script\b.*?</script>', re.S)
MATH = re.compile(r'\$\$|\\\(|\\\[|\\begin\{|\$[^\s$][^$\n]{0,200}\$')
bad, n, tot = [], 0, {'mathjax': 0, 'academicons': 0, 'masonry': 0, 'badge': 0}
for root, _, fs in os.walk(d):
    for f in fs:
        if not f.endswith('.html'): continue
        p = os.path.join(root, f); t = open(p, encoding='utf-8', errors='replace').read()
        if '</head>' not in t or 'assets/css/tailwind.css' not in t: continue  # non e' una pagina del tema
        n += 1; rel = os.path.relpath(p, d); i = t.index('</head>'); body = t[i:]; text = SCRIPT.sub('', body)
        has = lambda rx: re.search(rx, t) is not None
        has_math = bool(MATH.search(text)) or 'math/tex' in body
        if has_math and not has(r'tex-mml-chtml'): bad.append((rel, 'matematica senza MathJax'))
        if re.search(r'\bai ai-', body) and not has(r'academicons'): bad.append((rel, 'icone academicons senza CSS'))
        if re.search(r'class="[^"]*\bgrid\b', body) and not has(r'masonry-layout'): bad.append((rel, '.grid senza Masonry'))
        if re.search(r'altmetric-embed|__dimensions_badge_embed__', body) and not has(r'cloudfront\.net/assets/embed\.js|badge\.dimensions\.ai'): bad.append((rel, 'badge senza script'))
        if not has(r'fontawesome'): bad.append((rel, 'FontAwesome mancante'))
        if 'Roboto+Slab' in t or 'Material+Icons' in t: bad.append((rel, 'font inutili ancora presenti'))
        if 'fonts.googleapis.com/css' in t and '<noscript>' not in t: bad.append((rel, 'font senza <noscript>'))
        for k, rx in (('mathjax', r'tex-mml-chtml'), ('academicons', r'academicons'), ('masonry', r'masonry-layout'), ('badge', r'badge\.dimensions\.ai')):
            if has(rx): tot[k] += 1
print('pagine controllate:', n, '| pagine CON la libreria ->', tot)
if bad:
    for r, m in bad[:15]: print('  ERRORE', r, '-', m)
    print('FALLITO:', len(bad), 'problemi'); sys.exit(1)
print('OK: nessuna pagina ha perso una libreria che usa')
