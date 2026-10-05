# Pubblicare servizi (`pubblica_servizi.py`)

Aggiornato 04/10/2026: i servizi sono la collection `_servizi/`, non piu' post. Riassunto in `CLAUDE.md` > Questo progetto.

## Comando (SEMPRE con Python, output minimo)

`python pubblica_servizi.py <scelta> [--dove <repo da repos.json>|tutti] [--dry-run] [--push] [--conferma]`

- Scelta: `--primi N` | `--slug a,b` | `--tutti`.
- Default `--dove test`. `prod` (crazyweb4) SOLO dopo il via esplicito di Mirco, e oggi NON si puo': su PROD non esiste la collection `servizi` e lo script rifiuta i repo che non l'hanno (vedi `servizi-collection.md`).

## Cosa fa

1. Genera/aggiorna `_servizi/<slug>.md` (via `genera_servizi.py` + `servizi_data.py`). Se il file esiste conserva `in_home`, `seo_title`, `seo_description`.
2. Rende cliccabili le card in `_pages/servizi.md` (link con `relative_url`, valido con qualsiasi baseurl) e assicura il CSS card-intera per mobile.
3. Le card della HOME sono dinamiche (vedi `home-servizi-progetti.md`): lo script salta il riallineamento della home se trova il marker `SERVIZI HOME START (DINAMICO)`.
4. Verifica i link rotti.
5. `--push`: add/commit/push SOLO dei file toccati; si ferma se il remoto e' inatteso o indietro.

Idempotente: non toccare a mano file o card, rilanciare lo script.

## Config (zero hardcoded)

- Repo, cartelle, remoti, baseurl e pagine stanno in `repos.json` (`sito.servizi_dir`, `sito.permalink_servizio` = `/servizi/{slug}/`).
- `riallinea` sistema da solo i link delle card (la regex copre `/servizi/` e i vecchi `/blog/servizi/`, `/blog/<anno>/`).
- `permalink:` nel front matter: non scriverlo mai (`assicura_permalink` non fa piu' nulla).
- Se cambia la regola URL dei servizi: `_config.yml` + `repos.json` + etichetta commit in `admin/admin-views.js`; `python verifica_permalink.py` li confronta.

## Stato

- TEST: tutti i 69 servizi in `_servizi/`, card `/servizi/` e home pubblicati.
- PROD: non fatto. Serve prima portare la collection (config, layout, plugin/metadata, admin) e il via di Mirco.
- Nome commit/run in Actions: `admin: crea /servizi/x/`.
