# MEMORIA DEL PROGETTO: idee future (NIENTE DA FARE ORA)

Qui stanno le idee che Mirco vuole riprendere in futuro. Non iniziarle senza che lo chieda. Aggiornato il 05/10/2026.
Per le regole del sito e dell'admin vedi CLAUDE.md (punti numerati).

## 1. E-commerce gratis e stabile (da provare in futuro)

Obiettivo di Mirco: gestire un e-commerce gratis, stabile, sfruttando piu' risorse gratuite possibile.

Perche' non GitHub Pages: la documentazione di GitHub dice che Pages non e' pensato ne' permesso come hosting gratuito per attivita' online, siti e-commerce o siti rivolti soprattutto alle transazioni commerciali. Perche' non Vercel: il piano gratuito vieta l'uso commerciale. Netlify gratuito: 300 crediti al mese, limite rigido, banda e deploy consumano crediti. Node come server sempre acceso gratis (es. Render): si spegne dopo 15 minuti, disco effimero, non adatto alla produzione.

Stack scelto (tutto su un account Cloudflare, piu' Stripe):
- Sito e catalogo statico: Cloudflare Pages (richieste statiche illimitate, 500 build al mese, 1 build alla volta, timeout 20 min).
- Logica (checkout, webhook, ordini): Workers (100.000 richieste al giorno che eseguono codice, poca CPU per richiesta).
- Prodotti e ordini: D1 (SQLite; free: 5 milioni di letture e 100.000 scritture di righe al giorno, 5 GB). Niente transazioni classiche: usare batch().
- Foto e file: R2 (10 GB, 1 milione di operazioni di scrittura e 10 milioni di lettura al mese, nessun costo di uscita).
- KV solo per leggere configurazioni: 1.000 scritture al giorno gratis. Il carrello sta nel browser.
- Pagamenti: Stripe Checkout (niente canone, commissione per vendita: DA VERIFICARE). Email ordini: servizio con piano gratuito (Brevo o Resend: DA VERIFICARE). Il dominio ha un costo.
- Linguaggio: TypeScript/JavaScript. Pagine con Astro o Jekyll, API con Hono.

Rischi da ricordare:
- Oltre i limiti gratuiti le richieste falliscono (non addebita). Uscita di sicurezza: Workers Paid a 5 $/mese.
- Nessuna garanzia di uptime sul piano gratuito.
- 500 build al mese: se l'admin committa a ogni salvataggio, raggruppare le modifiche del catalogo.
- Backup periodico di D1 su R2 o GitHub (Action schedulata).
- Limiti e prezzi cambiano: ricontrollare i piani prima di iniziare (verificati ottobre 2026).

Prossimo passo, quando Mirco lo chiede: scheletro minimo (catalogo statico, checkout Stripe, Worker per gli ordini, tabelle D1). Serve un account Cloudflare e uno Stripe: chiedere prima.

## 2. Hosting e clone Node (decisione del 04/10/2026, NIENTE DA FARE ORA)

- Decisione: si resta con Jekyll + admin su GitHub (statico, nessun database). Non si riscrive in Node adesso.
   - Hosting: quando il sito va su PROD con dominio vero, valutare Netlify o Cloudflare Pages (non cambia il CMS). Motivi: 301 veri (file `_redirects` generato da `slug_precedenti`, punto 28), anteprima su branch prima di pubblicare, login vero al posto del token nel browser, header configurabili. Costi e limiti dei piani non verificati: controllarli prima.
   - Clone Node (volonta' di Mirco: farlo in futuro, in automatico, usando QUESTO progetto come base, con le stesse funzioni). NON iniziare senza che lo chieda. Quando si fara':
     * Funzioni da portare (tutte quelle dell'admin): articoli, pagine, progetti, servizi, news, categorie, menu, immagini, gallerie, moduli, impostazioni, backup/ripristino, cestino, azioni di gruppo, nascondi (occhio), in evidenza (stella), in home (casetta), slug con redirect, SEO/schema, editor Visuale con blocchi protetti (immagine, galleria, Leggi tutto).
     * Regole da mantenere uguali: front matter come oggi (slug, slug_precedenti, published, featured, in_home, thumbnail, thumbnail_alt, categories), URL /blog/<categoria>/<slug>/ e /servizi/<slug>/, redirect dai vecchi slug, controllo doppioni, test e verifica_permalink.py come rete di sicurezza.
     * Fonti da leggere per ricostruire il comportamento: questo CLAUDE.md (punti numerati), admin/*.js, _plugins/permalink_da_categoria.rb, _layouts, _includes, verifica_permalink.py.
     * Idea di partenza (da rivalutare): contenuti ancora in file Markdown nel repo, motore Node al posto di Jekyll, stesso admin riusato; il backend lato server risolve token, anteprime e 301.

## 3. Script nuovo_sito.py per clonare in un colpo (idea, NIENTE DA FARE ORA)

Motivo: la procedura del punto 'NUOVO SITO DA QUESTO' nel blocco 'Questo progetto' di CLAUDE.md e' stata fatta a mano due volte (italfuni, edilextreme2). Mirco vuole renderla piu' veloce la prossima volta. Quando lo chiede, farla come UNO script Python idempotente (regola risparmio token), con `--dry-run` e output di poche righe:
- Input: nome del nuovo repo (e opzionalmente la cartella sorgente, default questa). Controlli prima di scrivere: cartella di destinazione inesistente, repo non gia' esistente su GitHub, sorgente senza modifiche non committate.
- Passi: creare la repo vuota con `gh repo create`, copiare con robocopy (esclusi `.git`, `_site`, `node_modules`, `.jekyll-cache`, `automazioni/.env`), `git init -b main`, commit, push, attendere il primo deploy, abilitare Pages, verificare l'HTML online.
- Da riscrivere nel clone: solo il blocco 'Questo progetto' di CLAUDE.md (nome, repo, URL, cartella). Tutto il resto e' gia' automatico.
- Lo script va documentato in CLAUDE.md (comando e opzioni) appena funziona.

## 4. Automazioni: contenuti ancora da coprire (idea, NIENTE DA FARE ORA)

Contesto: il 05/10/2026 sono nati i moduli di `automazioni/` (`python -m automazioni <modulo> <comando>`: menu, pagine, footer, config_sito, post; vedi `automazioni/README.md` e il blocco AUTOMAZIONI PYTHON in CLAUDE.md). Mirco vuole svilupparli ancora, ma NON adesso: iniziare solo quando lo chiede. Cosa manca, in ordine di utilita' probabile:
- Creare una pagina nuova da zero: `pagine` oggi modifica solo le pagine esistenti (front matter e singole righe). Manca un comando `crea`.
- Riscrivere il corpo intero di una pagina lunga: oggi si sostituiscono solo righe indicate una per una.
- Servizi dei cloni: `pubblica_servizi.py` e `pubblica_chi_siamo.py` esistono gia' (vedi CLAUDE.md) e NON fanno parte di `automazioni/`. DA VERIFICARE: se i cloni (trasporticorp, pannellisolari, mobilitaelettrica) hanno ancora servizi, chi-siamo e pagine con il testo della web agency romana copiato dal modello. Primo passo utile: scansione in sola lettura di un clone che elenchi i testi ancora da cambiare.
- Progetti (`/projects/`, sezione in home) e altre collection: NON ancora esaminati, non si sa come siano fatti ne' se servano moduli.
- Immagini (copertine, thumbnail, gallerie): nessun modulo. Per i post esiste solo il campo `--thumbnail` di `post crea`.
- Non coperti e fuori ambito per ora: pannello admin, redirect, sitemap.
- Da provare prima di fidarsi: i moduli `menu`, `footer`, `config_sito`, `post` sono stati provati solo in lettura; `pagine testi` solo in dry-run. Fare una prima scrittura vera su un clone (es. `footer fisso off --sito pannellisolari --dry-run`, poi senza `--dry-run`) e controllare `git diff --stat`.
- DA VERIFICARE: se `_config.yml` esclude `automazioni/` dal sito pubblicato (`exclude:`). Se non la esclude, i file `.py` e `.json` potrebbero essere raggiungibili online come file statici (non contengono password o token, ma conviene escluderli).
Regole da mantenere: ogni modulo nuovo con docstring dei 4 dati e una riga nel README di `automazioni/`; `--dry-run` prima di scrivere; testi in file JSON, mai scritti nel codice.
