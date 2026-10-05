# -*- coding: utf-8 -*-
"""
news.py - annunci brevi (_news/): elenca, crea, cambia campi, nascondi/mostra, testo, elimina.

1. Cosa fa: gestisce le news (annunci inline, senza titolo) con il motore condiviso common/collezione.py.
2. Su quale file agisce: _news/<slug>.md (front matter: layout post, date, inline, related_posts). Lo slug, se non
   lo dai, e' ricavato dall'inizio del testo.
3. Lavora in locale (file + git), niente API GitHub.
4. Origine: richiesta del 06/10/2026.

Uso (scrittura: --sito --dry-run --push --conferma):
  python -m automazioni.news elenco
  python -m automazioni.news crea --testo "Testo dell'annuncio" [--data "2026-10-06 09:00"] [--slug mio-slug] [--nascosto]
  python -m automazioni.news campo <slug> inline=true [--rimuovi chiave]
  python -m automazioni.news nascondi <slug>  |  mostra <slug>  |  testo <slug> --testo "nuovo testo"
  python -m automazioni.news elimina <slug> [--si]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from automazioni.common import collezione  # noqa: E402


def _front_matter(cfg, a, titolo, data, slug):
    return ["layout: post", "date: " + data, "inline: true", "related_posts: false"]


CFG = dict(nome="news", descr=__doc__.split("\n")[1], cartella="_news", layout="post", costruisci=_front_matter,
           usa_data=True, titolo=None, descrizione=False, campi_testo=set(), non_togliere=set())


def main(argv=None):
    collezione.main(CFG, argv)


if __name__ == "__main__":
    main()
