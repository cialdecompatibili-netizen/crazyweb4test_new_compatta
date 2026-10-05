# URL dei post del blog (plugin `permalink_da_categoria.rb`)

Vale per i POST. I servizi NON passano di qui: sono la collection `servizi` (vedi `servizi-collection.md`). Riassunto in `CLAUDE.md` > Questo progetto e punti critici 3-6.

## Regola

- Plugin `_plugins/permalink_da_categoria.rb`; config in `_config.yml`:
  - `permalink_da_categoria: /blog/:categoria/:title/` (default: PRIMA categoria del post, slugificata).
  - `permalink_per_categoria:` eccezioni per categoria, vincono sul default. Oggi VUOTO (`{}`).
- Risultato: `/blog/<categoria>/<articolo>/` (es. `/blog/sample-posts/muscoli/`). Senza categoria: `/blog/<articolo>/`. I nuovi articoli dell'admin partono con `senza-categoria`, quindi `/blog/senza-categoria/<articolo>/`. Mai la data nell'URL.
- Il plugin legge solo `site.posts` e `site.pages`.
- Vale per post creati da script, admin o a mano: l'admin crea il file con `categories:`, l'URL lo calcola il plugin.

## Cose da non fare

- NIENTE `permalink:` nel front matter: se c'e' vince lui, e il post esce da regola e redirect.
- NUOVA categoria con URL proprio = una riga in `permalink_per_categoria` + lo specchio nell'etichetta commit di `admin/admin-views.js` (funzione `doPut`) + `repos.json` se coinvolge le card. Poi `python verifica_permalink.py`.
- Non ripristinare il layout originale `_layouts/post.liquid`: la riga `page.collection == 'posts'` tiene cliccabili anno e categoria anche quando l'URL non e' sotto `/blog/` (commit 546640d). Senza, i link spariscono e nessun errore avvisa.

## Redirect e collisioni

- Per i post con una regola in `permalink_per_categoria` il plugin genera pagine-redirect (meta refresh + canonical + noindex; GitHub Pages non ha redirect server) dai vecchi `/blog/<categoria>/<articolo>/` e `/blog/<anno>/<articolo>/`. Con la mappa vuota oggi non se ne generano (0 nella build).
- Se due pagine finiscono sullo stesso URL il plugin ferma la build. Per ridurlo a solo avviso: `permalink_collisioni_fatali: false` in `_config.yml`.

## Admin e PROD

- Nome commit/run in Actions dei post = URL (`admin: crea /blog/<cat>/x/`), non il file con data.
- Solo TEST: il plugin NON e' su PROD (crazyweb4) senza il via di Mirco; `clona_test.ps1` lo sovrascriverebbe con la versione PROD.
