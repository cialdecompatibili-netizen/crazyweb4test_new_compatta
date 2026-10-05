# -*- coding: utf-8 -*-
"""
common/collezione.py - MOTORE CONDIVISO per le raccolte di contenuti (post, progetti, news, servizi...).

1. Cosa fa: implementa UNA volta sola i comandi elenco, crea, campo, nascondi, mostra, testo, elimina.
   Ogni raccolta e' un piccolo file (post.py, progetti.py, news.py, servizi.py) che passa SOLO una configurazione
   (cartella, layout, campi, come si costruisce il front matter). Per una raccolta nuova: ~25 righe, niente copia-incolla.
2. Su quale file agisce: <cartella>/*.md del sito indicato con --sito (default: questo sito; funziona su ogni clone).
3. Lavora in locale (file + git), niente API GitHub.
4. Origine: richiesta del 06/10/2026 (progetti, news, servizi + 'codice condiviso, il grosso lo fa Python').

CONFIGURAZIONE (dict passato a main(); i valori mancanti prendono DEFAULT):
  nome, descr, cartella, layout, costruisci(cfg, a, titolo, data, slug) -> righe di front matter (senza ---)
  data_nel_nome  il file e' AAAA-MM-GG-slug.md (post) invece di slug.md
  usa_data       la raccolta ha il campo date (post, news)
  titolo         'richiesto' | 'opzionale' | None (news non hanno titolo)
  categoria      nome del campo categoria nel front matter (categories / category) o None
  categoria_re / categoria_default / categoria_cambia_url
  img_key        campo immagine (thumbnail / img) o None;  descrizione True/False
  campi_testo    campi che restano TESTO (mai numeri/bool)
  non_togliere   campi che `campo --rimuovi` rifiuta;  opzioni [(flag, kwargs)] per `crea`
  solo_lettura   True = solo `elenco` (servizi: si pubblicano con pubblica_servizi.py)

PUNTI CRITICI (CLAUDE.md punti 3, 6, 11, 23, 28):
- Il testo passato con --testo-file e' SOLO il corpo, senza front matter.
- MAI `permalink:`, `slug:`, `slug_precedenti:`, `layout:` e `date:` da `campo`: i primi cambiano l'URL senza redirect
  (li gestisce l'admin), `date` va scritta senza virgolette e senza fuso (CLAUDE.md, admin 0c) e yq() la quoterebbe.
- Lo slug deve essere unico nella raccolta: due pagine sullo stesso URL = Jekyll ne tiene una, senza errore.
- Nascondi = `published: false` (non `draft`): sparisce da URL, sitemap, elenchi e ricerca.
- elimina chiede `--si`: senza, mostra cosa toglierebbe e basta. Il checkpoint-AAAA-MM-GG permette di tornare indietro.
- File nuovi con gli a-capo del sito (CRLF se _config.yml e' CRLF), UTF-8 senza BOM. Date senza fuso: Jekyll usa
  timezone: Europe/Rome da _config.yml; un contenuto con data futura non esce (ma `future: true` lo permette).
"""
import argparse
import datetime
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from automazioni.common import sito  # noqa: E402
from automazioni.common.sito import Errore  # noqa: E402

# CRITICO (CLAUDE.md 3, 6, 11): questi campi NON si cambiano da `campo`. permalink/slug/slug_precedenti cambiano l'URL
# senza redirect (li gestisce l'admin); layout rompe la pagina; date va scritta senza virgolette/fuso e yq() la quoterebbe.
RIFIUTATE = {"permalink", "slug", "slug_precedenti", "layout", "date"}
RE_DATA = re.compile(r"^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$")
RE_SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
RE_PREFISSO_DATA = re.compile(r"^\d{4}-\d{2}-\d{2}-")
# CRITICO: stessa mappa di `SUB` in admin/admin-cestino.js. L'admin ripristina dal cestino cercando
# _cestino/<sotto>/<AAAAMMGGHHMM>__<nome>: formato e nomi NON si cambiano da una parte sola.
CESTINO = {"_posts": "posts", "_projects": "projects", "_servizi": "servizi", "_news": "news", "_pages": "pages"}
DEFAULT = dict(rifiutate_extra=set(), flag_categoria="categoria", avviso=None, data_nel_nome=False, usa_data=False, titolo="richiesto", categoria=None, categoria_default=None,
               categoria_re=RE_SLUG, categoria_cambia_url=False, img_key=None, descrizione=True,
               campi_testo={"title", "description"}, non_togliere={"title"}, opzioni=[], solo_lettura=False)


