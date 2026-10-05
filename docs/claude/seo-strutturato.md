# SEO strutturato (`_includes/metadata.liquid`, override della gem)

Riassunto in `CLAUDE.md` > Punti critici n.15.

- Il canonical lo emette gia' `head.liquid` della gem: NON aggiungerne un secondo (duplicati).
- OpenGraph/Twitter e schema.org attivi (`serve_og_meta` e `serve_schema_org` = true in `_config.yml`). Anteprima di default `og_image: /assets/img/og-default.png`, SEMPRE con la `/` iniziale.
- Schema = un solo `@graph`: Organization + WebSite ovunque, poi UNO tra Service (pagine della collection `servizi`, `is_service` = `page.collection == 'servizi'`), BlogPosting (altri post) o WebPage, poi BreadcrumbList (non in home). Per i servizi la sezione e' 'Servizi' = `/servizi/`; per i post sezione e indice vengono da `permalink_per_categoria`.
- `schema_org.service_category` in `_config.yml` e' OBSOLETO e non letto.
- Dati azienda in `_config.yml > schema_org`; i campi vuoti NON vengono emessi. Non inventare telefono o indirizzo: compilarli con i dati veri.
- Il generatore `sameAs` originale e' stato tolto: leggeva `_data/socials.yml`, ancora quello del template (Scholar/Inspire di Einstein, `you@example.com`).
- Titolo e descrizione per pagina: `seo_title` / `seo_description` nel front matter.
- Controllo: `python verifica_seo.py --build <cartella _site>` (canonical unico e uguale a og:url, JSON-LD valido, tipi attesi, og:image assoluta, nessun dato del template). LANCIARLO dopo ogni build che tocca metadata, layout o config.
- Solo TEST: non su PROD senza il via di Mirco; `clona_test.ps1` lo sovrascriverebbe.
