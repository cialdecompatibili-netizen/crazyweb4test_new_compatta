# -*- coding: utf-8 -*-
"""
common/sito.py - helper LOCALI per gli script di automazioni/ (nessun token, nessuna API GitHub).

1. Cosa fa: trova la cartella del sito, legge/scrive file in binario preservando gli a-capo (CRLF),
   modifica front matter e righe di testo, crea il checkpoint, committa e pusha SOLO i file toccati.
2. Su quale file agisce: i file del sito indicati dai moduli (menu.py, pagine.py, config_sito.py,
   footer.py, post.py).
3. Lavora in locale (file + git). NON importa common/config.py (quello vuole il token GitHub).
4. Origine: richiesta del 05/10/2026 ("automatizzare menu, footer, articoli, tutto").

Regole del progetto rispettate (CLAUDE.md): modifica in binario con a-capo preservati, mai BOM,
`assert`/errore se una riga da cambiare non e' univoca, `--dry-run`, checkpoint-AAAA-MM-GG prima di
scrivere, push con `pull --rebase`, repo `protetto` (prod) solo con `--conferma`, output di poche righe.

PUNTI CRITICI:
- Sono modifiche RIGA PER RIGA: niente parser YAML, cosi' commenti e formattazione restano com'erano.
  Gestisce solo valori su una riga (o blocchi `>`/`|` che sostituisce con una riga) e la lista `children:`.
- Mai toccare `url`/`baseurl` di _config.yml (sono automatici, vedi CLAUDE.md punto 19): config_sito.py li rifiuta.
- La regola di rilevamento dei repo protetti legge repos.json: stessa fonte di pubblica_servizi.py.
"""
import datetime
import difflib
import json
import pathlib
import re
import subprocess
import sys
import unicodedata

try:  # su Windows la console puo' non essere UTF-8: mai crashare in stampa
    sys.stdout.reconfigure(errors="replace")
    sys.stderr.reconfigure(errors="replace")
except (AttributeError, ValueError):
    pass

RADICE = pathlib.Path(__file__).resolve().parents[2]  # cartella del sito che contiene automazioni/
BOM = b"\xef\xbb\xbf"


class Errore(Exception):
    """Errore atteso: lo script lo stampa in una riga ed esce con codice 1."""


def principale(funzione):
    try:
        funzione()
    except Errore as e:
        print("ERRORE:", e)
        sys.exit(1)


# ---------------------------------------------------------------- argomenti e sito

def argomenti_comuni(ap):
    ap.add_argument("--sito", help="cartella (o nome di una cartella accanto a questo sito). Default: questo sito")
    ap.add_argument("--dry-run", action="store_true", help="mostra cosa cambierebbe, non scrive nulla")
    ap.add_argument("--push", action="store_true", help="dopo la scrittura: commit + pull --rebase + push")
    ap.add_argument("--conferma", action="store_true", help="obbligatorio per i repo protetti (prod)")


def trova_sito(valore=None):
    if not valore:
        base = RADICE
    else:
        p = pathlib.Path(valore)
        if p.is_dir():
            base = p.resolve()
        elif (RADICE.parent / valore).is_dir():
            base = (RADICE.parent / valore).resolve()
        else:
            raise Errore(f"sito non trovato: {valore}")
    if not (base / "_config.yml").is_file():
        raise Errore(f"{base} non sembra un sito Jekyll (manca _config.yml)")
    return base


def _blocco_repo(base):
    """(nome, blocco) di repos.json che punta a `base` (cerca in questo sito e nel sito di destinazione)."""
    for cart in dict.fromkeys([RADICE, base]):
        f = cart / "repos.json"
        if not f.is_file():
            continue
        try:
            dati = json.loads(f.read_text(encoding="utf-8-sig"))
        except ValueError:
            continue
        for nome, r in dati.get("repos", {}).items():
            if (cart / r.get("dir", ".")).resolve() == base:
                return nome, r
    return None, {}


