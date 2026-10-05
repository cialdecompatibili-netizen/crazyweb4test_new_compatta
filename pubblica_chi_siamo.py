#!/usr/bin/env python3
"""
pubblica_chi_siamo.py - genera la pagina /chi-siamo/ da chi_siamo.json
e la scrive nei repo definiti in repos.json (stesso schema di pubblica_servizi.py).

ESEMPI
  python pubblica_chi_siamo.py                       # anteprima: scrive SOLO su test (locale)
  python pubblica_chi_siamo.py --push                # scrive + commit + push su test
  python pubblica_chi_siamo.py --dry-run             # non scrive niente, mostra cosa farebbe
  python pubblica_chi_siamo.py --dove prod --push --conferma     # porta su PROD (dopo il via)
  python pubblica_chi_siamo.py --dove test,prod --push --conferma

Per cambiare i testi: modifica chi_siamo.json e rilancia. Nessun codice da toccare.
Per un nuovo sito: aggiungi un blocco in repos.json e usa --dove nome.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

from repos_auto import completa

QUI = Path(__file__).resolve().parent
REPOS_JSON = QUI / "repos.json"
CONTENUTO_JSON = QUI / "chi_siamo.json"
FILE_PAGINA = "_pages/chi-siamo.md"


def carica(p: Path) -> dict:
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(f"File mancante: {p}")
    except json.JSONDecodeError as e:
        sys.exit(f"JSON non valido in {p.name}: riga {e.lineno}, colonna {e.colno}: {e.msg}")


def risolvi_repos(cfg: dict) -> dict:
    out = {}
    for nome, r in cfg["repos"].items():
        d = Path(r["dir"])
        if not d.is_absolute():
            d = (QUI / d).resolve()
        # PUNTO CRITICO: remoto/baseurl "auto" o mancanti = ricavati dal git origin (repos_auto.py, stessa
        # regola di deploy.yml). Con "auto" il remoto non e' un controllo di sicurezza: per un repo protetto
        # (prod) scrivilo esplicito in repos.json. Non scrivere mai nomi/URL nel codice.
        out[nome] = completa({**r, "dir": d})
    return out


def css(stile: dict) -> str:
    p = stile.get("prefisso_css", "cs")
    w = stile.get("larghezza_max", "960px")
    r = stile.get("raggio", "12px")
    return f"""<style>
