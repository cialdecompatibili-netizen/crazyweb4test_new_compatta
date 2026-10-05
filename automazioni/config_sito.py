# -*- coding: utf-8 -*-
"""
config_sito.py - impostazioni di _config.yml: titolo, motto, lingua, footer, favicon, articoli per pagina...

1. Cosa fa: legge e cambia le chiavi di _config.yml elencate qui sotto (SOLO quelle: lista bianca).
2. Su quale file agisce: _config.yml (solo la riga della chiave, commento a fine riga compreso lasciato com'era).
3. Lavora in locale (file + git), niente API GitHub.
4. Origine: richiesta del 05/10/2026 (automatizzare footer e impostazioni).

Uso:
  python -m automazioni.config_sito leggi [chiave ...]
  python -m automazioni.config_sito imposta title="Il mio sito" lang=it pagination.per_page=10 [--dry-run] [--push]
  python -m automazioni.config_sito imposta --vuoto impressum_path

CHIAVI AMMESSE: title (blank = automatico dal baseurl), description, lang, icon, footer_text, footer_fixed,
last_updated, impressum_path, home_marte, pagination.per_page (5/10/20/50/100), contatti.captcha (turnstile/altcha).

PUNTI CRITICI:
- url e baseurl sono RIFIUTATI: sono automatici (deploy.yml li ricava dal repo, CLAUDE.md punto 19).
- Una stringa vuota "" in Liquid e' VERA: per spegnere impressum_path usa --vuoto (scrive `impressum_path:`).
- Un blocco `>` (come footer_text e description) viene sostituito da UNA riga tra virgolette: stesso risultato.
- La chiave deve gia' esistere nel config: se manca non la creo (l'admin non la ricrea).
"""
import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from automazioni.common import sito  # noqa: E402
from automazioni.common.sito import Errore  # noqa: E402

# CRITICO: lista BIANCA: una chiave che non e' qui non si tocca (evita refusi che rompono il config).
PERMESSE = ["title", "description", "lang", "icon", "footer_text", "footer_fixed", "last_updated",
            "impressum_path", "home_marte", "pagination.per_page", "contatti.captcha"]
BOOLEANE = {"footer_fixed", "last_updated", "home_marte"}
VIETATE = {"url", "baseurl"}


def _valida(chiave, valore):
    # CRITICO (CLAUDE.md 19): url/baseurl sono AUTOMATICI (deploy.yml li ricava dal repo): toccarli rompe asset e link.
    if chiave in VIETATE:
        raise Errore(f"'{chiave}' e' automatico (deploy.yml): non si cambia da qui")
    if chiave not in PERMESSE:
        raise Errore(f"chiave non ammessa: {chiave}. Ammesse: {', '.join(PERMESSE)}")
    if valore is None:
        return
    if chiave in BOOLEANE and not isinstance(valore, bool):
        raise Errore(f"{chiave}: serve true oppure false")
    if chiave == "lang" and not re.match(r"^[a-z]{2}(-[A-Za-z]{2})?$", str(valore)):
        raise Errore("lang: codice lingua come 'it' o 'pt-BR'")
    if chiave == "pagination.per_page" and valore not in (5, 10, 20, 50, 100):
        raise Errore("pagination.per_page: 5, 10, 20, 50 o 100")
    if chiave == "contatti.captcha" and valore not in ("turnstile", "altcha"):
        raise Errore("contatti.captcha: turnstile oppure altcha")
    if chiave == "impressum_path" and not str(valore).startswith("/"):
        raise Errore("impressum_path: percorso che inizia con / (come il permalink della pagina)")
    if chiave in ("title", "footer_text", "description", "icon") and not str(valore).strip():
        raise Errore(f"{chiave}: valore vuoto non ammesso (per title usa 'blank')")


def imposta_config(dati, chiave, valore):
    """(nuovi_dati, esito) per una chiave ammessa, anche annidata (a.b)."""
    _valida(chiave, valore)
    righe = sito.righe_di(dati)
    n = len(righe)
    if "." in chiave:
        padre, _, figlio = chiave.partition(".")
        i = sito.trova_chiave(righe, padre, 0, n)
        if i is None:
            raise Errore(f"chiave '{padre}' non presente nel config")
        esito = sito.imposta_riga(righe, figlio, valore, i + 1, sito.fine_blocco(righe, i, n), False, annidata=True)
    else:
        # CRITICO: crea=False: una chiave mancante NON viene creata (l'admin non la ricrea).
        esito = sito.imposta_riga(righe, chiave, valore, 0, n, False)
    return sito.unisci(righe), esito


def leggi_config(dati, chiave):
    righe = sito.righe_di(dati)
    n = len(righe)
    if "." in chiave:
        padre, _, figlio = chiave.partition(".")
        i = sito.trova_chiave(righe, padre, 0, n)
        return None if i is None else sito.leggi_valore(righe, figlio, i + 1, sito.fine_blocco(righe, i, n), True)
    return sito.leggi_valore(righe, chiave, 0, n)


def cambia(base, args, coppie, messaggio):
    """coppie: [(chiave, valore|None)]. Scrive _config.yml (o mostra con --dry-run)."""
    originale = (base / "_config.yml").read_bytes()
    dati = originale
    for k, v in coppie:
        dati, _ = imposta_config(dati, k, v)
    cambi = {"_config.yml": dati} if dati != originale else {}
    sito.applica(base, args, cambi, ["_config.yml"], messaggio)


def cmd_leggi(a):
    base = sito.trova_sito(a.sito)
    dati = (base / "_config.yml").read_bytes()
    for k in a.chiavi or PERMESSE:
        if k in VIETATE:
            raise Errore(f"'{k}' non si gestisce da qui")
        v = leggi_config(dati, k)
        testo = "(chiave assente)" if v is None else (v if len(v) < 90 else v[:87] + "...")
        print(f"  {k:<22} {testo}")


def cmd_imposta(a):
    base = sito.prepara(a)
    coppie = []
    for c in a.coppie:
        if "=" not in c:
            raise Errore(f"'{c}': usa chiave=valore")
        k, _, v = c.partition("=")
        k = k.strip()
        # chiavi di testo: restano testo anche se sembrano numeri o true/false
        coppie.append((k, v if k in ("title", "description", "footer_text", "icon") else sito.valore_cli(v)))
    # CRITICO: --vuoto scrive `chiave:` (falsa in Liquid). Una stringa vuota "" e' VERA e lascerebbe l'elemento acceso.
    coppie += [(k, None) for k in a.vuoto or []]
    if not coppie:
        raise Errore("niente da fare: passa chiave=valore oppure --vuoto chiave")
    cambia(base, a, coppie, "config: " + ", ".join(k for k, _ in coppie))


def costruisci():
    ap = argparse.ArgumentParser(prog="config_sito", formatter_class=argparse.RawDescriptionHelpFormatter, description=__doc__.split("\n")[1])
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("leggi")
    p.add_argument("--sito")
    p.add_argument("chiavi", nargs="*")
    p.set_defaults(fn=cmd_leggi)
    p = sp.add_parser("imposta")
    sito.argomenti_comuni(p)
    p.add_argument("coppie", nargs="*", help="chiave=valore")
    p.add_argument("--vuoto", action="append", help="svuota la chiave (ripetibile)")
    p.set_defaults(fn=cmd_imposta)
    return ap


def main(argv=None):
    a = costruisci().parse_args(argv)
    sito.principale(lambda: a.fn(a))


if __name__ == "__main__":
    main()
