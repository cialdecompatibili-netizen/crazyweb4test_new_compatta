# -*- coding: utf-8 -*-
"""
menu.py - gestione del menu di navigazione (voci, tendine, righe divisorie, voci-link).

1. Cosa fa: elenca il menu; mostra/nasconde una voce e ne cambia ordine/titolo; aggiunge/toglie figli
   di una tendina (con righe divisorie sempre valide); gestisce le voci-link senza pagina.
2. Su quale file agisce: il front matter di _pages/<pagina>.md (nav, nav_order, title, dropdown, children)
   e _data/menu_links.yml. Non tocca _includes/header.liquid (vietato da AGENTS.md).
3. Lavora in locale (file + git), niente API GitHub.
4. Origine: richiesta del 05/10/2026 (automatizzare menu, footer, articoli).

Uso (dalla cartella del sito; ogni comando di scrittura accetta --sito --dry-run --push --conferma):
  python -m automazioni.menu elenco [--tutte]
  python -m automazioni.menu voce servizi --nav true --ordine 2 [--titolo Servizi]
  python -m automazioni.menu figlio eventi --titolo "Meeting aziendali" --permalink /servizi/meeting/ [--dopo "X"] [--divider]
  python -m automazioni.menu rimuovi-figlio eventi --titolo "Meeting aziendali"
  python -m automazioni.menu link-aggiungi --titolo Blog --url /blog/ [--ordine 5] [--blank]
  python -m automazioni.menu link-rimuovi --titolo Blog

REGOLE DEL MENU (CLAUDE.md punto 34, rispettate qui):
- Il titolo di un figlio deve essere IDENTICO al title della pagina collegata (il tema evidenzia cosi' la voce attiva):
  se non coincide lo script avvisa.
- Il permalink del figlio SENZA baseurl (/servizi/x/), oppure URL completo con ://.
- Una sola profondita' di tendina. Divider (title: divider): mai in testa, mai in coda, mai due di fila:
  lo script li normalizza da solo.
- Due pagine con lo stesso nav_order = ordine casuale: lo script avvisa.
"""
import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from automazioni.common import sito  # noqa: E402
from automazioni.common.sito import Errore  # noqa: E402

LINKS = "_data/menu_links.yml"


# ---------------------------------------------------------------- lettura

def _pagine(base):
    """Lista di dict con i campi di menu di ogni _pages/*.md (salta i file senza front matter)."""
    ris = []
    for f in sorted((base / "_pages").glob("*.md")):
        dati = f.read_bytes()
        try:
            righe = sito.righe_di(dati)
            fine = sito.fm_fine(righe)
        except Errore:
            continue
        g = lambda k: sito.leggi_valore(righe, k, 1, fine)  # noqa: E731
        ris.append({"rel": f"_pages/{f.name}", "title": g("title"), "nav": g("nav"),
                    "ordine": g("nav_order"), "permalink": g("permalink"), "dropdown": g("dropdown")})
    return ris


def leggi_figli(righe, i, j):
    """righe[i] = 'children:'. Ritorna [{'title','permalink'|None}]. Rifiuta tutto cio' che non sa riscrivere."""
    figli, corr = [], None
    for r in righe[i + 1:j]:
        t = r.rstrip(b"\r").decode("utf-8")
        if not t.strip():
            continue
        m = re.match(r"^\s*-\s+title:\s*(.*?)\s*$", t)
        if m:
            # CRITICO: il blocco children viene RISCRITTO: cio' che non sa riscrivere (commenti, chiavi extra) lo rifiuta
            # invece di perderlo in silenzio.
            if re.search(r"\s#", m.group(1)):
                raise Errore(f"children: commento sulla riga {t.strip()!r}, non lo riscrivo")
            corr = {"title": sito.dequota(m.group(1)), "permalink": None}
            figli.append(corr)
            continue
        m = re.match(r"^\s+permalink:\s*(.*?)\s*$", t)
        if m and corr is not None and corr["permalink"] is None and not re.search(r"\s#", m.group(1)):
            corr["permalink"] = sito.dequota(m.group(1))
            continue
        raise Errore(f"children: riga non gestita: {t.strip()!r}")
    return figli


def _figli_pagina(base, rel):
    righe = sito.righe_di((base / rel).read_bytes())
    fine = sito.fm_fine(righe)
    i = sito.trova_chiave(righe, "children", 1, fine)
    return [] if i is None else leggi_figli(righe, i, sito.fine_blocco(righe, i, fine))


