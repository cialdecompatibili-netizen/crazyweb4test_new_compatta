"""
Helper condivisi per leggere/scrivere file sul repo GitHub del sito
(quello di questo progetto) via API REST, senza duplicare requests.get/put in ogni
script (com'era prima in claudetemp/).

Usa automazioni/common/config.py per owner/repo/branch/token.

Funzioni principali:
    get_file(path)            -> (content_str, sha) o (None, None) se non esiste
    put_file(path, content, message, sha=None) -> risposta API (dict)
    list_dir(path)             -> lista di dict (name, path, type, sha)

Data: creato 22/09/2026, su richiesta di organizzare gli script sparsi
in claudetemp/ in moduli riusabili sotto automazioni/.
"""
import base64
import requests

from . import config

API_ROOT = "https://api.github.com"


def _headers():
    return {
        "Authorization": f"Bearer {config.TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    }


def _contents_url(path: str) -> str:
    path = path.lstrip("/")
    return f"{API_ROOT}/repos/{config.OWNER}/{config.REPO}/contents/{path}"


def get_file(path: str):
    """Ritorna (contenuto_testo, sha) del file su GitHub, o (None, None) se non esiste."""
    resp = requests.get(
        _contents_url(path),
        headers=_headers(),
        params={"ref": config.BRANCH},
        timeout=30,
    )
    if resp.status_code == 404:
        return None, None
    resp.raise_for_status()
    data = resp.json()
    content = base64.b64decode(data["content"]).decode("utf-8")
    return content, data["sha"]


def put_file(path: str, content: str, message: str, sha: str = None) -> dict:
    """Crea o aggiorna un file su GitHub. Passa sha se il file esiste gia'
    (altrimenti GitHub rifiuta l'update per evitare di sovrascrivere a caso)."""
    payload = {
        "message": message,
        "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "branch": config.BRANCH,
    }
    if sha:
        payload["sha"] = sha
    resp = requests.put(_contents_url(path), headers=_headers(), json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


def update_file(path: str, content: str, message: str) -> dict:
    """Comodo wrapper: legge lo sha attuale e fa l'update in un colpo solo."""
    _, sha = get_file(path)
    if sha is None:
        raise FileNotFoundError(f"{path} non esiste su GitHub, usa put_file senza sha per crearlo")
    return put_file(path, content, message, sha=sha)


def list_dir(path: str) -> list:
    """Lista il contenuto di una cartella del repo (nomi, path, type, sha)."""
    resp = requests.get(
        _contents_url(path),
        headers=_headers(),
        params={"ref": config.BRANCH},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()