def _remoto_da_git(base):
    p = git(base, "remote", "get-url", "origin")
    m = re.search(r"github\.com[:/]+([^/\s]+)/([^/\s]+?)(?:\.git)?/?\s*$", p.stdout.strip())
    return f"{m.group(1)}/{m.group(2)}" if p.returncode == 0 and m else ""


def prepara(args, predefinito=None):
    """Trova il sito e applica i controlli di sicurezza. Ritorna la cartella."""
    base = trova_sito(args.sito or predefinito)
    nome, r = _blocco_repo(base)
    # CRITICO: repo PROTETTO (prod) = solo con --conferma E il via esplicito di Mirco. Mai aggirarlo.
    if r.get("protetto") and not args.conferma and not args.dry_run:
        raise Errore(f"{base.name} e' un repo PROTETTO ({nome}): serve --conferma e il via esplicito di Mirco")
    # CRITICO: se origin non e' il repo atteso da repos.json ci si ferma: evita di scrivere/pushare sul sito
    # sbagliato (succede con le cartelle copiate o clonate).
    atteso = r.get("remoto")
    if atteso and atteso != "auto" and not args.dry_run:
        reale = _remoto_da_git(base)
        if reale and reale != atteso:
            raise Errore(f"origin e' {reale}, repos.json si aspetta {atteso}: mi fermo")
    return base


# ---------------------------------------------------------------- file e a-capo

def eol(dati):
    return b"\r\n" if b"\r\n" in dati else b"\n"


def con_eol(testo, nl):
    """str -> bytes UTF-8 con gli a-capo `nl`."""
    return testo.replace("\r\n", "\n").replace("\n", nl.decode()).encode("utf-8")


def risolvi_file(base, nome, cartella="_pages", estensione=".md"):
    """'home' | 'home.md' | '_pages/home.md' -> percorso relativo POSIX, esistente e unico."""
    nome = nome.replace("\\", "/")
    cand = [nome, f"{cartella}/{nome}", f"{cartella}/{nome}{estensione}"]
    for c in cand:
        if (base / c).is_file():
            return c
    raise Errore(f"file non trovato in {cartella}: {nome}")


def slug(testo):
    s = unicodedata.normalize("NFKD", testo).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    if not s:
        raise Errore("slug vuoto")
    return s


# ---------------------------------------------------------------- valori YAML (una riga)

_PLAIN = re.compile(r"^[A-Za-z0-9_./][A-Za-z0-9_./ \-]*$")
_RISERVATE = {"true", "false", "null", "yes", "no", "on", "off", "~"}


# CRITICO: i valori vanno quotati se YAML li leggerebbe come bool/numero/null ('no', '2026', 'true'):
# senza virgolette il TIPO cambia in silenzio. Una sola riga: mai valori multi-riga.
def yq(v):
    """Valore Python -> testo YAML su una riga (tra virgolette se serve)."""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v)
    if "\n" in s or "\r" in s:
        raise Errore("valore su piu' righe non gestito")
    if (s.lower() in _RISERVATE or re.match(r"^[-+]?[0-9.]+$", s) or not _PLAIN.match(s)
            or s != s.strip()):
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return s


def dequota(s):
    s = s.strip()
    if len(s) >= 2 and s[0] == s[-1] == '"':
        return s[1:-1].replace('\\"', '"').replace("\\\\", "\\")
    if len(s) >= 2 and s[0] == s[-1] == "'":
        return s[1:-1].replace("''", "'")
    return s


def valore_cli(s):
    """Da riga di comando: true/false -> bool, numeri -> numero, altro -> testo."""
    if s.lower() in ("true", "false"):
        return s.lower() == "true"
    if re.match(r"^-?\d+$", s):
        return int(s)
    if re.match(r"^-?\d+\.\d+$", s):
        return float(s)
    return s


def _valore_e_commento(rest):
    """bytes dopo 'chiave:' -> (valore, commento). Il commento conserva gli spazi iniziali."""
    s = rest.lstrip(b" \t")
    if s[:1] in (b'"', b"'"):
        q, i = s[:1], 1
        while i < len(s):
            if q == b'"' and s[i:i + 1] == b"\\":
                i += 2
                continue
            if s[i:i + 1] == q:
                if q == b"'" and s[i + 1:i + 2] == b"'":
                    i += 2
                    continue
                break
            i += 1
        return s[:i + 1], s[i + 1:].rstrip()
    m = re.search(rb"\s#", s)
    if m:
        return s[:m.start()].rstrip(), s[m.start():].rstrip()
    return s.rstrip(), b""