# ---------------------------------------------------------------- scrittura figli

def normalizza(figli):
    """Divider validi: mai in testa, mai doppi, mai in coda."""
    ris = []
    for f in figli:
        # CRITICO (CLAUDE.md 34): divider mai in testa, mai doppi, mai in coda: il tema mostrerebbe righe orfane.
        if f["title"] == "divider" and (not ris or ris[-1]["title"] == "divider"):
            continue
        ris.append(f)
    while ris and ris[-1]["title"] == "divider":
        ris.pop()
    return ris


def _righe_figli(figli, cr, perm_div):
    out = [b"children:" + cr]
    for f in figli:
        out.append(b"  - title: " + sito.yq(f["title"]).encode("utf-8") + cr)
        perm = f["permalink"]
        if f["title"] == "divider" and perm is None and perm_div:
            perm = "#"
        if perm is not None and not (f["title"] == "divider" and not perm_div):
            out.append(b"    permalink: " + sito.yq(perm).encode("utf-8") + cr)
    return out


def modifica_figli(dati, trasforma):
    """Applica trasforma(figli)->figli al blocco children (crea dropdown/children se mancano)."""
    righe = sito.righe_di(dati)
    fine = sito.fm_fine(righe)
    sito.imposta_riga(righe, "dropdown", True, 1, fine, True)
    fine = sito.fm_fine(righe)
    i = sito.trova_chiave(righe, "children", 1, fine)
    cr = sito._cr(righe)
    if i is None:
        figli, j, perm_div = [], None, True
    else:
        j = sito.fine_blocco(righe, i, fine)
        figli = leggi_figli(righe, i, j)
        div = [f for f in figli if f["title"] == "divider"]
        perm_div = (any(f["permalink"] is not None for f in div) if div else True)
    nuovi = normalizza(trasforma(figli))
    blocco = _righe_figli(nuovi, cr, perm_div)
    if i is None:
        righe[fine:fine] = blocco
    else:
        righe[i:j] = blocco
    return sito.unisci(righe), nuovi


# ---------------------------------------------------------------- comandi

def cmd_elenco(a):
    base = sito.trova_sito(a.sito)
    pagine = _pagine(base)
    visibili = [p for p in pagine if p["nav"] == "true"]
    visibili.sort(key=lambda p: float(p["ordine"]) if p["ordine"] not in (None, "") else 999)
    print(f"MENU di {base.name}")
    for p in visibili:
        extra = ""
        if p["dropdown"] == "true":
            extra = "  [tendina: " + ", ".join(f["title"] for f in _figli_pagina(base, p["rel"])) + "]"
        print(f"  {p['ordine'] or '-':>5}  {p['title'] or '?':<22} {p['permalink'] or '':<22}{extra}")
    nascoste = [p for p in pagine if p["nav"] != "true"]
    if a.tutte:
        print("NON nel menu: " + ", ".join(f"{p['rel'].split('/')[-1]}" for p in nascoste))
    else:
        print(f"({len(nascoste)} pagine fuori menu: usa --tutte per vederle)")
    p = base / LINKS
    if p.exists():
        _, voci = leggi_links(p.read_text(encoding="utf-8"))
        if voci:
            print("VOCI-LINK: " + ", ".join(f"{v['title']} -> {v.get('url', '')}" for v in voci))


def cmd_voce(a):
    base = sito.prepara(a)
    rel = sito.risolvi_file(base, a.pagina)
    originale = (base / rel).read_bytes()
    dati = originale
    if a.nav is not None:
        dati, _ = sito.fm_imposta(dati, "nav", a.nav == "true")
    if a.ordine is not None:
        v = sito.valore_cli(a.ordine)
        if isinstance(v, (str, bool)):
            raise Errore("--ordine deve essere un numero (es. 3 oppure 0.5)")
        dati, _ = sito.fm_imposta(dati, "nav_order", v)
        for p in _pagine(base):
            # CRITICO: stesso nav_order su due pagine = ordine casuale nel menu: si avvisa.
            if p["rel"] != rel and p["nav"] == "true" and p["ordine"] not in (None, "") and float(p["ordine"]) == float(v):
                print(f"ATTENZIONE: anche '{p['title']}' ha nav_order {v}: l'ordine sara' casuale")
    if a.titolo:
        # CRITICO (CLAUDE.md 34): il titolo del figlio nella tendina deve essere IDENTICO al title della pagina
        # (il tema evidenzia cosi' la voce attiva): rinominando qui, va rinominato anche li'.
        vecchio = sito.fm_leggi(originale, "title")
        dati, _ = sito.fm_imposta(dati, "title", a.titolo)
        for p in _pagine(base):
            if p["dropdown"] == "true" and any(f["title"] == vecchio for f in _figli_pagina(base, p["rel"])):
                print(f"ATTENZIONE: '{vecchio}' e' figlio nella tendina {p['rel']}: aggiorna anche li' il titolo (deve essere identico)")
    cambi = {rel: dati} if dati != originale else {}
    sito.applica(base, a, cambi, [rel], f"menu: voce {a.pagina}")


