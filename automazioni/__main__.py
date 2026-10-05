# -*- coding: utf-8 -*-
"""
automazioni - script Python per gestire i siti Jekyll di questo progetto.

Uso:  python -m automazioni <modulo> <comando> [opzioni]
      (oppure direttamente: python -m automazioni.menu elenco)

Moduli: menu, pagine, footer, config_sito, post, progetti, news, servizi.   Dettagli: automazioni/README.md
"""
import importlib
import sys

MODULI = {
    "menu": "voci, tendine, divider, voci-link",
    "pagine": "front matter e testi delle pagine (home dei cloni da JSON)",
    "footer": "testo, footer fisso, ultimo aggiornamento, note legali",
    "config_sito": "titolo, lingua, favicon, articoli per pagina, ...",
    "post": "articoli del blog",
    "progetti": "progetti del portfolio (_projects/)",
    "news": "annunci brevi (_news/)",
    "servizi": "elenco servizi (solo lettura)",
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in MODULI:
        print("Uso: python -m automazioni <modulo> <comando> [opzioni]  (aggiungi -h per l'aiuto)")
        for nome, descr in MODULI.items():
            print(f"  {nome:<12} {descr}")
        sys.exit(0 if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help") else 1)
    importlib.import_module(f"automazioni.{sys.argv[1]}").main(sys.argv[2:])


if __name__ == "__main__":
    main()
