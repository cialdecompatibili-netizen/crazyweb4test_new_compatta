#!/usr/bin/env python3
# verifica_seo.py - controlla canonical, Open Graph e JSON-LD nella build gia' fatta.
# Uso: python verifica_seo.py --build <cartella _site>     (esce con 1 se qualcosa non torna)
import sys, re, json, pathlib, collections

a = sys.argv[1:]
if "--build" not in a or a.index("--build") + 1 >= len(a):
    print("uso: python verifica_seo.py --build <cartella _site>")
    sys.exit(2)
root = pathlib.Path(a[a.index("--build") + 1])
if not root.is_dir():
    print("cartella non trovata:", root)
    sys.exit(2)

prob = []
tipi = collections.Counter()
n = 0
for f in root.rglob("*.html"):
    h = f.read_text("utf-8", errors="replace")
    # solo pagine che passano da metadata.liquid; i redirect (meta refresh/noindex) restano fuori
    if 'name="description"' not in h or "http-equiv=\"refresh\"" in h or "noindex" in h:
        continue
    n += 1
    rel = f.relative_to(root).as_posix()
    can = re.findall(r'<link rel="canonical" href="([^"]+)"', h)
    if len(can) != 1:
        prob.append((rel, "canonical: %d" % len(can)))
    og = re.search(r'<meta property="og:url" content="([^"]+)"', h)
    if og and can and og.group(1) != can[0]:
        prob.append((rel, "og:url diverso dal canonical"))
    for i in re.findall(r'<meta property="og:image" content="([^"]+)"', h):
        if not i.startswith("http"):
            prob.append((rel, "og:image non assoluta: " + i))
    blocchi = re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)
    if len(blocchi) != 1:
        prob.append((rel, "JSON-LD: %d blocchi" % len(blocchi)))
        continue
    raw = blocchi[0]
    try:
        d = json.loads(raw)
    except Exception as e:
        prob.append((rel, "JSON-LD non valido: %s" % e))
        continue
    if "example.com" in raw or "Einstein" in raw or "scholar.google" in raw:
        prob.append((rel, "JSON-LD con dati del template"))
    nodi = d.get("@graph", [])
    tt = [x.get("@type") for x in nodi]
    flat = [t for x in tt for t in (x if isinstance(x, list) else [x])]
    for t in flat:
        tipi[t] += 1
    for must in ("WebSite",):
        if must not in flat:
            prob.append((rel, "manca " + must))
    if not any(t in flat for t in ("Organization", "LocalBusiness", "ProfessionalService")):
        prob.append((rel, "manca Organization"))
    if rel.startswith("servizi/") and rel != "servizi/index.html":
        if "Service" not in flat:
            prob.append((rel, "servizio senza nodo Service"))
        bl = [x for x in nodi if x.get("@type") == "BreadcrumbList"]
        if not bl or len(bl[0].get("itemListElement", [])) != 3:
            prob.append((rel, "breadcrumb servizio non a 3 livelli"))
        sv = [x for x in nodi if x.get("@type") == "Service"]
        if sv and can and sv[0].get("url") != can[0]:
            prob.append((rel, "url Service diverso dal canonical"))

print("pagine controllate: %d | tipi: %s" % (n, ", ".join("%s=%d" % kv for kv in sorted(tipi.items()))))
if prob:
    print("PROBLEMI: %d" % len(prob))
    for rel, msg in prob[:12]:
        print(" -", rel, "->", msg)
    sys.exit(1)
print("OK: canonical, Open Graph e JSON-LD coerenti")