def _controlla_permalink(base, perm):
    if not (perm.startswith("/") or "://" in perm):
        raise Errore("permalink: deve iniziare con / oppure essere un URL completo con ://")
    if "://" in perm:
        return
    nomi = {"/" + base.name + "/"}
    cfg = (base / "_config.yml").read_bytes()
    bu = sito.leggi_valore(sito.righe_di(cfg), "baseurl", 0, len(sito.righe_di(cfg)))
    if bu:
        nomi.add(bu.rstrip("/") + "/")
    # CRITICO (CLAUDE.md 34): permalink del figlio SENZA baseurl: il tema lo aggiunge, altrimenti il link si raddoppia.
    if any(perm.startswith(n) for n in nomi):
        raise Errore(f"permalink {perm}: non scrivere il baseurl, il tema lo aggiunge da solo")


def cmd_figlio(a):
    base = sito.prepara(a)
    if a.titolo == "divider":
        raise Errore("per le righe divisorie usa --divider")
    _controlla_permalink(base, a.permalink)
    rel = sito.risolvi_file(base, a.padre)
    originale = (base / rel).read_bytes()

    def aggiungi(figli):
        if any(f["title"] == a.titolo for f in figli):
            raise Errore(f"'{a.titolo}' c'e' gia' nella tendina")
        nuovo = [{"title": a.titolo, "permalink": a.permalink}]
        if a.divider:
            nuovo.insert(0, {"title": "divider", "permalink": None})
        if a.dopo:
            idx = [k for k, f in enumerate(figli) if f["title"] == a.dopo]
            if len(idx) != 1:
                raise Errore(f"voce '{a.dopo}' non trovata nella tendina")
            return figli[:idx[0] + 1] + nuovo + figli[idx[0] + 1:]
        return figli + nuovo

    dati, finali = modifica_figli(originale, aggiungi)
    for p in _pagine(base):
        if p["permalink"] == a.permalink and p["title"] != a.titolo:
            print(f"ATTENZIONE: la pagina {a.permalink} ha title '{p['title']}': per l'evidenziazione il figlio deve avere lo stesso titolo")
    cambi = {rel: dati} if dati != originale else {}
    sito.applica(base, a, cambi, [rel], f"menu: figlio '{a.titolo}' in {a.padre}")
    print("tendina: " + " | ".join(f["title"] for f in finali))


def cmd_rimuovi_figlio(a):
    base = sito.prepara(a)
    rel = sito.risolvi_file(base, a.padre)
    originale = (base / rel).read_bytes()

    def togli(figli):
        if not any(f["title"] == a.titolo for f in figli):
            raise Errore(f"'{a.titolo}' non e' nella tendina")
        return [f for f in figli if f["title"] != a.titolo]

    dati, finali = modifica_figli(originale, togli)
    # CRITICO: una tendina vuota rompe il menu: si tolgono children e dropdown insieme.
    if not finali:  # tendina vuota: torna voce semplice
        righe = sito.righe_di(dati)
        fine = sito.fm_fine(righe)
        i = sito.trova_chiave(righe, "children", 1, fine)
        del righe[i:sito.fine_blocco(righe, i, fine)]
        dati, _ = sito.fm_rimuovi(sito.unisci(righe), "dropdown")
        print("la tendina e' rimasta vuota: tolti children e dropdown")
    cambi = {rel: dati} if dati != originale else {}
    sito.applica(base, a, cambi, [rel], f"menu: tolto '{a.titolo}' da {a.padre}")


# ---------------------------------------------------------------- voci-link (_data/menu_links.yml)

