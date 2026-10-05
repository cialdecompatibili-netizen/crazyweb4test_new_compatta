#!/usr/bin/env python3
"""Controllo di coerenza degli URL (post e servizi) (CLAUDE.md > Punti critici n.2).
Uso:  python verifica_permalink.py            -> controlla i 3 posti dove vive la regola (statico, 1 secondo)
      python verifica_permalink.py --build    -> in piu' controlla _site (redirect, sitemap, duplicati); lanciare dopo jekyll build
      python verifica_permalink.py --build <cartella>   (se la build e' in un'altra cartella, es. $env:TEMP\\_site_check)
Esce con codice 1 se qualcosa non torna. Output: poche righe."""
import json, os, re, sys
from urllib.parse import urlparse

R = os.path.dirname(os.path.abspath(__file__))
err, ok = [], []

def leggi(p):
    with open(os.path.join(R, p), encoding="utf-8") as f:
        return f.read()

def regole_config():
    t = leggi("_config.yml")
    m = re.search(r"^permalink_per_categoria:\s*\n((?:[ \t]+.*\n?)*)", t, re.M)
    out = {}
    for riga in (m.group(1) if m else "").splitlines():
        r = re.match(r"\s+([\w-]+):\s*(\S+)", riga)
        if r and not riga.strip().startswith("#"):
            out[r.group(1)] = r.group(2)
    return out, re.search(r"^baseurl:\s*(\S*)", t, re.M)

def permalink_servizi():
    """Permalink della collection 'servizi' in _config.yml (blocco collections:), es. /servizi/:title/ ."""
    t = leggi("_config.yml")
    m = re.search(r"^  servizi:\s*\n((?:    .*\n?)*)", t, re.M)
    r = re.search(r"permalink:\s*(\S+)", m.group(1)) if m else None
    return r.group(1) if r else ""

def statico():
    regole, _ = regole_config()   # eccezioni per categoria dei POST: possono essere vuote
    for cat, rg in regole.items():
        if not (rg.startswith("/") and rg.endswith("/") and ":title" in rg):
            err.append(f"config: regola '{cat}' non valida ({rg}): serve /.../:title/")
    # --- SERVIZI = collection 'servizi' (cartella _servizi/), indipendente dal blog ---
    pc = permalink_servizi()
    if not (pc.startswith("/") and pc.endswith("/") and ":title" in pc):
        err.append(f"config: collections > servizi > permalink mancante o non valido ({pc or 'vuoto'})")
    ps = json.loads(leggi("repos.json")).get("sito", {}).get("permalink_servizio", "")
    norm = lambda s: s.replace(":title", "X").replace("{slug}", "X")
    if norm(ps) != norm(pc):
        err.append(f"repos.json permalink_servizio ({ps}) != config collections.servizi ({pc})")
    else:
        ok.append("config == repos.json")
    js = leggi(os.path.join("admin", "admin-views.js"))
    pre = pc.split(":title")[0]
    if f"'{pre}' + nm" not in js and f"'{pre}' + (effSl || nm" not in js:
        err.append(f"admin-views.js: manca lo specchio del permalink dei servizi -> {pre}")
    for cat, rg in regole.items():
        pre_c = rg.split(":title")[0]
        if f"cs === '{cat}'" not in js or f"'{pre_c}' + sl" not in js:
            err.append(f"admin-views.js: manca lo specchio della regola '{cat}' -> {pre_c}")
    ok.append("config == admin-views.js")
    if "layout: servizio" not in leggi("_config.yml") or not os.path.isfile(os.path.join(R, "_layouts", "servizio.liquid")):
        err.append("layout servizio mancante (_layouts/servizio.liquid) o non assegnato in _config.yml > defaults")
    if "page.collection == 'servizi'" not in leggi(os.path.join("_includes", "metadata.liquid")):
        err.append("metadata.liquid: manca page.collection == 'servizi' (schema Service)")
    pl = leggi(os.path.join("_plugins", "permalink_da_categoria.rb"))
    if "collisione" not in pl:
        err.append("plugin: controllo collisioni URL assente")
    if "page.collection == 'posts'" not in leggi(os.path.join("_layouts", "post.liquid")):
        err.append("layout post.liquid: manca la riga page.collection == 'posts' (link anno/categoria)")
    else:
        ok.append("layout ok")
    # nessun post/servizio con permalink: a mano; nessun post nella categoria servizi (sono una collection a parte)
    for cart in ("_posts", "_servizi"):
        pc_dir = os.path.join(R, cart)
        if not os.path.isdir(pc_dir):
            continue
        for f in os.listdir(pc_dir):
            if f.endswith(".md"):
                with open(os.path.join(pc_dir, f), encoding="utf-8") as fh:
                    testa = fh.read(1500).split("---")[1:2]
                if testa and re.search(r"^permalink:", testa[0], re.M):
                    err.append(f"{cart}/{f}: ha 'permalink:' nel front matter (esce da regola e redirect)")
                if cart == "_posts" and testa and re.search(r"^categor(y|ies):\s*\[?servizi\b", testa[0], re.M):
                    err.append(f"_posts/{f}: categoria 'servizi' tra i post; i servizi vanno in _servizi/ (admin > Servizi)")
    ok.append("front matter ok")

