# -*- coding: utf-8 -*-
"""
pubblica_servizi.py
====================
UNICO comando per pubblicare i servizi (post + card cliccabili). Sostituisce
tutti i passaggi fatti a mano in chat: output brevissimo = pochi token.

USO (dalla cartella del progetto):
  python pubblica_servizi.py --primi 2 --dry-run      anteprima, non scrive
  python pubblica_servizi.py --slug consulenza-seo    solo quei servizi (virgola)
  python pubblica_servizi.py --tutti                  tutti i servizi
  ... --dove test|prod|entrambi                       dove applicare (default: test)
  ... --push                                          commit + push (solo file toccati)

COSA FA (per ogni cartella scelta):
  1. genera/aggiorna i servizi in _servizi/<slug>.md (collection, via genera_servizi.py)
  2. rende cliccabili le card di _pages/servizi.md e le 6 card di _pages/home.md
     (link con relative_url: valido con qualsiasi baseurl)
  3. assicura il CSS che rende TUTTA la card cliccabile (anche su mobile)
  4. controlla che ogni link punti a un post esistente
  5. con --push: git add SOLO i file toccati, commit (solo quelli), push
     (controlla che il remoto sia quello giusto; prod: si ferma se e' indietro)
Idempotente: rilanciarlo non cambia nulla se e' gia' tutto a posto.
Un eventuale PROD si tocca SOLO con --dove prod|entrambi, dopo il via dell'utente.
Non tocca mai _config.yml, Agenzia.md o altri file.
"""

import os
import re
import sys
import html
import argparse
import datetime
import subprocess

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import genera_servizi as G
from repos_auto import completa
from servizi_data import SERVIZI

import json


def carica_cfg():
    """Legge repos.json (unica fonte di verita'). Aggiungere un repo = un blocco JSON."""
    with open(os.path.join(HERE, "repos.json"), encoding="utf-8") as f:
        c = json.load(f)
    for r in c["repos"].values():
        r["dir"] = os.path.normpath(os.path.join(HERE, r["dir"]))
        # PUNTO CRITICO: remoto/baseurl mancanti o "auto" vengono ricavati dal git origin (repos_auto.py,
        # stessa regola di deploy.yml). NON riscriverli a mano nel codice: un clone deve funzionare da solo.
        completa(r)
    return c


CFG = carica_cfg()
SITO = CFG["sito"]
REPOS = CFG["repos"]
TITOLO2SLUG = {s["titolo"]: s["slug"] for s in SERVIZI}

CSS_SERVIZI = [
    ".srv-t td{position:relative}",
    ".srv-t td a{color:inherit;text-decoration:none}",
    '.srv-t td a::after{content:"";position:absolute;top:0;right:0;bottom:0;'
    "left:0;border-radius:10px}",
]
CSS_HOME_PREFIX = "display:block;color:inherit;text-decoration:none;"

RE_TD = re.compile(r"^<td><b>(?P<t>.*?)</b>(?P<resto>.*)</td>(?P<cr>\r?)$", re.M)
RE_HOME = re.compile(
    r'<div class="srv-home-card"><b>(?P<t>.*?)</b>(?P<resto>.*?)</div>')
RE_LINK = re.compile(r"/(?:blog/(?:\d{4}|servizi)|servizi)/([a-z0-9-]+)/")


def leggi(p):
    with open(p, encoding="utf-8", newline="") as f:
        return f.read()


def scrivi(p, t):
    with open(p, "w", encoding="utf-8", newline="") as f:
        f.write(t)


def anno_post(slug):
    f = G.trova_file_esistente(slug)
    d = G.estrai_data_esistente(f) if f else None
    return d[:4] if d else str(datetime.date.today().year)