.{p}-hero{{text-align:center;padding:2.2rem 0 1.2rem}}
.{p}-eyebrow{{display:inline-block;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;font-weight:700;opacity:.65;margin-bottom:.8rem}}
.{p}-hero h2{{font-size:clamp(1.7rem,4.2vw,2.6rem);line-height:1.15;margin:0 auto 1rem;max-width:820px}}
.{p}-hero p{{max-width:720px;margin:0 auto 1rem;font-size:1.05rem;line-height:1.6;opacity:.9}}
.{p}-cta{{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:1.4rem}}
.{p}-btn{{display:inline-block;padding:.7rem 1.6rem;border-radius:999px;font-weight:700;text-decoration:none;border:1px solid rgba(0,0,0,.25);color:inherit}}
.{p}-btn.pri{{background:#111;color:#fff;border-color:#111}}
html[data-theme="dark"] .{p}-btn{{border-color:rgba(255,255,255,.35)}}
html[data-theme="dark"] .{p}-btn.pri{{background:#fff;color:#111;border-color:#fff}}
.{p}-num{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;max-width:900px;margin:2rem auto}}
.{p}-num div{{text-align:center;padding:18px 10px;border:1px solid rgba(0,0,0,.12);border-radius:{r};background:#fffdf5}}
.{p}-num b{{display:block;font-size:1.7rem;line-height:1.1;margin-bottom:4px}}
.{p}-num small{{opacity:.7}}
.{p}-nota{{text-align:center;font-size:.8rem;opacity:.6;margin-top:-1rem}}
.{p}-sec{{margin:3rem 0}}
.{p}-sec > h2{{text-align:center;margin-bottom:.4rem}}
.{p}-sub{{text-align:center;max-width:680px;margin:0 auto 1.6rem;opacity:.75}}
.{p}-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:{w};margin:0 auto}}
.{p}-grid.c2{{grid-template-columns:repeat(2,1fr)}}
.{p}-grid.c4{{grid-template-columns:repeat(4,1fr)}}
.{p}-card{{display:block;padding:18px 20px;border:1px solid rgba(0,0,0,.12);border-radius:{r};background:#fffdf5;text-align:left;color:inherit;text-decoration:none}}
.{p}-card b{{display:block;margin-bottom:6px}}
.{p}-card p{{margin:0;font-size:.93rem;line-height:1.5;opacity:.85}}
.{p}-step{{position:relative;padding-top:34px}}
.{p}-step i{{position:absolute;top:12px;left:20px;font-style:normal;font-weight:800;font-size:.85rem;opacity:.5}}
.{p}-final{{text-align:center;padding:2.4rem 1.2rem;border:1px solid rgba(0,0,0,.12);border-radius:16px;background:#fffdf5;max-width:900px;margin:3rem auto 1rem}}
.{p}-final h2{{margin-top:0}}
.{p}-final p{{max-width:620px;margin:0 auto 1rem}}
html[data-theme="dark"] .{p}-num div,html[data-theme="dark"] .{p}-card,html[data-theme="dark"] .{p}-final{{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15)}}
@media (max-width:760px){{.{p}-num{{grid-template-columns:repeat(2,1fr)}}.{p}-grid,.{p}-grid.c2,.{p}-grid.c4{{grid-template-columns:1fr}}}}
</style>
"""


def url(link: str) -> str:
    """Link interno: usa relative_url di Jekyll (funziona con qualsiasi baseurl); esterni invariati."""
    if link.startswith(("http://", "https://", "mailto:", "tel:", "#")):
        return link
    return "{{ '" + link + "' | relative_url }}"


def bottoni(nomi: list, c: dict, p: str) -> str:
    out = []
    for n in nomi:
        if n == "whatsapp" and c.get("whatsapp"):
            out.append(f'<a class="{p}-btn pri" href="https://wa.me/{c["whatsapp"]}" rel="noopener">{c["testo_whatsapp"]}</a>')
        elif n == "preventivo":
            classe = "pri" if not c.get("whatsapp") else ""
            out.append(f'<a class="{p}-btn {classe}" href="{url(c["link_preventivo"])}">{c["testo_preventivo"]}</a>')
        elif n == "servizi":
            out.append(f'<a class="{p}-btn" href="{url(c["link_servizi"])}">{c["testo_servizi"]}</a>')
    return "\n".join(out)


def sez_hero(s: dict, c: dict, p: str) -> str:
    par = "\n".join(f"  <p>{t}</p>" for t in s.get("paragrafi", []))
    eb = f'  <span class="{p}-eyebrow">{s["eyebrow"]}</span>\n' if s.get("eyebrow") else ""
    return (f'<div class="{p}-hero">\n{eb}  <h2>{s["titolo"]}</h2>\n{par}\n'
            f'  <div class="{p}-cta">\n{bottoni(s.get("bottoni", []), c, p)}\n  </div>\n</div>\n')


def sez_numeri(s: dict, c: dict, p: str) -> str:
    voci = "\n".join(f'  <div><b>{v["valore"]}</b><small>{v["etichetta"]}</small></div>' for v in s["voci"])
    nota = f'<p class="{p}-nota">{s["nota"]}</p>\n' if s.get("nota") else ""
    return f'<div class="{p}-num">\n{voci}\n</div>\n{nota}'


def sez_griglia(s: dict, c: dict, p: str) -> str:
    col = s.get("colonne", 3)
    classe = "" if col == 3 else f" c{col}"
    sub = f'  <p class="{p}-sub">{s["sottotitolo"]}</p>\n' if s.get("sottotitolo") else ""
    card = []
    for i, k in enumerate(s["card"], 1):
        num = f"<i>{i:02d}</i>" if s.get("numerata") else ""
        extra = f" {p}-step" if s.get("numerata") else ""
        corpo = f'{num}<b>{k["titolo"]}</b><p>{k["testo"]}</p>'
        if k.get("link"):
            card.append(f'    <a class="{p}-card{extra}" href="{url(k["link"])}">{corpo}</a>')
        else:
            card.append(f'    <div class="{p}-card{extra}">{corpo}</div>')
    return (f'<div class="{p}-sec">\n  <h2>{s["titolo"]}</h2>\n{sub}'
            f'  <div class="{p}-grid{classe}">\n' + "\n".join(card) + "\n  </div>\n</div>\n")


def sez_finale(s: dict, c: dict, p: str) -> str:
    return (f'<div class="{p}-final">\n  <h2>{s["titolo"]}</h2>\n  <p>{s["testo"]}</p>\n'
            f'  <div class="{p}-cta">\n{bottoni(s.get("bottoni", []), c, p)}\n  </div>\n</div>\n')


RENDER = {"hero": sez_hero, "numeri": sez_numeri, "griglia": sez_griglia, "finale": sez_finale}


def genera(cont: dict) -> str:
    pg, c, stile = cont["pagina"], cont["contatti"], cont.get("stile", {})
    p = stile.get("prefisso_css", "cs")
    front = (f"---\nlayout: page\ntitle: {pg['titolo']}\nnav: {str(pg.get('nav', False)).lower()}\n"
             f"permalink: {pg['permalink']}\ndescription: {pg.get('description', '')}\n---\n\n")
    blocchi = []
    for i, s in enumerate(cont["sezioni"], 1):
        f = RENDER.get(s.get("tipo"))
        if not f:
            sys.exit(f"Sezione {i}: tipo '{s.get('tipo')}' sconosciuto. Validi: {', '.join(RENDER)}")
        blocchi.append(f(s, c, p))
    return front + css(stile) + "\n" + "\n".join(blocchi)


def git(d: Path, *a: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(d), *a], capture_output=True, text=True, encoding="utf-8", errors="replace")


def main() -> None:
    ap = argparse.ArgumentParser(description="Genera /chi-siamo/ da chi_siamo.json.")
    ap.add_argument("--dove", default=None, help="repo da repos.json separati da virgola (default: quello di default, cioe' test)")
    ap.add_argument("--dry-run", action="store_true", help="non scrive niente")
    ap.add_argument("--push", action="store_true", help="commit + push dopo la scrittura")
    ap.add_argument("--conferma", action="store_true", help="necessario per i repo protetti (prod)")
    ap.add_argument("--msg", default="Aggiorna pagina chi siamo", help="messaggio di commit")
    a = ap.parse_args()

    cfg = carica(REPOS_JSON)
    repos = risolvi_repos(cfg)
    nomi = [n.strip() for n in (a.dove or cfg["default"]).split(",") if n.strip()]
    for n in nomi:
        if n not in repos:
            sys.exit(f"Repo '{n}' non in repos.json. Disponibili: {', '.join(repos)}")
        if repos[n]["protetto"] and not a.dry_run and not a.conferma:
            sys.exit(f"Repo protetto '{n}' ({repos[n]['etichetta']}): aggiungi --conferma (solo dopo il via di Mirco)")

    testo = genera(carica(CONTENUTO_JSON))
    print(f"Pagina generata: {len(testo.splitlines())} righe, {len(testo.encode('utf-8'))} byte")

    for n in nomi:
        r = repos[n]
        f = r["dir"] / FILE_PAGINA
        tag = f"[{r['etichetta']}]"
        if not f.parent.is_dir():
            print(f"{tag} SALTATO: manca {f.parent}")
            continue
        if a.dry_run:
            print(f"{tag} dry-run: scriverei {f}")
            continue
        f.write_text(testo, encoding="utf-8", newline="\n")
        print(f"{tag} scritto {f}")
        if a.push:
            git(r["dir"], "add", FILE_PAGINA)
            c = git(r["dir"], "commit", "-m", a.msg, "--", FILE_PAGINA)
            print(f"{tag} commit: {(c.stdout.strip() or c.stderr.strip()).splitlines()[0] if (c.stdout or c.stderr) else 'nulla da committare'}")
            pu = git(r["dir"], "push", "origin", "main")
            print(f"{tag} push: {(pu.stdout + pu.stderr).strip().splitlines()[-1] if (pu.stdout or pu.stderr) else 'ok'}")
            print(f"{tag} sito: https://{r['remoto'].split('/')[0]}.github.io{r['baseurl']}/chi-siamo/")
        else:
            print(f"{tag} locale (non pushato). Per pubblicare: aggiungi --push")


if __name__ == "__main__":
    main()
