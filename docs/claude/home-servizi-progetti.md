# Box della home: servizi e progetti (DINAMICI)

Riassunto in `CLAUDE.md` > Punti critici n.14. Codice in `_pages/home.md` (blocchi `SERVIZI HOME` e `PROGETTI HOME`). Nessuna card scritta a mano.

## I nostri servizi (campo `in_home`)

- Ciclo Liquid su `site.servizi` (la collection) con `in_home: true`, ordinati per titolo; descrizione tagliata a 8 parole. Se nessun servizio ha la casetta la sezione sparisce.
- La casetta (lista admin Servizi e lista Progetti; `A.inHome` in `admin/admin-views.js`) scrive/toglie SOLO la riga `in_home`.
- `in_home` e' un campo SEPARATO da `featured` (la stella del blog): non unificarli.
- `pubblica_servizi.py` salta il riallineamento della home se trova il marker `SERVIZI HOME START (DINAMICO)`.
- Non reintrodurre card `<a class="srv-home-card">` a mano.

## I nostri progetti

- Ciclo Liquid sui primi 6 di `site.projects`, ordinati per `importance` (1 = primo; senza `importance` vanno in fondo), come la pagina `/projects/`.
- Se almeno un progetto ha `in_home: true` il box mostra SOLO quelli; altrimenti i primi 6 per `importance`.
- Se il progetto ha `redirect:` esterno il link va li', altrimenti alla sua pagina.
- Per far salire un progetto: abbassa il suo `importance`. Per cambiare quanti: `limit: 6` nel ciclo.
- Classi `prj-home*` separate da `srv-home*` apposta, cosi' `pubblica_servizi.py` (che lavora su `.srv-home-card`) non le tocca.