def url(anno, slug):
    # URL pubblico del servizio: se repos.json ha "permalink_servizio" (es. /servizi/{slug}/)
    # vale quello, altrimenti il permalink standard dei post (/blog/{anno}/{slug}/).
    # ATTENZIONE: deve coincidere con collections > servizi > permalink in _config.yml (l'URL vero lo decide Jekyll,
    # questo valore serve solo per scrivere i link nelle card). Se divergono, le card puntano a pagine che non esistono.
    fmt = SITO.get("permalink_servizio") or SITO["permalink_post"]
    return "{{ '%s' | relative_url }}" % fmt.format(anno=anno, slug=slug)


def assicura_permalink(percorso, slug):
    """Mette 'permalink:' nel front matter del post-servizio (dopo 'categories:').
    La data nel front matter NON cambia: l'ordine per data nel blog resta identico."""
    # URL ora decisi dal plugin _plugins/permalink_da_categoria.rb (permalink_per_categoria in _config.yml):
    # niente piu' "permalink:" cablato nei post.
    return
    fmt = SITO.get("permalink_servizio")
    if not fmt:
        return
    t = leggi(percorso)
    riga = "permalink: " + fmt.format(anno="", slug=slug)
    if riga in t:
        return
    t = re.sub(r"^categories: .*$", lambda m: m.group(0) + "\n" + riga, t, count=1, flags=re.M)
    scrivi(percorso, t)


RE_VECCHIO = re.compile(r"\{\{ '/(?:blog/(?:\d{4}|servizi)|servizi)/([a-z0-9-]+)/' \| relative_url \}\}")


def riallinea(testo, scelti, stat):
    """Card gia' collegate col vecchio URL /blog/<anno>/<slug>/ -> nuovo URL servizio."""
    fmt = SITO.get("permalink_servizio")
    if not fmt:
        return testo

    def r(m):
        if m.group(1) not in scelti:
            return m.group(0)
        stat["riallineate"] = stat.get("riallineate", 0) + 1
        return "{{ '%s' | relative_url }}" % fmt.format(anno="", slug=m.group(1))
    return RE_VECCHIO.sub(r, testo)


def collega_servizi(testo, scelti, anni, stat):
    def r(m):
        titolo = html.unescape(m.group("t"))
        slug = TITOLO2SLUG.get(titolo)
        if slug is None:
            stat["senza_servizio"].append(titolo)
            return m.group(0)
        if slug not in scelti:
            return m.group(0)
        stat["card_servizi"] += 1
        return '<td><a href="%s"><b>%s</b>%s</a></td>%s' % (
            url(anni[slug], slug), m.group("t"), m.group("resto"), m.group("cr"))
    return RE_TD.sub(r, testo)


def collega_home(testo, scelti, anni, stat):
    if 'SERVIZI HOME START (DINAMICO)' in testo:
        return testo  # box home dinamico (Liquid, campo in_home): nessuna card a mano da riallineare
    def r(m):
        slug = TITOLO2SLUG.get(html.unescape(m.group("t")))
        if slug is None or slug not in scelti:
            return m.group(0)
        stat["card_home"] += 1
        return '<a class="srv-home-card" href="%s"><b>%s</b>%s</a>' % (
            url(anni[slug], slug), m.group("t"), m.group("resto"))
    return RE_HOME.sub(r, testo)


def assicura_css_servizi(testo, stat):
    eol = "\r\n" if "\r\n" in testo else "\n"
    mancanti = [c for c in CSS_SERVIZI if c not in testo]
    m = re.search(r"^\.srv-t td:empty\{[^\r\n]*", testo, re.M)
    if mancanti and m:
        testo = (testo[:m.end()] + "".join(eol + c for c in mancanti)
                 + testo[m.end():])
        stat["css"] += len(mancanti)
    return testo


def assicura_css_home(testo, stat):
    vecchio = ".srv-home-card{padding:"
    if vecchio in testo:
        testo = testo.replace(
            vecchio, ".srv-home-card{" + CSS_HOME_PREFIX + "padding:", 1)
        stat["css"] += 1
    return testo


def link_rotti(cartella, testo):
    srv = os.listdir(os.path.join(cartella, SITO["servizi_dir"]))
    return sorted({s for s in RE_LINK.findall(testo) if (s + ".md") not in srv})