# ---------------------------------------------------------------- righe e blocchi

def righe_di(dati):
    return dati.split(b"\n")


def unisci(righe):
    return b"\n".join(righe)


def fm_fine(righe):
    """Indice della riga '---' che chiude il front matter."""
    if not righe or righe[0].rstrip(b"\r") != b"---":
        raise Errore("front matter assente")
    for i in range(1, len(righe)):
        if righe[i].rstrip(b"\r") == b"---":
            return i
    raise Errore("front matter non chiuso")


def _indent(riga):
    return len(riga) - len(riga.lstrip(b" "))


def trova_chiave(righe, chiave, a, b, minimo_indent=0):
    """Indice della riga 'chiave:' nell'intervallo [a,b). minimo_indent=0: solo colonna 0; >0: annidata."""
    pat = re.compile(rb"^( *)" + re.escape(chiave.encode("utf-8")) + rb":(\s|$)")
    ris = []
    for i in range(a, b):
        m = pat.match(righe[i])
        if m and ((minimo_indent == 0 and len(m.group(1)) == 0) or (minimo_indent > 0 and len(m.group(1)) >= minimo_indent)):
            ris.append(i)
    # CRITICO: chiave duplicata = ambiguo: ci si ferma invece di indovinare (regola 'univoco' di CLAUDE.md).
    if len(ris) > 1:
        raise Errore(f"chiave duplicata: {chiave}")
    return ris[0] if ris else None


def fine_blocco(righe, i, b):
    """Indice (escluso) dell'ultima riga di continuazione della chiave a riga i."""
    ind = _indent(righe[i])
    j = i + 1
    while j < b:
        r = righe[j].rstrip(b"\r")
        if r.strip() == b"":
            k = j
            while k < b and righe[k].rstrip(b"\r").strip() == b"":
                k += 1
            if k < b and _indent(righe[k].rstrip(b"\r")) > ind:
                j = k
                continue
            break
        if _indent(r) > ind or (r.lstrip(b" ").startswith(b"- ") and _indent(r) == ind) or r == b"-":
            j += 1
            continue
        break
    return j


def _cr(righe):
    return b"\r" if righe and righe[0].endswith(b"\r") else b""


def imposta_riga(righe, chiave, valore, a, b, crea, annidata=False):
    """Imposta `chiave: valore` in righe[a:b] (modifica in place). Ritorna 'nuova'|'cambiata'|'gia'."""
    # valore None = chiave vuota (`chiave:`), che in Liquid e' falsa; la stringa vuota "" invece e' VERA
    nuovo = b"" if valore is None else yq(valore).encode("utf-8")
    i = trova_chiave(righe, chiave, a, b, 1 if annidata else 0)
    if i is None:
        if not crea:
            raise Errore(f"chiave '{chiave}' non presente: non la creo")
        righe.insert(b, chiave.encode("utf-8") + b":" + (b" " + nuovo if nuovo else b"") + _cr(righe))
        return "nuova"
    riga = righe[i].rstrip(b"\r")
    ind = riga[:_indent(riga)]
    val, comm = _valore_e_commento(riga[len(ind) + len(chiave) + 1:])
    fine = fine_blocco(righe, i, b)
    scalare_blocco = val[:1] in (b">", b"|")
    # CRITICO: mai sostituire una lista/mappa (es. children:) con un valore semplice: si perderebbero i figli.
    if fine > i + 1 and not scalare_blocco:
        raise Errore(f"'{chiave}' e' un blocco (lista/mappa): non lo sostituisco con un valore semplice")
    if not scalare_blocco and dequota(val.decode("utf-8")) == dequota(nuovo.decode("utf-8")):
        return "gia"
    righe[i:fine] = [ind + chiave.encode("utf-8") + b":" + (b" " + nuovo if nuovo else b"") + comm
                     + (b"\r" if righe[i].endswith(b"\r") else b"")]
    return "cambiata"


