# -*- coding: utf-8 -*-
"""
pagine.py - contenuto delle pagine: front matter, righe di testo, e interi testi da file JSON (home dei cloni).

1. Cosa fa: legge/elenca le pagine, imposta o toglie campi del front matter (title, seo_title, seo_description,
   nav, ...), e applica un file JSON di testi: cambia SOLO le righe indicate di una pagina (es. la home).
2. Su quale file agisce: _pages/<pagina>.md (qualsiasi). Non tocca CSS/JS/Liquid/Marte: cambia solo le righe
   che il JSON nomina (inizio riga) e i campi del front matter che il JSON elenca.
3. Lavora in locale (file + git), niente API GitHub.
4. Origine: richiesta del 05/10/2026. SOSTITUISCE aggiorna_home_nicchie.py (aveva i siti scritti nel codice,
   contro la regola 'ZERO hardcoded' di CLAUDE.md): i testi dei 3 cloni ora stanno in automazioni/testi/*.json.

Uso (dalla cartella del sito; i comandi di scrittura accettano --sito --dry-run --push --conferma):
  python -m automazioni.pagine elenco
  python -m automazioni.pagine leggi home
  python -m automazioni.pagine imposta home seo_title="{title} | Mia nicchia" nav=true
  python -m automazioni.pagine imposta home --rimuovi nav_order
  python -m automazioni.pagine testi automazioni/testi/home_trasporticorp.json [--sito trasporticorp] [--push]

FORMATO DEL JSON (un file = un sito, una o piu' pagine):
  {"sito": "trasporticorp",                       <- cartella accanto a questo sito (--sito ha la precedenza)
   "pagine": [{"pagina": "_pages/home.md",
               "front": {"seo_title": "{title} | ...", "seo_description": "..."},
               "righe": [{"inizia_con": ["## Web Agency", "## Trasporti"], "nuova": "## Nuovo titolo"}]}]}
- "inizia_con": inizio (o inizi alternativi) della riga da sostituire. Deve trovare UNA sola riga,
  altrimenti si ferma e non scrive niente. Se la riga e' gia' uguale a "nuova" la salta (idempotente).
- "nuova": testo su UNA riga. Gli a-capo (CRLF) di ogni riga restano com'erano.
- Un testo gia' aggiornato si ritrova comunque: la riga uguale a "nuova" conta come trovata.
PUNTO CRITICO: se per "inizia_con" metti un prefisso troppo corto (es. "## ") trova piu' righe e si ferma:
scegli le prime parole del testo ATTUALE.
"""
import argparse
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from automazioni.common import sito  # noqa: E402
from automazioni.common.sito import Errore  # noqa: E402


def riga_corpo_sostituisci(righe, inizio_corpo, prefissi, nuova):
    """Sostituisce in place UNA riga del corpo. Ritorna 'cambiata' o 'gia'."""
    # CRITICO: 'nuova' su UNA riga: a-capo dentro sposterebbero le righe e il CRLF per riga non sarebbe piu' valido.
    if "\n" in nuova or "\r" in nuova:
        raise Errore("'nuova' deve stare su una sola riga")
    nb = nuova.encode("utf-8")
    pb = [p.encode("utf-8") for p in prefissi]
    cand = []
    for i in range(inizio_corpo, len(righe)):
        r = righe[i].rstrip(b"\r")
        if r == nb or any(r.startswith(p) for p in pb):
            cand.append(i)
    # CRITICO: la regola deve trovare ESATTAMENTE una riga, altrimenti non si scrive niente. Un prefisso troppo
    # corto trova piu' righe: senza questo controllo si sovrascriverebbero CSS/JS/Liquid/Marte del corpo.
    if len(cand) != 1:
        raise Errore(f"{prefissi!r}: trovate {len(cand)} righe (atteso 1)")
    i = cand[0]
    if righe[i].rstrip(b"\r") == nb:
        return "gia"
    righe[i] = nb + (b"\r" if righe[i].endswith(b"\r") else b"")
    return "cambiata"


def _prefissi(regola):
    p = regola.get("inizia_con")
    if isinstance(p, str):
        p = [p]
    if not p or not all(isinstance(x, str) and x for x in p) or "nuova" not in regola:
        raise Errore(f"regola non valida (servono 'inizia_con' e 'nuova'): {regola!r}")
    return p


