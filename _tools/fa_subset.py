#!/usr/bin/env python3
"""Genera Font Awesome "lite": solo le icone elencate (usate + piu' comuni).

Uso:  python _tools/fa_subset.py
Sorgente: pacchetto npm @fortawesome/fontawesome-free (scaricato in %TEMP%).
Output:   assets/fontawesome/css/all.min.css + webfonts/fa-solid-900.woff2 + fa-brands-400.woff2
Per aggiungere un'icona: aggiungi il nome (senza "fa-") a SOLID o BRANDS qui sotto e rilancia lo script.
"""
import json, os, re, subprocess, sys, tempfile, glob, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "fontawesome")
VERSION = "7.2.0"

# --- usate dal sito e dal tema (pagine, copy_code.js, calendar, tema chiaro/scuro, ricerca, ...)
USED_SOLID = """calendar calendar-days cart-shopping circle-info clipboard clipboard-check envelope half-sun-moon hashtag
magnifying-glass moon play square-rss star star-half-stroke stop sun tag thumbtack""".split()
USED_BRANDS = "amazon goodreads-g github".split()

# --- comuni, per non rigenerare ogni volta
COMMON_SOLID = """arrow-up arrow-down arrow-left arrow-right angle-up angle-down angle-left angle-right
chevron-up chevron-down chevron-left chevron-right bars xmark check link copy share-nodes up-right-from-square
circle-check triangle-exclamation rss download house user phone location-dot clock heart globe quote-left quote-right
image camera book file-pdf comment pen trash plus minus eye lock circle-play paper-plane leaf seedling pepper-hot""".split()
COMMON_BRANDS = """facebook facebook-f instagram x-twitter twitter youtube tiktok whatsapp telegram linkedin linkedin-in
pinterest spotify paypal google threads discord reddit mastodon bluesky goodreads""".split()

SOLID = sorted(set(USED_SOLID + COMMON_SOLID))
BRANDS = sorted(set(USED_BRANDS + COMMON_BRANDS))


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, shell=(os.name == "nt" and isinstance(cmd, str)), **kw)


def get_package():
    d = os.path.join(tempfile.gettempdir(), "fa7")
    pkg = os.path.join(d, "package")
    if not os.path.exists(os.path.join(pkg, "metadata", "icons.json")):
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d)
        run(f"npm pack @fortawesome/fontawesome-free@{VERSION} --silent", cwd=d)
        tgz = glob.glob(os.path.join(d, "*.tgz"))[0]
        run(["tar", "-xzf", tgz], cwd=d)
    return pkg


def main():
    pkg = get_package()
    css = open(os.path.join(pkg, "css", "all.min.css"), encoding="utf-8").read()

    # nome (anche alias) -> (codepoint, nomi del gruppo): dalle regole `.fa-a,.fa-b{--fa:"\fxxx"}` del CSS ufficiale
    lookup = {}
    for sel, raw in re.findall(r'((?:\.fa-[a-z0-9-]+,?)+)\{--fa:"(\\[^"]+)"', css):
        group = [x[4:] for x in sel.split(",") if x]
        m = re.fullmatch(r"\\([0-9a-f]+)", raw)
        cp = int(m.group(1), 16) if m else (ord(raw[1:]) if len(raw) == 2 else None)  # "\f005" oppure ASCII escapato ("\#", "\+")
        if cp is None:
            continue  # icone composte da piu' caratteri: non servono
        for n in group:
            lookup[n] = (cp, group, raw)

    def has_svg(group, style):
        return any(os.path.exists(os.path.join(pkg, "svgs", style, n + ".svg")) for n in group)

    def resolve(names, style):
        res, missing = {}, []
        for n in names:
            e = lookup.get(n)
            if not e or not has_svg(e[1], style):
                missing.append(n)
                continue
            res[n] = (e[0], e[2])
        return res, missing
    solid, m1 = resolve(SOLID, "solid")
    brands, m2 = resolve(BRANDS, "brands")
    if m1 or m2:
        print("ATTENZIONE, icone non trovate (ignorate):", m1, m2)

    base = re.sub(r'@font-face\{[^}]*\}', "", css)
    base = re.sub(r'\.fa-[a-z0-9-]+(?:,\.fa-[a-z0-9-]+)*\{--fa:"[^"]*"(?:;--fa--fa:"[^"]*")?\}', "", base)
    base = re.sub(r'/\*!.*?\*/', "", base, flags=re.S)

    faces = (
        '@font-face{font-family:"Font Awesome 7 Brands";font-style:normal;font-weight:400;font-display:swap;src:url(../webfonts/fa-brands-400.woff2) format("woff2")}'
        '@font-face{font-family:"Font Awesome 7 Free";font-style:normal;font-weight:900;font-display:swap;src:url(../webfonts/fa-solid-900.woff2) format("woff2")}'
    )
    allicons = {**solid, **brands}
    rules = "".join(f'.fa-{n}{{--fa:"{raw}"}}' for n, (cp, raw) in sorted(allicons.items()))
    header = f"/*! Font Awesome Free {VERSION} (lite: solo icone usate) - https://fontawesome.com/license/free - Icons CC BY 4.0, Fonts SIL OFL 1.1, Code MIT */\n"

    os.makedirs(os.path.join(OUT, "css"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "webfonts"), exist_ok=True)
    with open(os.path.join(OUT, "css", "all.min.css"), "w", encoding="utf-8", newline="\n") as f:
        f.write(header + faces + base.strip() + rules)

    for fname, cps in (("fa-solid-900.woff2", {v[0] for v in solid.values()}), ("fa-brands-400.woff2", {v[0] for v in brands.values()})):
        src = os.path.join(pkg, "webfonts", fname)
        dst = os.path.join(OUT, "webfonts", fname)
        unis = ",".join(f"U+{c:04X}" for c in sorted(cps))
        run([sys.executable, "-m", "fontTools.subset", src, f"--unicodes={unis}", "--flavor=woff2",
             f"--output-file={dst}", "--layout-features=", "--no-hinting"])

    # file non piu' usati dal CSS lite
    for old in ("fa-regular-400.woff2", "fa-v4compatibility.woff2"):
        p = os.path.join(OUT, "webfonts", old)
        if os.path.exists(p):
            os.remove(p)

    for p in ("css/all.min.css", "webfonts/fa-solid-900.woff2", "webfonts/fa-brands-400.woff2"):
        print(f"{p}: {os.path.getsize(os.path.join(OUT, p)) / 1024:.1f} KB")
    print(f"icone: {len(solid)} solid + {len(brands)} brands")


if __name__ == "__main__":
    main()