def leggi_valore(righe, chiave, a, b, annidata=False):
    i = trova_chiave(righe, chiave, a, b, 1 if annidata else 0)
    if i is None:
        return None
    riga = righe[i].rstrip(b"\r")
    ind = _indent(riga)
    val, _ = _valore_e_commento(riga[ind + len(chiave) + 1:])
    if val[:1] in (b">", b"|"):
        fine = fine_blocco(righe, i, b)
        testo = " ".join(r.strip().decode("utf-8") for r in righe[i + 1:fine] if r.strip())
        return testo
    return dequota(val.decode("utf-8"))


# ---------------------------------------------------------------- front matter

def fm_leggi(dati, chiave):
    righe = righe_di(dati)
    return leggi_valore(righe, chiave, 1, fm_fine(righe))


def fm_imposta(dati, chiave, valore):
    """(nuovi_dati, esito) - crea la chiave in fondo al front matter se manca."""
    righe = righe_di(dati)
    esito = imposta_riga(righe, chiave, valore, 1, fm_fine(righe), True)
    return unisci(righe), esito


def fm_rimuovi(dati, chiave):
    righe = righe_di(dati)
    fine = fm_fine(righe)
    i = trova_chiave(righe, chiave, 1, fine)
    if i is None:
        return dati, "assente"
    del righe[i:fine_blocco(righe, i, fine)]
    return unisci(righe), "rimossa"


# ---------------------------------------------------------------- confronto, checkpoint, git

def righe_diverse(vecchio, nuovo):
    a = vecchio.decode("utf-8", "replace").splitlines()
    b = nuovo.decode("utf-8", "replace").splitlines()
    return sum(1 for r in difflib.unified_diff(a, b, lineterm="", n=0) if r.startswith("+") and not r.startswith("+++"))


def git(base, *a):
    return subprocess.run(["git", "-C", str(base), *a], capture_output=True, text=True,
                          encoding="utf-8", errors="replace")


def checkpoint(base, push=False):
    ck = "checkpoint-" + datetime.date.today().isoformat()
    if git(base, "rev-parse", "--verify", "--quiet", ck).returncode != 0:
        r = git(base, "branch", ck)
        if r.returncode != 0:
            raise Errore("checkpoint non creato: " + r.stderr.strip()[:200])
    if push:
        git(base, "push", "origin", ck)  # se esiste gia' risponde 'Everything up-to-date'
    return ck


