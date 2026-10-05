# automazioni/

Script Python organizzati per gestire il sito crazyweb4test (repo
`cialdecompatibili-netizen/crazyweb4test`) senza dover riscrivere ogni volta
chiamate GitHub API sparse o script usa-e-getta come in claudetemp/.

Questa cartella vive DENTRO il repo del sito, ma è codice di gestione, non
codice del sito: non tocca _layouts/, _includes/, _sass/ (vietati da
AGENTS.md, vedi "Stop sign"). Se un task richiede di toccare quei path, lo
si fa a mano/via GitHub API con edit_block come finora, seguendo le regole
di AGENTS.md — questi script servono solo per i task ripetibili.

## Struttura

Si lancia dalla cartella del sito: `python -m automazioni <modulo> <comando> [opzioni]`
(`python -m automazioni` senza argomenti elenca i moduli; `-h` dopo ogni comando mostra le opzioni).

Opzioni comuni a TUTTI i comandi che scrivono: `--sito <cartella>` (default: questo sito; accetta anche il nome
di una cartella accanto, es. `trasporticorp`), `--dry-run` (mostra, non scrive), `--push` (commit + pull --rebase
+ push), `--conferma` (obbligatorio sui repo protetti, prod). Sono idempotenti: rilanciati non fanno danni.

- `common/sito.py` - base comune: trova il sito, legge/scrive in binario (CRLF preservati, niente BOM),
  front matter e righe, checkpoint `checkpoint-AAAA-MM-GG`, commit/push. Tutti i moduli usano questa.
- `common/config.py`, `common/github_api.py` - costanti e chiamate GitHub API (usate dagli script che lavorano via API).
- `menu.py` - menu di navigazione: `elenco`, `voce` (nav/ordine/titolo di una pagina), `figlio` / `rimuovi-figlio`
  (voci nelle tendine, con `--divider`), `link-aggiungi` / `link-rimuovi` (voci-link esterne).
- `pagine.py` - front matter e testi delle pagine: `elenco`, `leggi`, `imposta` (campi del front matter) e
  `testi <file.json>` (cambia SOLO le righe indicate di una pagina). I testi delle home dei cloni stanno in
  `testi/home_<sito>.json` (dati, non codice): per un clone nuovo si copia un JSON e si cambiano i testi.
- `footer.py` - footer del sito: `leggi`, `testo`, `fisso on|off`, `aggiornamento on|off`, `note-legali`.
- `config_sito.py` - `_config.yml`: `leggi`, `imposta chiave=valore` (titolo, lingua, favicon, articoli per pagina, ...).
- `common/collezione.py` - MOTORE CONDIVISO delle raccolte di contenuti: implementa una volta sola `elenco`, `crea`,
  `campo`, `nascondi` / `mostra`, `testo`, `elimina` (senza `--si` mostra solo l'anteprima; con `--si` il file va in `_cestino/<tipo>/`, ripristinabile dall'admin). Ogni raccolta e' un file
  da ~25-50 righe che passa SOLO la configurazione (cartella, layout, campi, front matter): niente copia-incolla.