def _slug_file(cfg, nome):
    s = pathlib.Path(nome).stem
    return RE_PREFISSO_DATA.sub("", s) if cfg["data_nel_nome"] else s


def _lista(base, cfg):
    return sorted((base / cfg["cartella"]).glob("*.md"))


def trova(base, cfg, ident):
    """slug | nome file | percorso -> percorso relativo POSIX del file (deve essere uno solo)."""
    ident = ident.replace("\\", "/").split("/")[-1]
    cand = [f for f in _lista(base, cfg) if ident in (f.name, f.stem, _slug_file(cfg, f.name))]
    if len(cand) != 1:
        raise Errore(f"{cfg['nome']} '{ident}': trovati {len(cand)} (atteso 1). Usa lo slug o il nome file esatto")
    return f"{cfg['cartella']}/{cand[0].name}"


def _avvisa(cfg, base, voce, chiavi):
    """Hook opzionale di una raccolta: puo' stampare un ATTENZIONE (es. servizi presenti in servizi_data.py)."""
    if cfg["avviso"]:
        m = cfg["avviso"](base, _slug_file(cfg, voce), chiavi)
        if m:
            print("ATTENZIONE: " + m)


def cmd_elenco(cfg):
    def f(a):
        base = sito.trova_sito(a.sito)
        n = 0
        for file in sorted(_lista(base, cfg), reverse=cfg["data_nel_nome"]):
            try:
                righe = sito.righe_di(file.read_bytes())
                fine = sito.fm_fine(righe)
                leggi = lambda k: sito.leggi_valore(righe, k, 1, fine)  # noqa: E731
                cat = leggi(cfg["categoria"]) if cfg["categoria"] else None
                tit, pub, data = leggi("title"), leggi("published"), (leggi("date") or "")[:10]
            except Errore:
                continue
            if getattr(a, "categoria", None) and (cat or "") != a.categoria:
                continue
            corpo = next((r.rstrip(b"\r").decode("utf-8", "replace").strip() for r in righe[fine + 1:] if r.strip()), "")
            etichetta = (tit or corpo or file.name)[:60]
            n += 1
            if getattr(a, "titoli", False):  # solo i titoli, uno per riga (per elenchi lunghi: meno token)
                print("  " + (tit or corpo or file.name))
                continue
            print(f"  {data:<10} {(cat or '-'):<14} {'NASCOSTO ' if pub == 'false' else ''}{etichetta}  [{_slug_file(cfg, file.name)}]")
        print(f"{n} {cfg['nome']}")
    return f


def cmd_crea(cfg):
    def f(a):
        base = sito.prepara(a)
        corpo = sito.corpo_da_args(a)
        titolo = getattr(a, "titolo", None)
        if not (a.slug or titolo or corpo):
            raise Errore("serve --slug (oppure un titolo o un testo da cui ricavarlo)")
        s = a.slug or sito.slug(titolo or corpo[:40])
        if sito.slug(s) != s:
            raise Errore("slug: solo minuscole, numeri e trattini")
        # CRITICO: slug unico nella raccolta. Due pagine sullo stesso URL = Jekyll ne tiene una, SENZA errore.
        for file in _lista(base, cfg):
            if _slug_file(cfg, file.name) == s:
                raise Errore(f"esiste gia' (slug '{s}'): {file.name}")
        if cfg["categoria"] and not cfg["categoria_re"].match(a.categoria):
            raise Errore("categoria non valida (minuscole, numeri e trattini, es. senza-categoria)")
        data = None
        if cfg["usa_data"]:
            # CRITICO: data senza fuso orario e senza virgolette (Jekyll usa Europe/Rome da _config.yml).
            # Data futura = il contenuto NON esce (salvo `future: true`).
            data = a.data or datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if not RE_DATA.match(data):
                raise Errore("data: formato AAAA-MM-GG oppure 'AAAA-MM-GG HH:MM'")
            data += ":00" if len(data) == 16 else (" 00:00:00" if len(data) == 10 else "")
        img = getattr(a, cfg["img_key"], None) if cfg["img_key"] else None
        if img and not (base / img).is_file():
            print(f"ATTENZIONE: immagine {img} non esiste nel sito")
        # CRITICO: mai `permalink:` nel front matter: in questo sito il permalink sta in _config.yml.
        if not corpo and not a.nascosto:
            print("ATTENZIONE: testo vuoto, la pagina uscira' vuota: aggiungilo con `testo` o crea con --nascosto")
        righe = ["---"] + cfg["costruisci"](cfg, a, titolo, data, s)
        if a.nascosto:
            righe.append("published: false")
        righe += ["---", "", corpo, ""]
        rel = f"{cfg['cartella']}/" + (f"{data[:10]}-{s}.md" if cfg["data_nel_nome"] else f"{s}.md")
        if (base / rel).exists():
            raise Errore(f"{rel} esiste gia'")
        sito.applica(base, a, {rel: sito.con_eol("\n".join(righe), sito.eol_sito(base))}, [rel], f"{cfg['nome']}: {titolo or s}")
    return f


