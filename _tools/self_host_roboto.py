#!/usr/bin/env python3
"""Scarica Roboto (variabile, solo sottoinsiemi latin e latin-ext) da Google Fonts e lo salva in assets/fonts/.

Uso:  python _tools/self_host_roboto.py
Output: assets/fonts/roboto-latin.woff2, roboto-latin-ext.woff2, roboto.css
Il plugin _plugins/performance.rb sostituisce il link a Google Fonts con questo CSS locale (+ preload del latin).
"""
import os, re, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "fonts")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
WANT = ("latin", "latin-ext")


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA})).read()


def main():
    os.makedirs(OUT, exist_ok=True)
    css = get("https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap").decode("utf-8")
    blocks = re.findall(r"/\* ([a-z-]+) \*/\s*(@font-face\s*\{.*?\})", css, flags=re.S)
    seen, out = set(), []
    for name, block in blocks:
        if name not in WANT or name in seen:
            continue  # un solo blocco per sottoinsieme: il font e' variabile, lo stesso file serve tutti i pesi
        seen.add(name)
        url = re.search(r"url\((https://[^)]+)\)", block).group(1)
        fname = f"roboto-{name}.woff2"
        open(os.path.join(OUT, fname), "wb").write(get(url))
        rng = re.search(r"unicode-range:\s*([^;]+);", block).group(1).strip()
        out.append(
            "@font-face{font-family:'Roboto';font-style:normal;font-weight:300 700;font-stretch:100%;font-display:swap;"
            f"src:url({fname}) format('woff2');unicode-range:{rng}}}"
        )
    open(os.path.join(OUT, "roboto.css"), "w", encoding="utf-8", newline="\n").write("\n".join(out) + "\n")
    for f in sorted(os.listdir(OUT)):
        print(f"{f}: {os.path.getsize(os.path.join(OUT, f)) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