def pubblica(base, rels, messaggio):
    """Commit SOLO dei file indicati + pull --rebase + push. Ritorna una riga di riepilogo."""
    ramo = git(base, "rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    # CRITICO: push automatico solo da main (il deploy parte dal push). Piu' push ravvicinati = run 'cancelled': normale.
    if ramo != "main":
        raise Errore(f"ramo corrente '{ramo}': il push automatico e' solo su main")
    esistenti = [r for r in rels if (base / r).exists() or git(base, "ls-files", "--", r).stdout.strip()]
    if not esistenti:  # `git add -A --` SENZA percorsi aggiungerebbe TUTTO il repo: mai chiamarlo vuoto
        return "push: nulla da committare"
    # CRITICO: add/commit SOLO dei file toccati, mai `git add -A` del repo intero (porterebbe dentro lavoro altrui).
    git(base, "add", "-A", "--", *esistenti)
    toccati = git(base, "diff", "--cached", "--name-only", "--", *esistenti).stdout.split()
    if not toccati:
        return "push: nulla da committare"
    c = git(base, "commit", "-m", messaggio, "--", *toccati)
    if c.returncode != 0:
        raise Errore("commit fallito: " + (c.stderr or c.stdout).strip()[:200])
    if git(base, "remote").stdout.strip() == "":
        return f"commit ok ({len(toccati)} file), nessun remote: push saltato"
    # CRITICO: pull --rebase prima del push: l'admin su GitHub scrive sullo stesso repo.
    p = git(base, "pull", "--rebase", "origin", "main")
    if p.returncode != 0:
        raise Errore("pull --rebase fallito, risolvi a mano: " + (p.stderr or p.stdout).strip()[:200])
    r = git(base, "push", "origin", "main")
    if r.returncode != 0:
        raise Errore("push fallito: " + (r.stderr or r.stdout).strip()[:200])
    sha = git(base, "rev-parse", "--short", "HEAD").stdout.strip()
    return f"push ok: {sha} ({len(toccati)} file)"


def applica(base, args, cambi, bersagli, messaggio):
    """
    cambi: {percorso_relativo: bytes_nuovi} (solo file davvero diversi dal disco).
    bersagli: percorsi di cui --push fa commit anche se il file era gia' modificato da un lancio precedente.
    Stampa il riepilogo (poche righe).
    """
    prefisso = "DRY-RUN " if args.dry_run else ""
    if not cambi:
        print(prefisso + "nessuna modifica: gia' tutto aggiornato")
    for rel, nuovo in cambi.items():
        p = base / rel
        vecchio = p.read_bytes() if p.exists() else b""
        if nuovo is None:  # eliminazione del file (valore None in `cambi`)
            if not p.exists():
                raise Errore(f"{rel}: non esiste, niente da eliminare")
            print(f"{prefisso}{rel}: ELIMINATO ({len(vecchio.splitlines())} righe)")
            continue
        # CRITICO (CLAUDE.md): MAI BOM. Set-Content/Out-File di PowerShell lo aggiungono: si scrive solo in binario.
        if nuovo.startswith(BOM):
            raise Errore(f"{rel}: BOM nel risultato, mi fermo")
        # CRITICO: file CRLF = TUTTE le righe CRLF. A-capo misti sporcano il diff di tutto il file.
        if vecchio and eol(vecchio) == b"\r\n" and nuovo.count(b"\n") != nuovo.count(b"\r\n"):
            raise Errore(f"{rel}: a-capo misti nel risultato (il file e' CRLF), mi fermo")
        n = righe_diverse(vecchio, nuovo)
        print(f"{prefisso}{rel}: {n} righe" + ("" if vecchio else " (file nuovo)"))
    if args.dry_run:
        return
    if cambi:
        # CRITICO: il checkpoint-AAAA-MM-GG (branch) si crea PRIMA di scrivere: e' il modo di tornare indietro.
        ck = checkpoint(base, args.push)
        for rel, nuovo in cambi.items():
            p = base / rel
            if nuovo is None:
                p.unlink()
                continue
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(nuovo)
        print(f"scritti {len(cambi)} file (checkpoint {ck}); controlla con: git diff --stat")
    if args.push:
        print(pubblica(base, sorted(set(bersagli) | set(cambi)), messaggio))


# ---------------------------------------------------------------- aiuti condivisi tra i moduli

def eol_sito(base):
    """Gli a-capo che usa il sito (da _config.yml): i file NUOVI si scrivono cosi'."""
    return eol((base / "_config.yml").read_bytes())


def corpo_da_args(a):
    """Testo del corpo da --testo-file OPPURE --testo (mai con front matter). Stringa senza a-capo ai bordi."""
    if a.testo_file and a.testo:
        raise Errore("usa --testo-file OPPURE --testo, non entrambi")
    if a.testo_file:
        p = pathlib.Path(a.testo_file)
        if not p.is_file():
            raise Errore(f"file non trovato: {a.testo_file}")
        t = p.read_text(encoding="utf-8-sig")
    else:
        t = a.testo or ""
    if t.lstrip().startswith("---"):
        raise Errore("il testo deve essere solo il corpo: togli il front matter (---)")
    return t.strip("\r\n")


def coppie_cli(coppie, testuali=()):
    """['k=v', ...] -> [(k, valore)]. I campi in `testuali` restano testo anche se sembrano numeri o true/false."""
    out = []
    for c in coppie:
        if "=" not in c:
            raise Errore(f"'{c}': usa chiave=valore")
        k, _, v = c.partition("=")
        k = k.strip()
        out.append((k, v if k in testuali else valore_cli(v)))
    return out
