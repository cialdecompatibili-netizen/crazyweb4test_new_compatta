# Controlli automatici, build locale e sitemap

Riassunto in `CLAUDE.md` > Punti critici n.13.

## `python verifica_permalink.py [--build <cartella _site>]`

- Senza opzioni (1 secondo): la regola `/servizi/` e' uguale in `_config.yml`, `repos.json` e `admin/admin-views.js`; il layout ha la riga `page.collection == 'posts'`; nessun post ha `permalink:` a mano; i file di `_servizi/` hanno tutti la loro pagina.
- Con `--build`: controlla anche la build gia' fatta (redirect che puntano a pagine esistenti, sitemap senza duplicati e senza URL morti, nessun redirect in sitemap, slug con il punto).
- Esce con codice 1 se qualcosa non torna.
- LANCIARLO prima di ogni push che tocca URL, plugin, layout, config o admin.

## Build locale

- `bundle exec jekyll build -d $env:TEMP\_site_check` (85-110 s), poi `python verifica_permalink.py --build $env:TEMP\_site_check`.
- Gli errori `Imagemagick ... Parametro non valido` su Windows sono rumore noto (`convert` di Windows), non bloccano.
- Il plugin dei post ferma la build se due pagine finiscono sullo stesso URL (collisione); `permalink_collisioni_fatali: false` nel config la riduce a avviso. Vedi `url-post-plugin.md`.

## Sitemap (custom)

- Due copie: `sitemap.xml` in radice e la sorgente `modules_source/sitemap/root/sitemap.xml`. Patchare SEMPRE entrambe.
- Salta pagine e articoli con `sitemap: false` o `redirect:`.
- La sitemap si rigenera a ogni build dall'URL vero di ogni pagina: un servizio nuovo ci entra da solo.
