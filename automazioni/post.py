# -*- coding: utf-8 -*-
"""
post.py - articoli del blog (_posts/): elenca, crea, cambia campi, nascondi/mostra, sostituisci il testo, elimina.

1. Cosa fa: gestisce i post del blog con lo stile gia' validato (front matter come quelli creati dall'admin).
   Il codice e' nel motore condiviso common/collezione.py: qui c'e' solo la configurazione dei post.
2. Su quale file agisce: _posts/AAAA-MM-GG-<slug>.md. NON gestisce i SERVIZI (collection _servizi/): quelli si
   pubblicano SOLO con `python pubblica_servizi.py` (CLAUDE.md). Non crea mai `permalink:`.
3. Lavora in locale (file + git), niente API GitHub.
4. Origine: richiesta del 05/10/2026 (automatizzare articoli); spostato sul motore condiviso il 06/10/2026.

Uso (i comandi di scrittura accettano --sito --dry-run --push --conferma):
  python -m automazioni.post elenco [--categoria nome]
  python -m automazioni.post crea --titolo "Titolo" --categoria seo [--descrizione "..."] [--data "2026-10-05 09:30"]
         [--slug mio-slug] [--thumbnail assets/img/foto.png] [--testo-file corpo.md | --testo "riga"] [--nascosto]
  python -m automazioni.post campo <slug> description="nuovo" thumbnail=assets/img/x.png [--rimuovi chiave]
  python -m automazioni.post nascondi <slug>   |   python -m automazioni.post mostra <slug>
  python -m automazioni.post testo <slug> --testo-file corpo.md
  python -m automazioni.post elimina <slug> [--si]      (senza --si: solo anteprima)

Regole (CLAUDE.md punti 3, 6, 11, 23, 28): vedi common/collezione.py. Cambiare categoria cambia l'URL e i vecchi
indirizzi NON reindirizzano.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from automazioni.common import collezione, sito  # noqa: E402


def _front_matter(cfg, a, titolo, data, slug):
    righe = ["layout: post", "title: " + sito.yq(titolo), "date: " + data]
    if getattr(a, "descrizione", None):
        righe.append("description: " + sito.yq(a.descrizione))
    righe += ["categories: " + a.categoria, "toc:", "  beginning: true"]
    if getattr(a, "thumbnail", None):
        righe.append("thumbnail: " + sito.yq(a.thumbnail))
    return righe


CFG = dict(nome="post", descr=__doc__.split("\n")[1], cartella="_posts", layout="post", costruisci=_front_matter,
           data_nel_nome=True, usa_data=True, categoria="categories", categoria_default="senza-categoria",
           categoria_cambia_url=True, img_key="thumbnail", campi_testo={"title", "description", "thumbnail"})


def main(argv=None):
    collezione.main(CFG, argv)


if __name__ == "__main__":
    main()