def file_per_url(site, base, url):
    p = urlparse(url).path
    if base and p.startswith(base):
        p = p[len(base):]
    q = os.path.join(site, p.lstrip("/"))
    # e' un file solo se ha una vera estensione (uno slug tipo 'v1.2' resta una cartella)
    return q if os.path.splitext(q)[1].lower() in (".xml", ".txt", ".html", ".json", ".pdf", ".ico", ".css", ".js") else os.path.join(q, "index.html")

def is_redirect(p, qualsiasi_dimensione=False):
    """URL di destinazione se p e' una pagina-redirect (meta refresh a 0 secondi), altrimenti None.
    Di norma solo file piccoli (le pagine-redirect del plugin); con qualsiasi_dimensione=True anche pagine complete
    (es. un articolo con 'redirect:' verso un PDF), che in sitemap non devono stare."""
    if not os.path.isfile(p) or (not qualsiasi_dimensione and os.path.getsize(p) > 2500):
        return None
    m = re.search(r'http-equiv="refresh" content="0; url=([^"]+)"', open(p, encoding="utf-8", errors="ignore").read())
    return m.group(1) if m else None

def build(site):
    _, mb = regole_config()
    base = mb.group(1).strip("'\"") if mb else ""
    if not os.path.isdir(site):
        err.append(f"build: cartella {site} non trovata"); return
    rotti = 0; nred = 0
    for d, _, fs in os.walk(site):
        if "index.html" in fs:
            p = os.path.join(d, "index.html")
            if os.path.getsize(p) > 2500:
                continue
            h = open(p, encoding="utf-8", errors="ignore").read()
            m = re.search(r'http-equiv="refresh" content="0; url=([^"]+)"', h)
            if m:
                nred += 1
                if not os.path.exists(file_per_url(site, base, m.group(1))):
                    rotti += 1; err.append(f"redirect rotto: {os.path.relpath(p, site)} -> {m.group(1)}")
    sm = os.path.join(site, "sitemap.xml")
    locs = re.findall(r"<loc>([^<]+)</loc>", open(sm, encoding="utf-8").read()) if os.path.exists(sm) else []
    dup = {u for u in locs if locs.count(u) > 1}
    mancanti = [u for u in locs if not os.path.exists(file_per_url(site, base, u))]
    if dup: err.append(f"sitemap: {len(dup)} URL duplicati")
    if mancanti: err.append(f"sitemap: {len(mancanti)} URL senza file (es. {mancanti[0]})")
    in_red = [u for u in locs if is_redirect(file_per_url(site, base, u), True)]
    if in_red: err.append(f"sitemap: {len(in_red)} URL sono pagine-redirect, vanno esclusi (es. {in_red[0]})")
    sv = os.path.join(R, "_servizi")
    if os.path.isdir(sv):
        pc = permalink_servizi().replace(":title", "{s}")
        mancano = [f for f in os.listdir(sv) if f.endswith(".md") and not os.path.exists(file_per_url(site, base, base + pc.format(s=f[:-3])))]
        if mancano:
            err.append(f"build: {len(mancano)} servizi senza pagina (es. {mancano[0]})")
        sotto_blog = [u for u in locs if "/blog/" in u and "servizi" in u.split("/blog/")[1].split("/")[0:2]]
        if sotto_blog:
            err.append(f"sitemap: servizi sotto /blog/ (es. {sotto_blog[0]})")
        ok.append(f"servizi: {len(os.listdir(sv))} file, tutti con pagina")
    ok.append(f"build: {nred} redirect (rotti {rotti}), sitemap {len(locs)} URL")

if __name__ == "__main__":
    statico()
    if "--build" in sys.argv:
        i = sys.argv.index("--build")
        arg = sys.argv[i + 1] if i + 1 < len(sys.argv) else os.path.join(R, "_site")
        build(arg)
    for e in err: print("ERRORE:", e)
    print(("OK: " + "; ".join(ok)) if not err else f"{len(err)} problemi")
    sys.exit(1 if err else 0)
