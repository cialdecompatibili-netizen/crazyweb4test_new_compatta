# Richieste API dell'admin (ottimizzazione del 04/10/2026)

Codice: `admin/admin.js` (`api`, `getFile`, `getFiles`, `pollDeploy`) e le viste che leggono molti file. Riassunto in `CLAUDE.md` > Punti critici n.22.
Test automatico (GitHub finto, 9 scenari): `node docs/claude/test_admin_api.js` dalla radice del repo. Rilanciarlo dopo ogni modifica a `api`, `getFiles` o `pollDeploy`.

## Regole

1. **Mai `Promise.all(files.map(getFile))`** per leggere il contenuto di molti file. Si usa `A.getFiles(dir, files[, {strict:true}])`, con `files` = elenco di `A.getDir` (servono `name`, `path`, `sha`). Ritorna gli oggetti nello stesso ordine con `text` (e `null` per un file illeggibile, salvo `strict`).
2. **`A.getFile` resta per le SCRITTURE**: prima di `putFile`/`delFile` serve lo sha vero letto un attimo prima. `getFiles` non si usa per quello.
3. **Ogni GET e' condizionale** (`cache: 'no-cache'` in `api()`): ETag -> 304. Un 304 autenticato non consuma il limite orario di 5000 richieste (docs.github.com, Best practices > Use conditional requests). Evita anche gli elenchi vecchi: GitHub manda `max-age=60` e prima il browser poteva riservire per un minuto un elenco letto prima di un salvataggio.
4. **Cache per sha** (`BLOB` in `admin.js`): lo sha identifica il contenuto in modo immutabile, quindi non va mai invalidata. Dopo un salvataggio cambia lo sha e viene riletto solo quel file. Vive solo in memoria (si azzera con F5).

## Come legge `getFiles`

1. I file con sha gia' in cache: 0 richieste.
2. I mancanti: UNA query GraphQL (un alias per file, a blocchi di 100) invece di N richieste REST.
3. Se GraphQL fallisce (token senza permesso, rete): richieste REST a gruppi di 6, e per 5 minuti non si riprova GraphQL (`GQL_OFF`).
4. Se l'oid restituito non coincide con lo sha dell'elenco (file cambiato nel frattempo) o il testo e' troncato: REST per quel file.

## Dove e' usato

- `admin-views.js`: lista di Articoli/Progetti/Servizi (stella, casetta, categoria della pagina corrente) e `loadCats` (categorie nell'editor: PRIMA leggeva TUTTI i post a ogni apertura dell'editor).
- `admin-categories.js`: pagina Categorie articoli (tutti i post).
- `admin-menu.js`: Pagine e Menu (tutte le pagine, `strict`).
- NON toccati: `admin-modules.js` (lettura dei file di un modulo) e le scritture.

## `pollDeploy` (pallino del deploy)

- Ogni giro = 3 richieste (ultimo commit, run Actions, stato Pages). Il primo giro riusa i dati appena letti (3 richieste invece di 5).
- Intervalli crescenti: 5 s nel primo minuto, 8 s fino a 3 minuti, 12 s dopo. Limite totale invariato (6 minuti); "Nessun deploy necessario" dopo 40 s senza run come prima. Il verde puo' arrivare fino a 12 s piu' tardi nei deploy lunghi.

## Cosa NON e' stato misurato

- Il comportamento nel browser (login, editor, liste): provato solo con il test automatico e la sintassi. Dopo ogni modifica a questi file: Ctrl+F5 sull'admin e prova di una lista, dell'editor di un articolo e di Categorie articoli.
- Se il token ha il permesso solo sui contenuti, GraphQL potrebbe rifiutare: in quel caso funziona il ripiego REST (a gruppi di 6), senza il guadagno maggiore.
- La versione degli script e' nel parametro `?v=` di `admin/index.html`: va cambiata a ogni modifica, altrimenti il browser tiene i file vecchi.


## Irrobustimento (03/10/2026, sera)

- **A.jq(x)**: OBBLIGATORIO per ogni nome/id dentro un onclick=\"A.fn('...')\" (al posto di esc). Con esc un nome con apostrofo o backslash (immagine l'arte.jpg, categoria l'arte) chiudeva la stringa JS e il pulsante moriva. Gia' applicato a tutti i moduli (patch_jq.py).
- **Percorsi**: getFile/getDir/putFile/delFile codificano il percorso con ep() (spazi, #, %, ?). Passare SEMPRE percorsi grezzi.
- **File > 1 MB**: getFile ora fallisce con errore 413 chiaro (prima dava testo vuoto e un salvataggio avrebbe cancellato il file).
- **commitFiles**: ogni voce accetta sha (letto prima): se il file nel repo e' cambiato il commit fallisce con 409 e non scrive niente. Usato da azioni di gruppo (`editMany`), cestino (`toTrash`) e categorie (rinomina/elimina). Test: scenari 10 e 11 di `test_admin_api.js`.
- **pollDeploy**: un solo ciclo vivo (contatore POLL); pi() distingue rete assente (status 0), 403 e 5xx con messaggi chiari; login accetta URL GitHub incollato.
- Dopo queste modifiche: Ctrl+F5 e provare login, lista, editor, immagine con apostrofo, Categorie.