def leggi_links(testo):
    intest, voci, corr = [], [], None
    for r in testo.splitlines():
        s = r.strip()
        if s.startswith("#"):
            intest.append(r.rstrip())
            continue
        if not s or s == "[]":
            continue
        m = re.match(r"^-\s+title:\s*(.*)$", s)
        if m:
            corr = {"title": sito.dequota(m.group(1))}
            voci.append(corr)
            continue
        m = re.match(r"^(url|order|blank):\s*(.*)$", s)
        if m and corr is not None:
            corr[m.group(1)] = sito.dequota(m.group(2))
            continue
        raise Errore(f"{LINKS}: riga non gestita: {s!r}")
    return intest, voci


def _scrivi_links(intest, voci, nl):
    righe = list(intest)
    if not voci:
        righe.append("[]")
    for v in voci:
        righe.append("- title: " + sito.yq(v["title"]))
        if v.get("url") is not None:
            righe.append("  url: " + sito.yq(v["url"]))
        if v.get("order") not in (None, ""):
            righe.append("  order: " + sito.yq(sito.valore_cli(str(v["order"]))))
        if v.get("blank") not in (None, ""):
            righe.append("  blank: " + sito.yq(str(v["blank"]).lower() == "true"))
    return (nl.decode().join(righe) + nl.decode()).encode("utf-8")


def _modifica_links(a, trasforma, messaggio):
    base = sito.prepara(a)
    p = base / LINKS
    if not p.exists():
        raise Errore(f"{LINKS} non esiste in questo sito")
    vecchio = p.read_bytes()
    intest, voci = leggi_links(vecchio.decode("utf-8"))
    voci = trasforma(voci)
    nuovo = _scrivi_links(intest, voci, sito.eol(vecchio))
    cambi = {LINKS: nuovo} if nuovo != vecchio else {}
    sito.applica(base, a, cambi, [LINKS], messaggio)


def cmd_link_aggiungi(a):
    if not (a.url.startswith("/") or "://" in a.url):
        raise Errore("--url deve iniziare con / oppure essere un URL completo")

    def aggiungi(voci):
        if any(v["title"] == a.titolo for v in voci):
            raise Errore(f"'{a.titolo}' c'e' gia' tra le voci-link")
        v = {"title": a.titolo, "url": a.url}
        if a.ordine is not None:
            v["order"] = a.ordine
        if a.blank:
            v["blank"] = "true"
        return voci + [v]

    _modifica_links(a, aggiungi, f"menu: voce-link '{a.titolo}'")


def cmd_link_rimuovi(a):
    def togli(voci):
        if not any(v["title"] == a.titolo for v in voci):
            raise Errore(f"'{a.titolo}' non e' tra le voci-link")
        return [v for v in voci if v["title"] != a.titolo]

    _modifica_links(a, togli, f"menu: tolta voce-link '{a.titolo}'")


# ---------------------------------------------------------------- main

def costruisci():
    ap = argparse.ArgumentParser(prog="menu", description=__doc__.split("\n")[1], formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)

    def nuovo(nome, fn, scrittura=True):
        p = sp.add_parser(nome)
        if scrittura:
            sito.argomenti_comuni(p)
        else:
            p.add_argument("--sito")
        p.set_defaults(fn=fn)
        return p

    p = nuovo("elenco", cmd_elenco, False)
    p.add_argument("--tutte", action="store_true")
    p = nuovo("voce", cmd_voce)
    p.add_argument("pagina")
    p.add_argument("--nav", choices=["true", "false"])
    p.add_argument("--ordine")
    p.add_argument("--titolo")
    p = nuovo("figlio", cmd_figlio)
    p.add_argument("padre")
    p.add_argument("--titolo", required=True)
    p.add_argument("--permalink", required=True)
    p.add_argument("--dopo")
    p.add_argument("--divider", action="store_true", help="metti una riga divisoria prima della nuova voce")
    p = nuovo("rimuovi-figlio", cmd_rimuovi_figlio)
    p.add_argument("padre")
    p.add_argument("--titolo", required=True)
    p = nuovo("link-aggiungi", cmd_link_aggiungi)
    p.add_argument("--titolo", required=True)
    p.add_argument("--url", required=True)
    p.add_argument("--ordine")
    p.add_argument("--blank", action="store_true")
    p = nuovo("link-rimuovi", cmd_link_rimuovi)
    p.add_argument("--titolo", required=True)
    return ap


def main(argv=None):
    a = costruisci().parse_args(argv)
    sito.principale(lambda: a.fn(a))


if __name__ == "__main__":
    main()