def cmd_campo(cfg):
    def f(a):
        base = sito.prepara(a)
        rel = trova(base, cfg, a.voce)
        originale = (base / rel).read_bytes()
        dati = originale
        coppie = sito.coppie_cli(a.coppie, cfg["campi_testo"])
        _avvisa(cfg, base, a.voce, [k for k, _ in coppie])
        for k, v in coppie:
            if k in RIFIUTATE or k in cfg["rifiutate_extra"]:
                raise Errore(f"'{k}' non si imposta da qui (URL/date): usa l'admin")
            if k == cfg["categoria"]:
                if not cfg["categoria_re"].match(str(v)):
                    raise Errore(f"{k}: valore non valido (una sola categoria, minuscole/numeri/trattini)")
                # CRITICO: nei post la categoria e' nell'URL e i vecchi indirizzi NON reindirizzano.
                if cfg["categoria_cambia_url"]:
                    print("ATTENZIONE: cambiare categoria cambia l'URL e i vecchi indirizzi NON reindirizzano")
            dati, _ = sito.fm_imposta(dati, k, v)
        for k in a.rimuovi or []:
            if k in RIFIUTATE or k in cfg["non_togliere"] or k == cfg["categoria"]:
                raise Errore(f"'{k}' non si toglie")
            dati, _ = sito.fm_rimuovi(dati, k)
        sito.applica(base, a, {rel: dati} if dati != originale else {}, [rel], f"{cfg['nome']}: campi di {a.voce}")
    return f


def cmd_visibilita(cfg, nascondi):
    def f(a):
        base = sito.prepara(a)
        rel = trova(base, cfg, a.voce)
        originale = (base / rel).read_bytes()
        # CRITICO: nascondere = `published: false` (NON `draft`): sparisce da URL, sitemap, elenchi e ricerca.
        dati = sito.fm_imposta(originale, "published", False)[0] if nascondi else sito.fm_rimuovi(originale, "published")[0]
        sito.applica(base, a, {rel: dati} if dati != originale else {}, [rel],
                     f"{cfg['nome']}: {'nascosto' if nascondi else 'mostrato'} {a.voce}")
    return f


def cmd_testo(cfg):
    def f(a):
        base = sito.prepara(a)
        rel = trova(base, cfg, a.voce)
        originale = (base / rel).read_bytes()
        righe = sito.righe_di(originale)
        fine = sito.fm_fine(righe)
        nl = sito.eol(originale)
        corpo = sito.corpo_da_args(a)
        if not corpo:
            raise Errore("testo vuoto: passa --testo-file o --testo")
        _avvisa(cfg, base, a.voce, ["testo"])
        # CRITICO: si riscrive SOLO il corpo; il front matter resta identico, byte per byte (CRLF compresi).
        testa = sito.unisci(righe[:fine + 1])  # gli '\r' sono gia' dentro le righe: non usare nl per unirle
        nuovo = testa + b"\n" + nl + sito.con_eol(corpo, nl) + nl
        sito.applica(base, a, {rel: nuovo} if nuovo != originale else {}, [rel], f"{cfg['nome']}: testo di {a.voce}")
    return f