- `post.py` - articoli del blog in `_posts/` (usa il motore). `crea --titolo ... --categoria ... [--thumbnail]`.
- `progetti.py` - progetti del portfolio in `_projects/` (usa il motore). `crea --titolo ... [--img] [--importanza] [--in-home]`.
- `news.py` - annunci brevi in `_news/` (usa il motore, senza titolo). `crea --testo "..."`.
- `servizi.py` - servizi in `_servizi/` (usa il motore): `elenco [--titoli] [--gruppo]`, `crea --titolo --gruppo [--ordine]
  [--in-home]`, `campo`, `nascondi` / `mostra`, `testo`, `elimina`. Il FILE e' la fonte di verita' (come l'admin):
  `pubblica_servizi.py` serve solo per rigenerare dai dati di `servizi_data.py`.
- `testi/` - file JSON con i testi delle pagine (uno per sito). Formato nel docstring di `pagine.py`.
- `__main__.py` - dispatcher dei moduli.

Esempi:

    python -m automazioni pagine testi --dry-run automazioni/testi/home_trasporticorp.json
    python -m automazioni pagine testi automazioni/testi/home_trasporticorp.json --push
    python -m automazioni menu figlio Agenzia --titolo "Prezzi" --permalink /prezzi/ --dry-run
    python -m automazioni footer fisso off --sito pannellisolari --push
    python -m automazioni post crea --titolo "Nuovo articolo" --categoria sample-posts --dry-run
    python -m automazioni progetti crea --titolo "Nuovo progetto" --in-home --testo-file corpo.md --dry-run
    python -m automazioni news crea --testo "Nuovo annuncio" --dry-run
    python -m automazioni progetti elimina nuovo-progetto --si --push

Limite: non toccano `_layouts/`, `_includes/`, `_sass/` (vietati da AGENTS.md, vedi "Stop sign"); il footer si
modifica solo tramite le chiavi di `_config.yml` che il tema gia' legge.

## Istruzioni rapide: servizi, progetti, blog, news

Tutte e quattro le raccolte hanno gli STESSI comandi (motore `common/collezione.py`). Si lancia dalla cartella del sito;
per un clone si aggiunge `--sito <cartella>` (es. `--sito trasporticorp`). Prima di scrivere si puo' sempre aggiungere
`--dry-run` (mostra, non scrive); per pubblicare su GitHub si aggiunge `--push`.

| Cosa | Comando (modulo = `servizi`, `progetti`, `post` o `news`) |
|---|---|
| Elencare | `python -m automazioni <modulo> elenco` (con `--titoli` solo i titoli) |
| Creare | `python -m automazioni <modulo> crea --titolo "..." [opzioni]` |
| Cambiare campi | `python -m automazioni <modulo> campo <slug> chiave=valore ...` (`--rimuovi chiave` per toglierne uno) |
| Cambiare il testo | `python -m automazioni <modulo> testo <slug> --testo-file corpo.md` |
| Nascondere / mostrare | `python -m automazioni <modulo> nascondi <slug>` / `mostra <slug>` |
| Eliminare | `python -m automazioni <modulo> elimina <slug> --si` (senza `--si` solo anteprima; il file va in `_cestino/`) |

Lo `<slug>` e' il nome del file senza `.md` (e senza la data per i post): lo vedi tra parentesi quadre in `elenco`.
Il testo (`--testo-file`) e' SOLO il corpo, senza il front matter `---`. Se non lo dai, la pagina esce vuota (lo script avvisa).

### Servizi (`_servizi/`)

    python -m automazioni servizi elenco --titoli
    python -m automazioni servizi elenco --gruppo "Sviluppo web"
    python -m automazioni servizi crea --titolo "Manutenzione WordPress" --gruppo "Sviluppo web" \
        --descrizione "Aggiornamenti, backup e sicurezza." --in-home --testo-file manutenzione.md --dry-run
    python -m automazioni servizi campo manutenzione-wordpress ordine=3 description="Nuova descrizione"
    python -m automazioni servizi campo manutenzione-wordpress --rimuovi in_home
    python -m automazioni servizi nascondi manutenzione-wordpress
    python -m automazioni servizi elimina manutenzione-wordpress --si --push

Opzioni di `crea`: `--gruppo` (dove sta in /servizi/; se manca va in "Altri servizi"), `--ordine` (se manca va in fondo al
gruppo), `--in-home` (appare in home), `--sottotitolo`, `--seo-title`, `--seo-description`, `--slug`, `--nascosto`.
Il FILE in `_servizi/` e' la fonte di verita' (come l'admin); card di /servizi/ e home sono cicli Liquid, non serve altro.
ATTENZIONE: se lo slug e' anche in `servizi_data.py`, rilanciare `genera_servizi.py`/`pubblica_servizi.py` per quello slug
riscrive testo, titolo e descrizione dal file dati (lo script avvisa).

### Progetti (`_projects/`)

    python -m automazioni progetti elenco --titoli
    python -m automazioni progetti crea --titolo "Nuovo progetto" --descrizione "..." --img assets/img/12.jpg \
        --importanza 2 --in-home --testo-file progetto.md
    python -m automazioni progetti campo nuovo-progetto importance=1 category=work
    python -m automazioni progetti nascondi nuovo-progetto

### Blog (`_posts/`)

    python -m automazioni post elenco --titoli
    python -m automazioni post elenco --categoria seo
    python -m automazioni post crea --titolo "Titolo articolo" --categoria seo --descrizione "..." \
        --thumbnail assets/img/foto.png --testo-file articolo.md
    python -m automazioni post campo titolo-articolo description="Nuova descrizione"
    python -m automazioni post testo titolo-articolo --testo-file articolo-nuovo.md

Cambiare `categories` cambia l'URL e i vecchi indirizzi NON reindirizzano (lo script lo ricorda).

### News (`_news/`)

    python -m automazioni news elenco
    python -m automazioni news crea --testo "Nuovo annuncio" --data "2026-10-06 09:00"

### Cosa NON si puo' cambiare da qui (si rifiuta, e' voluto)

`permalink`, `slug`, `slug_precedenti`, `layout`, `date` (cambierebbero l'URL senza redirect: usa l'admin) e, nei servizi,
`categories`. `title`, `gruppo` e `ordine` dei servizi si cambiano ma non si tolgono.

### Se qualcosa va storto

Ogni scrittura crea prima il branch `checkpoint-AAAA-MM-GG`: per tornare indietro `git checkout checkpoint-AAAA-MM-GG -- <file>`.
Un file eliminato per sbaglio si ripristina dal cestino dell'admin o da `_cestino/<tipo>/` (togliendo il prefisso `AAAAMMGGHHMM__`).

## Regola per ogni nuovo script

Ogni script deve avere in testa un docstring con:
1. Cosa fa
2. Su quale file/path del repo agisce
3. Se lavora in locale, via GitHub API, o entrambi
4. Data e riferimento alla richiesta che lo ha originato

Quando si aggiunge un modulo nuovo, aggiornare anche questo README con una
riga nella lista sopra.

Per una RACCOLTA nuova (cartella di .md con front matter) non scrivere codice nuovo: copiare `news.py` (la piu' corta),
cambiare `cartella`, il front matter in `_front_matter()` e le opzioni, aggiungerla a `MODULI` in `__main__.py`.
Il codice che serve a piu' moduli va SEMPRE in `common/` (mai copiato): regola per risparmiare token e righe. I PUNTI CRITICI (cosa rompe il sito se sbagli) sono commentati nel codice con `# CRITICO:` accanto alla riga che li protegge: prima di modificare un modulo, `Get-ChildItem automazioni -Recurse -Include *.py | Select-String CRITICO`; quando scopri un nuovo punto critico, aggiungi il commento nel codice, non solo qui.

## Cosa manca ancora (controllo del 06/10/2026)

Confronto tra l'admin (`admin/*.js`) e i moduli di questa cartella. Fatto leggendo il codice, NON provando i comandi
sui siti: prima di fidarsi di un modulo, lanciarlo con `--dry-run`.

Da fare, in ordine di priorita':
1. `pagine crea` / `elimina` / `duplica`: oggi `pagine.py` modifica solo pagine che esistono gia' in `_pages/`.
FATTI il 06/10/2026 con il motore condiviso: progetti, news, servizi (e post spostato sul motore).
2. Categorie e tag (`admin-categories.js`): rinomina, unisci, elimina.
3. Media e gallerie (`admin-media.js`, `admin-gallerie.js`): caricare, eliminare, cercare immagini non usate.
4. Tema e colori (`admin-tema.js`).
5. Moduli attivabili e gruppi (`admin-modules.js`, `admin-gruppi.js`).
6. Cestino e backup (`admin-cestino.js`, `admin-backup.js`).
7. Azioni su tanti elementi insieme (`admin-bulk.js`).

Da verificare (non controllato): `_teachings/`, `_books/`, `_bibliography/` e i dati in `_data/` (es. menu, social).
Esistono come cartelle del tema ma non so se il sito li usa: se non servono, non fare moduli.

Prima di aggiungere un modulo seguire "Regola per ogni nuovo script" qui sopra e togliere la voce da questa lista.