def applica(cartella, servizi, dry):
    """Applica tutto a UNA cartella (test o prod). Ritorna (stat, file_toccati)."""
    # PROTEZIONE: i servizi sono una collection solo se il repo la dichiara in _config.yml (oggi solo TEST).
    # Su un repo senza collection (PROD) creare _servizi/ darebbe pagine mai pubblicate e card rotte.
    cfg_repo = leggi(os.path.join(cartella, "_config.yml"))
    if not re.search(r"^  servizi:\s*\r?\n(?:    .*\r?\n)*?    output: true", cfg_repo, re.M):
        sys.exit("Questo repo non ha la collection 'servizi' in _config.yml (solo TEST per ora): niente da fare qui.")
    G.POSTS_DIR = os.path.join(cartella, SITO["posts_dir"])
    G.BACKUP_DIR = os.path.join(G.POSTS_DIR, SITO["backup_dir_nome"])
    G.SERVIZI_DIR = os.path.join(cartella, SITO["servizi_dir"])
    scelti = {s["slug"] for s in servizi}
    stat = {"creati": 0, "modificati": 0, "invariati": 0, "card_servizi": 0,
            "card_home": 0, "css": 0, "senza_servizio": [], "rotti": []}
    toccati = []

    for s in servizi:
        prima = G.trova_file_esistente(s["slug"])
        vecchio = leggi(prima) if prima else None
        G.genera_post(s, dry_run=dry)
        dopo = G.trova_file_esistente(s["slug"])
        if dry:
            stat["creati" if prima is None else "invariati"] += 1
            continue
        toccati.append(os.path.relpath(dopo, cartella))
        if vecchio is None:
            stat["creati"] += 1
        elif leggi(dopo) != vecchio:
            stat["modificati"] += 1
        else:
            stat["invariati"] += 1

    anni = {s: anno_post(s) for s in scelti}
    testi = {}
    for nome, funz in ((SITO["servizi_page"], collega_servizi), (SITO["home_page"], collega_home)):
        p = os.path.join(cartella, nome)
        vecchio = leggi(p)
        nuovo = riallinea(vecchio, scelti, stat)
        nuovo = funz(nuovo, scelti, anni, stat)
        nuovo = (assicura_css_servizi(nuovo, stat) if nome == SITO["servizi_page"]
                 else assicura_css_home(nuovo, stat))
        testi[nome] = nuovo
        if nuovo != vecchio and not dry:
            scrivi(p, nuovo)
        if not dry:
            toccati.append(os.path.relpath(p, cartella))
    if not dry:
        for t in testi.values():
            stat["rotti"] += link_rotti(cartella, t)
    stat["senza_servizio"] = sorted(set(stat["senza_servizio"]))
    return stat, toccati


