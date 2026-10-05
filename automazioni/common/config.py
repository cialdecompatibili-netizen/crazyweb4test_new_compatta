"""
Config condivisa per gli script in automazioni/.

Legge automazioni/.env (owner, repo, branch, token GitHub). Il file .env
NON e' su Git (vedi .gitignore) perche' contiene il token in chiaro.

Uso:
    from automazioni.common.config import OWNER, REPO, BRANCH, TOKEN
"""
import os
import re
import subprocess
from pathlib import Path

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def _load_env(path: Path) -> dict:
    values = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        values[key.strip()] = val.strip()
    return values


_env = _load_env(_ENV_PATH)


def _owner_repo_da_git():
    """(owner, repo) dall'origin della cartella del progetto: un clone funziona senza toccare niente."""
    try:
        p = subprocess.run(["git", "-C", str(_ENV_PATH.parent), "remote", "get-url", "origin"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        m = re.search(r"github\.com[:/]+([^/\s]+)/([^/\s]+?)(?:\.git)?/?\s*$", p.stdout.strip())
        return (m.group(1), m.group(2)) if p.returncode == 0 and m else (None, None)
    except OSError:
        return (None, None)


# PUNTO CRITICO: ordine di precedenza owner/repo = variabile d'ambiente > automazioni/.env > git origin.
# Se in automazioni/.env resta GITHUB_REPO scritto a mano (es. copiato da un altro sito), vince su origin e gli
# script scrivono sul repo SBAGLIATO: nei cloni togliere GITHUB_OWNER/GITHUB_REPO dal .env, lasciare solo il token.
# La regola owner/repo e' la stessa di repos_auto.py e deploy.yml: se ne cambi una, cambia anche le altre.
_G_OWNER, _G_REPO = _owner_repo_da_git()

TOKEN = os.environ.get("GITHUB_TOKEN") or _env.get("GITHUB_TOKEN")
OWNER = os.environ.get("GITHUB_OWNER") or _env.get("GITHUB_OWNER") or _G_OWNER
REPO = os.environ.get("GITHUB_REPO") or _env.get("GITHUB_REPO") or _G_REPO
BRANCH = os.environ.get("GITHUB_BRANCH") or _env.get("GITHUB_BRANCH", "main")

if not (OWNER and REPO):
    raise RuntimeError("Owner/repo non ricavabili: nessun git origin GitHub. Imposta GITHUB_OWNER e GITHUB_REPO in automazioni/.env.")

if not TOKEN:
    raise RuntimeError(
        "GITHUB_TOKEN mancante. Crea automazioni/.env con GITHUB_TOKEN=... "
        "(vedi automazioni/README.md)."
    )
