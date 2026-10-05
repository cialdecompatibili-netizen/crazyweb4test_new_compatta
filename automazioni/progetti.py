# -*- coding: utf-8 -*-
"""
progetti.py - progetti del portfolio (_projects/): elenca, crea, cambia campi, nascondi/mostra, testo, elimina.

1. Cosa fa: gestisce i progetti con il motore condiviso common/collezione.py (qui solo la configurazione).
2. Su quale file agisce: _projects/<slug>.md (front matter: layout page, title, description, img, importance,
   category, in_home). Non crea mai `permalink:`.
3. Lavora in locale (file + git), niente API GitHub.
4. Origine: richiesta del 06/10/2026.

Uso (scrittura: --sito --dry-run --push --conferma):
  python -m automazioni.progetti elenco [--categoria work]
  python -m automazioni.progetti crea --titolo "Nome" [--descrizione "..."] [--img assets/img/x.jpg]
         [--importanza 1] [--categoria work] [--in-home] [--slug nome] [--testo-file corpo.md] [--nascosto]
  python -m automazioni.progetti campo <slug> importance=2 in_home=true img=assets/img/y.jpg [--rimuovi chiave]
  python -m automazioni.progetti nascondi <slug>  |  mostra <slug>  |  testo <slug> --testo-file corpo.md
  python -m automazioni.progetti elimina <slug> [--si]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from automazioni.common import collezione, sito  # noqa: E402


def _front_matter(cfg, a, titolo, data, slug):
    righe = ["layout: page", "title: " + sito.yq(titolo)]
    if getattr(a, "descrizione", None):
        righe.append("description: " + sito.yq(a.descrizione))
    if getattr(a, "img", None):
        righe.append("img: " + sito.yq(a.img))
    righe += [f"importance: {a.importanza}", "category: " + a.categoria]
    if a.in_home:
        righe.append("in_home: true")
    return righe


CFG = dict(nome="progetti", descr=__doc__.split("\n")[1], cartella="_projects", layout="page", costruisci=_front_matter,
           categoria="category", categoria_default="work", img_key="img",
           campi_testo={"title", "description", "img", "category"},
           opzioni=[("--importanza", dict(type=int, default=1)), ("--in-home", dict(action="store_true"))])


def main(argv=None):
    collezione.main(CFG, argv)


if __name__ == "__main__":
    main()