def cmd_elimina(cfg):
    def f(a):
        base = sito.prepara(a)
        rel = trova(base, cfg, a.voce)
        # CRITICO: eliminare e' irreversibile senza il checkpoint-AAAA-MM-GG (git): senza --si mostra solo l'anteprima.
        if not a.si:  # senza --si: solo anteprima (come --dry-run)
            a.dry_run = True
            print("ANTEPRIMA: per eliminare davvero rilancia con --si")
        # CRITICO: come l'admin, NON si cancella: il file va in _cestino/<tipo>/<AAAAMMGGHHMM>__<nome> (si ripristina
        # dall'admin > Cestino) e _cestino/ deve essere in `exclude` di _config.yml, altrimenti compare nel sito.
        cambi = {rel: None}
        sub = CESTINO.get(cfg["cartella"])
        if sub:
            if b"_cestino" not in (base / "_config.yml").read_bytes():
                raise Errore("_cestino/ non risulta in exclude di _config.yml: i file eliminati comparirebbero nel sito")
            ts = datetime.datetime.now().strftime("%Y%m%d%H%M")
            cambi[f"_cestino/{sub}/{ts}__{pathlib.Path(rel).name}"] = (base / rel).read_bytes()
        sito.applica(base, a, cambi, list(cambi), f"{cfg['nome']}: eliminato {a.voce} (nel cestino)")
    return f


def costruisci_parser(cfg):
    ap = argparse.ArgumentParser(prog=cfg["nome"], formatter_class=argparse.RawDescriptionHelpFormatter, description=cfg["descr"])
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("elenco")
    p.add_argument("--sito")
    p.add_argument("--titoli", action="store_true", help="solo i titoli, uno per riga")
    if cfg["categoria"]:
        p.add_argument("--" + cfg["flag_categoria"], dest="categoria")
    p.set_defaults(fn=cmd_elenco(cfg))
    if cfg["solo_lettura"]:
        return ap

    p = sp.add_parser("crea")
    sito.argomenti_comuni(p)
    if cfg["titolo"]:
        p.add_argument("--titolo", required=cfg["titolo"] == "richiesto")
    p.add_argument("--slug")
    p.add_argument("--testo-file")
    p.add_argument("--testo")
    p.add_argument("--nascosto", action="store_true")
    if cfg["descrizione"]:
        p.add_argument("--descrizione")
    if cfg["usa_data"]:
        p.add_argument("--data")
    if cfg["categoria"]:
        p.add_argument("--" + cfg["flag_categoria"], dest="categoria", default=cfg["categoria_default"])
    if cfg["img_key"]:
        p.add_argument("--" + cfg["img_key"].replace("_", "-"), dest=cfg["img_key"])
    for flag, kw in cfg["opzioni"]:
        p.add_argument(flag, **kw)
    p.set_defaults(fn=cmd_crea(cfg))

    p = sp.add_parser("campo")
    sito.argomenti_comuni(p)
    p.add_argument("voce", help="slug o nome file")
    p.add_argument("coppie", nargs="*", help="chiave=valore")
    p.add_argument("--rimuovi", action="append")
    p.set_defaults(fn=cmd_campo(cfg))

    for nome, nasc in (("nascondi", True), ("mostra", False)):
        p = sp.add_parser(nome)
        sito.argomenti_comuni(p)
        p.add_argument("voce")
        p.set_defaults(fn=cmd_visibilita(cfg, nasc))

    p = sp.add_parser("testo")
    sito.argomenti_comuni(p)
    p.add_argument("voce")
    p.add_argument("--testo-file")
    p.add_argument("--testo")
    p.set_defaults(fn=cmd_testo(cfg))

    p = sp.add_parser("elimina")
    sito.argomenti_comuni(p)
    p.add_argument("voce")
    p.add_argument("--si", action="store_true", help="conferma: senza, mostra solo cosa verrebbe eliminato")
    p.set_defaults(fn=cmd_elimina(cfg))
    return ap


def main(cfg, argv=None):
    cfg = {**DEFAULT, **cfg}
    a = costruisci_parser(cfg).parse_args(argv)
    sito.principale(lambda: a.fn(a))
