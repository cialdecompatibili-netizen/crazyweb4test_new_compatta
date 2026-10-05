# -*- coding: utf-8 -*-
"""
servizi.py - servizi del sito (_servizi/): elenca, crea, cambia campi, nascondi/mostra, testo, elimina (cestino).

1. Cosa fa: gestisce i servizi con il motore condiviso common/collezione.py (qui solo la configurazione).
   Come l'admin (> Servizi): il FILE in _servizi/ e' la fonte di verita'. Le card di /servizi/ e della home sono
   cicli Liquid (CLAUDE.md 14): crearli qui basta, non serve toccare altro.
2. Su quale file agisce: _servizi/<slug>.md. Front matter: layout servizio, title, description, gruppo, ordine,
   [sottotitolo], [in_home], [seo_title], [seo_description]. MAI permalink/date/categories (CLAUDE.md 21).
3. Lavora in locale (file + git), niente API GitHub. Solo TEST (la collection non c'e' su PROD).
4. Origine: richiesta del 06/10/2026 (aggiornare spesso i servizi: elencare, creare, modificare).

Uso (scrittura: --sito --dry-run --push --conferma):
  python -m automazioni servizi elenco [--titoli] [--gruppo "Sviluppo web"]
  python -m automazioni servizi crea --titolo "Nome" --gruppo "Sviluppo web" [--descrizione "..."] [--ordine 5]
         [--in-home] [--sottotitolo "..."] [--seo-title "..."] [--seo-description "..."]
         [--slug nome] [--testo-file corpo.md | --testo "..."] [--nascosto]
  python -m automazioni servizi campo <slug> description="nuova" ordine=3 in_home=true [--rimuovi in_home]
  python -m automazioni servizi nascondi <slug>  |  mostra <slug>  |  testo <slug> --testo-file corpo.md
  python -m automazioni servizi elimina <slug> [--si]     (senza --si: solo anteprima; con --si va nel cestino)

PUNTI CRITICI:
- `gruppo` e `ordine` decidono dove sta il servizio in /servizi/: senza, finisce in "Altri servizi" (non si tolgono).
  Se non dai --ordine, va in fondo al suo gruppo.
- Se lo slug e' anche in servizi_data.py, rilanciare `genera_servizi.py`/`pubblica_servizi.py` per quello slug
  RISCRIVE testo, titolo e descrizione dal file dati (gruppo, ordine, in_home e SEO restano): lo script avvisa.
- Il testo dei 69 servizi attuali e' quasi identico (contenuto debole per Google): meglio testi diversi per ognuno.
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from automazioni.common import collezione, sito  # noqa: E402

RE_SLUG_DATI = re.compile(r"""["']slug["']\s*:\s*["']([a-z0-9-]+)["']""")


def _prossimo_ordine(base, gruppo):
    """Ultimo `ordine` del gruppo + 1 (nuovo servizio in fondo al suo gruppo)."""
    massimo = 0
    for f in (base / "_servizi").glob("*.md"):
        try:
            d = f.read_bytes()
            if sito.fm_leggi(d, "gruppo") == gruppo:
                o = sito.fm_leggi(d, "ordine")
                massimo = max(massimo, int(float(o))) if o not in (None, "") else massimo
        except (sito.Errore, ValueError):
            continue
    return massimo + 1


def _front_matter(cfg, a, titolo, data, slug):
    base = sito.trova_sito(a.sito)
    ordine = a.ordine if a.ordine is not None else _prossimo_ordine(base, a.categoria)
    righe = ["layout: servizio", "title: " + sito.yq(titolo)]
    if getattr(a, "descrizione", None):
        righe.append("description: " + sito.yq(a.descrizione))
    righe += ["gruppo: " + sito.yq(a.categoria), f"ordine: {ordine}"]
    if a.sottotitolo:
        righe.append("sottotitolo: " + sito.yq(a.sottotitolo))
    if a.in_home:
        righe.append("in_home: true")
    if a.seo_title:
        righe.append("seo_title: " + sito.yq(a.seo_title))
    if a.seo_description:
        righe.append("seo_description: " + sito.yq(a.seo_description))
    return righe


def _avviso(base, slug, chiavi):
    dati = base / "servizi_data.py"
    if not dati.is_file() or not ({"testo", "title", "description"} & set(chiavi)):
        return None
    if slug in RE_SLUG_DATI.findall(dati.read_text(encoding="utf-8")):
        return (f"'{slug}' e' anche in servizi_data.py: rilanciando genera_servizi.py/pubblica_servizi.py per questo "
                "slug testo, titolo e descrizione tornano a quelli del file dati. Aggiorna anche li' o non rilanciarlo")
    return None


CFG = dict(nome="servizi", descr=__doc__.split("\n")[1], cartella="_servizi", layout="servizio", costruisci=_front_matter,
           categoria="gruppo", flag_categoria="gruppo", categoria_default="Altri servizi",
           categoria_re=re.compile(r"^[^\r\n\"#:]+$"), rifiutate_extra={"categories"}, avviso=_avviso,
           campi_testo={"title", "description", "gruppo", "sottotitolo", "seo_title", "seo_description"},
           non_togliere={"title", "gruppo", "ordine"},
           opzioni=[("--ordine", dict(type=int)), ("--in-home", dict(action="store_true")),
                    ("--sottotitolo", {}), ("--seo-title", {}), ("--seo-description", {})])


def main(argv=None):
    collezione.main(CFG, argv)


if __name__ == "__main__":
    main()