def git(cartella, *args):
    r = subprocess.run(["git", "-C", cartella] + list(args), capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    return r.returncode, (r.stdout + r.stderr).strip()


def pubblica(cartella, files, msg):
    """git add + commit + push SOLO dei file indicati. Ritorna True se ok."""
    rc, out = git(cartella, "remote", "get-url", "origin")
    # PUNTO CRITICO: se "remoto" in repos.json e' "auto", e' ricavato proprio da questo origin, quindi il
    # controllo qui sotto passa SEMPRE (non protegge niente). Protegge solo dove "remoto" e' scritto a mano
    # (es. un PROD): li' un origin sbagliato blocca il push. Per un repo protetto scrivi il remoto esplicito.
    atteso = next((r["remoto"] for r in REPOS.values() if r["dir"] == cartella), "")
    if rc != 0 or not atteso or not re.search(re.escape(atteso) + r"(\.git)?/?$", out):
        print("  STOP: remoto inatteso (%s), non pubblico." % out)
        return False
    git(cartella, "fetch")
    rc, out = git(cartella, "rev-list", "--count", "HEAD..@{u}")
    if out != "0":
        print("  STOP: il remoto ha commit che mancano in locale (fai pull).")
        return False
    git(cartella, "add", "--", *files)
    if git(cartella, "diff", "--cached", "--quiet", "--", *files)[0] == 0:
        print("  niente da pubblicare: gia' tutto allineato.")
        return True
    rc, out = git(cartella, "commit", "-q", "-m", msg, "--", *files)
    if rc != 0:
        print("  STOP: commit fallito: " + out)
        return False
    rc, out = git(cartella, "push")
    if rc != 0:
        print("  STOP: push fallito: " + out)
        return False
    print("  PUSH OK " + git(cartella, "rev-parse", "--short", "HEAD")[1])
    return True


def main():
    ap = argparse.ArgumentParser(description="Pubblica servizi (post + card).")
    ap.add_argument("--slug", help="slug separati da virgola")
    ap.add_argument("--primi", type=int, help="i primi N servizi di servizi_data.py")
    ap.add_argument("--tutti", action="store_true")
    ap.add_argument("--dove", default=CFG["default"],
                    help="nome repo da repos.json, virgola per piu' repo, oppure tutti")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--push", action="store_true")
    ap.add_argument("--conferma", action="store_true", help="necessario per i repo protetti")
    ap.add_argument("--msg", help="messaggio di commit (opzionale)")
    a = ap.parse_args()

    if sum(bool(x) for x in (a.slug, a.primi, a.tutti)) != 1:
        sys.exit("Serve ESATTAMENTE una scelta tra --slug, --primi N, --tutti")
    if a.tutti:
        servizi = list(SERVIZI)
    elif a.primi:
        servizi = SERVIZI[:a.primi]
    else:
        chiavi = [x.strip() for x in a.slug.split(",") if x.strip()]
        per_slug = {s["slug"]: s for s in SERVIZI}
        ignoti = [c for c in chiavi if c not in per_slug]
        if ignoti:
            sys.exit("Slug sconosciuti: " + ", ".join(ignoti))
        servizi = [per_slug[c] for c in chiavi]

    nomi = list(REPOS) if a.dove in ("tutti", "entrambi") else [x.strip() for x in a.dove.split(",")]
    ignoti = [n for n in nomi if n not in REPOS]
    if ignoti:
        sys.exit("Repo non in repos.json: %s (disponibili: %s)" % (", ".join(ignoti), ", ".join(REPOS)))
    if len(nomi) > 1 and not a.dry_run and any(REPOS[n]["protetto"] for n in nomi) and not a.conferma:
        sys.exit("Repo protetto: aggiungi --conferma (solo dopo il via di Mirco)")
    cartelle = [REPOS[n]["dir"] for n in nomi]
    ok_globale = True
    for cartella in cartelle:
        nome = next(r["etichetta"] for r in REPOS.values() if r["dir"] == cartella)
        if not os.path.isdir(os.path.join(cartella, SITO["posts_dir"])):
            print("== %s: cartella non trovata: %s" % (nome, cartella))
            ok_globale = False
            continue
        print("== %s%s (%d servizi)" % (nome, " [dry-run]" if a.dry_run else "",
                                        len(servizi)))
        stat, toccati = applica(cartella, servizi, a.dry_run)
        print("  post: %d creati, %d modificati, %d invariati | card servizi: %d | "
              "card home: %d | css: %d" % (stat["creati"], stat["modificati"],
                                           stat["invariati"], stat["card_servizi"],
                                           stat["card_home"], stat["css"]))
        if stat["senza_servizio"]:
            print("  card SENZA servizio in servizi_data.py: "
                  + "; ".join(stat["senza_servizio"]))
        if stat["rotti"]:
            print("  LINK ROTTI (nessun post): " + ", ".join(stat["rotti"]))
            ok_globale = False
        if a.push and not a.dry_run:
            if stat["rotti"]:
                print("  push annullato per i link rotti.")
                continue
            msg = a.msg or "Servizi: %d post + card cliccabili" % len(servizi)
            ok_globale = pubblica(cartella, sorted(set(toccati)), msg) and ok_globale
    sys.exit(0 if ok_globale else 1)


if __name__ == "__main__":
    main()
