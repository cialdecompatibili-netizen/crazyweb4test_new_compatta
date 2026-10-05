# Servizi = collection indipendente dal blog

Riassunto in `CLAUDE.md` > Punti critici n.21. Migrazione del 04/10/2026.

## Com'e' fatta

- I servizi NON sono piu' post con `categories: servizi`: stanno in `_servizi/<slug>.md`.
- Collection `servizi` in `_config.yml`: `output: true`, `permalink: /servizi/:title/`; default `layout: servizio` -> `_layouts/servizio.liquid` (senza data, tag, categorie).
- Non compaiono in `/blog/`, nelle categorie, in `/blog/category/servizi/` ne' negli archivi anno. URL sempre `/servizi/<nome-file>/` (nome file = slug, senza data).
- Front matter minimo: `layout`, `title`, `description`, `in_home` (casetta), `seo_title`, `seo_description`.
- `senza-categoria` e' la categoria predefinita dei NUOVI articoli del blog (admin).

## Admin e script

- Admin: voce `Servizi` tra News e Immagini (`C.servizi` / `FIELDS.servizi` in `admin/admin-views.js`): elenco con casetta, editor con titolo/descrizione/SEO, nuovo file = slug del titolo.
- `pubblica_servizi.py` e `genera_servizi.py` scrivono in `_servizi/` (`repos.json > sito.servizi_dir`) e conservano `in_home`/SEO di un file esistente. Rifiutano i repo senza la collection (PROD oggi). Vedi `pubblicare-servizi.md`.

## Trappole (leggere prima di toccarli)

1. `_servizi/*.md` NON ammette commenti nel front matter ne' file extra: un file senza front matter (es. un README) verrebbe copiato nel sito. I commenti vivono in `_config.yml`, `_layouts/servizio.liquid`, `_includes/metadata.liquid`, `genera_servizi.py`, `admin/admin-views.js`.
2. Il plugin `permalink_da_categoria.rb` lavora solo su `site.posts` e `site.pages`: un servizio NON ha redirect ne' regole per categoria.
3. `schema_org.service_category` e' obsoleto; il tipo Service si decide con `page.collection == 'servizi'` in `metadata.liquid`.
4. `categories:`, `date:` o `permalink:` nel front matter di un servizio sono un errore: la collection non li usa.
5. `_servizi/` esiste SOLO su TEST: su PROD gli script pubblicherebbero pagine mai costruite (`pubblica_servizi.py` si blocca da solo).
6. I vecchi `/blog/servizi/<x>/` e `/blog/<anno>/<x>/` non esistono piu' (erano solo su TEST, mai indicizzati).
7. I 69 servizi hanno testo quasi identico (contenuto debole per Google): riscrivere i principali prima di portarli su PROD.

## Ripristino

Backup prima della migrazione: branch `backup-2026-10-03-5` + tag `backup-2026-10-03-0544` (= `main` a `82434f86`).

## PROD

Su PROD (crazyweb4) non c'e' niente di tutto questo. Portarlo solo dopo il via di Mirco, tutto insieme (config, layout, `metadata.liquid`, admin, script), con backup e build locale prima.
