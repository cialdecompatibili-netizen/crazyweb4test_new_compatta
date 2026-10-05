"""
repos_auto.py - ricava da solo remoto e baseurl di un repo dal suo `git remote origin`.

Regola identica a .github/workflows/deploy.yml (un clone funziona senza toccare niente):
  - file CNAME nella cartella  -> sito su dominio proprio, baseurl vuoto
  - repo <utente>.github.io    -> sito in root, baseurl vuoto
  - altrimenti                 -> baseurl "/<nome-repo>"

PUNTO CRITICO: questa regola e' COPIATA da .github/workflows/deploy.yml (shell) e da
automazioni/common/config.py (owner/repo). Se ne cambi una, cambia anche le altre: se
divergono, gli script pubblicano su un indirizzo diverso da quello che il deploy costruisce.

In repos.json: "remoto" e "baseurl" mancanti oppure "auto" = ricavati qui.
Scritti a mano = vincono (serve per PROD, dove il remoto atteso e' un controllo di sicurezza).
"""
import os
import re
import subprocess


def remoto_da_git(cartella):
    """'utente/repo' dall'origin di `cartella`, oppure '' se non c'e'."""
    try:
        p = subprocess.run(["git", "-C", str(cartella), "remote", "get-url", "origin"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
    except OSError:
        return ""
    m = re.search(r"github\.com[:/]+([^/\s]+)/([^/\s]+?)(?:\.git)?/?\s*$", p.stdout.strip())
    return f"{m.group(1)}/{m.group(2)}" if p.returncode == 0 and m else ""


def baseurl_da_remoto(remoto, cartella):
    owner, _, repo = remoto.partition("/")
    cname = os.path.join(str(cartella), "CNAME")
    if os.path.isfile(cname) and os.path.getsize(cname) > 0:
        return ""
    if repo.lower() == owner.lower() + ".github.io":
        return ""
    return "/" + repo


def completa(r):
    """Riempie in-place r['remoto'] e r['baseurl'] se mancanti o 'auto'. r['dir'] deve essere assoluto."""
    if r.get("remoto") in (None, "", "auto"):
        r["remoto"] = remoto_da_git(r["dir"])
    if r.get("baseurl") in (None, "auto"):
        r["baseurl"] = baseurl_da_remoto(r["remoto"], r["dir"]) if r["remoto"] else ""
    return r