def applica_pagina(base, descr, correnti):
    """Applica una voce 'pagine' del JSON. correnti: {rel: bytes} aggiornato in place. Ritorna (rel, n_righe_cambiate)."""
    rel = sito.risolvi_file(base, descr["pagina"])
    dati = correnti.get(rel) or (base / rel).read_bytes()
    n = 0
    for k, v in (descr.get("front") or {}).items():
        dati, esito = sito.fm_imposta(dati, k, v)
        n += esito != "gia"
    righe = sito.righe_di(dati)
    ini = sito.fm_fine(righe) + 1
    for regola in descr.get("righe") or []:
        n += riga_corpo_sostituisci(righe, ini, _prefissi(regola), regola["nuova"]) == "cambiata"
    correnti[rel] = sito.unisci(righe)
    return rel, n


def cmd_elenco(a):
    base = sito.trova_sito(a.sito)
    for f in sorted((base / "_pages").glob("*.md")):
        try:
            d = f.read_bytes()
            t, p = sito.fm_leggi(d, "title"), sito.fm_leggi(d, "permalink")
        except Errore:
            t = p = "(senza front matter)"
        print(f"  {f.name:<24} {t or '':<22} {p or ''}")


def cmd_leggi(a):
    base = sito.trova_sito(a.sito)
    rel = sito.risolvi_file(base, a.pagina)
    righe = sito.righe_di((base / rel).read_bytes())
    fine = sito.fm_fine(righe)
    print(f"{rel}: front matter ({fine - 1} righe), corpo {len(righe) - fine - 1} righe")
    for r in righe[1:fine]:
        print("  " + r.rstrip(b"\r").decode("utf-8")[:150])


def cmd_imposta(a):
    base = sito.prepara(a)
    rel = sito.risolvi_file(base, a.pagina)
    originale = (base / rel).read_bytes()
    dati = originale
    for coppia in a.coppie:
        if "=" not in coppia:
            raise Errore(f"'{coppia}': usa chiave=valore")
        k, _, v = coppia.partition("=")
        # CRITICO: cambiare il permalink cambia l'URL e i vecchi indirizzi NON reindirizzano.
        if k == "permalink":
            print("ATTENZIONE: cambi il permalink di una pagina: i vecchi indirizzi non reindirizzano")
        dati, _ = sito.fm_imposta(dati, k.strip(), sito.valore_cli(v))
    for k in a.rimuovi or []:
        dati, _ = sito.fm_rimuovi(dati, k)
    cambi = {rel: dati} if dati != originale else {}
    sito.applica(base, a, cambi, [rel], f"pagine: {a.pagina}")


def cmd_testi(a):
    for percorso in a.json:
        f = pathlib.Path(percorso)
        if not f.is_file():
            raise Errore(f"file JSON non trovato: {percorso}")
        try:
            descr = json.loads(f.read_text(encoding="utf-8-sig"))
        except ValueError as e:
            raise Errore(f"{percorso}: JSON non valido ({e})")
        base = sito.prepara(a, descr.get("sito"))
        correnti, conteggio = {}, 0
        for pag in descr.get("pagine") or []:
            rel, n = applica_pagina(base, pag, correnti)
            conteggio += n
        # CRITICO: se una regola fallisce l'errore arriva PRIMA di questo punto: nessun file viene scritto a meta'.
        cambi = {rel: d for rel, d in correnti.items() if d != (base / rel).read_bytes()}
        print(f"[{base.name}] {f.name}: {conteggio} modifiche")
        sito.applica(base, a, cambi, list(correnti), f"pagine: testi da {f.name}")


def costruisci():
    ap = argparse.ArgumentParser(prog="pagine", formatter_class=argparse.RawDescriptionHelpFormatter, description=__doc__.split("\n")[1])
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("elenco")
    p.add_argument("--sito")
    p.set_defaults(fn=cmd_elenco)
    p = sp.add_parser("leggi")
    p.add_argument("pagina")
    p.add_argument("--sito")
    p.set_defaults(fn=cmd_leggi)
    p = sp.add_parser("imposta")
    sito.argomenti_comuni(p)
    p.add_argument("pagina")
    p.add_argument("coppie", nargs="*", help="chiave=valore")
    p.add_argument("--rimuovi", action="append", help="chiave da togliere (ripetibile)")
    p.set_defaults(fn=cmd_imposta)
    p = sp.add_parser("testi")
    sito.argomenti_comuni(p)
    p.add_argument("json", nargs="+")
    p.set_defaults(fn=cmd_testi)
    return ap


def main(argv=None):
    a = costruisci().parse_args(argv)
    sito.principale(lambda: a.fn(a))


if __name__ == "__main__":
    main()
