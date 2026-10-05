# -*- coding: utf-8 -*-
"""
footer.py - il footer del sito (testo, fisso in basso, "ultimo aggiornamento", link note legali).

1. Cosa fa: cambia le 4 impostazioni che comandano il footer: footer_text, footer_fixed, last_updated,
   impressum_path.
2. Su quale file agisce: _config.yml (tramite config_sito.py). NON modifica _includes/footer.liquid: e' un
   override locale con bottoni flottanti e commenti storici, e AGENTS.md vieta di toccare _includes/ in questo repo.
3. Lavora in locale (file + git), niente API GitHub.
4. Origine: richiesta del 05/10/2026. (Il README parlava di footer.liquid; in realta' il testo del footer
   viene da footer_text del config, per questo il modulo lavora li'.)

Il footer mostra: (c) Copyright <anno> <titolo sito>. <footer_text> [Note legali] [Ultimo aggiornamento: data].

Uso (accetta --sito --dry-run --push --conferma):
  python -m automazioni.footer leggi
  python -m automazioni.footer testo "Tutti i diritti riservati. P.IVA 0000000"
  python -m automazioni.footer fisso on|off          (footer incollato in basso alla finestra)
  python -m automazioni.footer aggiornamento on|off  (riga 'Ultimo aggiornamento')
  python -m automazioni.footer note-legali /note-legali/   |   note-legali --nessuna

PUNTO CRITICO: per togliere il link Note legali serve `--nessuna` (chiave vuota). Una stringa vuota in Liquid
e' vera e il link resterebbe. Non scrivere telefoni, indirizzi o P.IVA inventati: solo dati reali.
"""
import argparse
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from automazioni import config_sito  # noqa: E402
from automazioni.common import sito  # noqa: E402
from automazioni.common.sito import Errore  # noqa: E402

CHIAVI = ["footer_text", "footer_fixed", "last_updated", "impressum_path"]


def cmd_leggi(a):
    base = sito.trova_sito(a.sito)
    dati = (base / "_config.yml").read_bytes()
    for k in CHIAVI:
        v = config_sito.leggi_config(dati, k)
        print(f"  {k:<16} {'(vuoto)' if v in (None, '') else v}")


def cmd_testo(a):
    base = sito.prepara(a)
    # CRITICO: niente telefoni, indirizzi o P.IVA inventati: solo dati reali. Il footer NON si cambia in
    # _includes/footer.liquid (vietato da AGENTS.md): si cambia solo footer_text di _config.yml.
    if not a.testo.strip():
        raise Errore("testo vuoto")
    config_sito.cambia(base, a, [("footer_text", a.testo)], "footer: testo")


def _onoff(chiave, etichetta):
    def cmd(a):
        base = sito.prepara(a)
        config_sito.cambia(base, a, [(chiave, a.stato == "on")], f"footer: {etichetta} {a.stato}")
    return cmd


def cmd_note_legali(a):
    base = sito.prepara(a)
    if a.nessuna == bool(a.percorso):
        raise Errore("usa un percorso (es. /note-legali/) OPPURE --nessuna")
    # CRITICO: None = chiave vuota (falsa in Liquid: il link sparisce). Una stringa vuota sarebbe VERA e il link resterebbe.
    coppia = ("impressum_path", None if a.nessuna else a.percorso)
    config_sito.cambia(base, a, [coppia], "footer: note legali")


def costruisci():
    ap = argparse.ArgumentParser(prog="footer", formatter_class=argparse.RawDescriptionHelpFormatter, description=__doc__.split("\n")[1])
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("leggi")
    p.add_argument("--sito")
    p.set_defaults(fn=cmd_leggi)
    p = sp.add_parser("testo")
    sito.argomenti_comuni(p)
    p.add_argument("testo")
    p.set_defaults(fn=cmd_testo)
    for nome, chiave, et in (("fisso", "footer_fixed", "fisso"), ("aggiornamento", "last_updated", "aggiornamento")):
        p = sp.add_parser(nome)
        sito.argomenti_comuni(p)
        p.add_argument("stato", choices=["on", "off"])
        p.set_defaults(fn=_onoff(chiave, et))
    p = sp.add_parser("note-legali")
    sito.argomenti_comuni(p)
    p.add_argument("percorso", nargs="?")
    p.add_argument("--nessuna", action="store_true")
    p.set_defaults(fn=cmd_note_legali)
    return ap


def main(argv=None):
    a = costruisci().parse_args(argv)
    sito.principale(lambda: a.fn(a))


if __name__ == "__main__":
    main()
