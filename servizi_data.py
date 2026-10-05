"""
servizi_data.py
================
UNICO file che devi editare per aggiungere/modificare un servizio.
Non tocca nulla da solo: e' solo la lista dati che genera_servizi.py legge.

Ogni servizio e' un dizionario con questi campi:

  slug        : usato nell'URL (es. "consulenza-seo" -> /blog/servizi/consulenza-seo/)
                SOLO minuscolo, senza spazi, trattini al posto degli spazi.
  titolo      : titolo mostrato in pagina e nei menu
  descrizione : 1 riga, usata come meta description (SEO) e anteprima blog
  intro       : primo paragrafo, sotto il primo H2 "Cosa include"
  voci        : lista di bullet point (stringhe) per "Cosa include"
  perche      : paragrafo per la sezione "Perche' e' importante"
  come        : paragrafo per la sezione "Come lavoriamo" (puoi lasciarlo
                vuoto "" per usare il testo standard uguale per tutti)

Aggiungere un nuovo servizio = copiare un blocco {...} e cambiare i valori.
Lo script genera_servizi.py si occupa del resto (H2 corretti per l'indice,
front matter, file nella cartella giusta, commit).
"""

SERVIZI = [
    {
        "slug": "consulenza-seo",
        "titolo": "Consulenza SEO",
        "descrizione": "Audit, strategia e ottimizzazione SEO per far crescere il traffico organico del tuo sito.",
        "intro": (
            "Una strategia SEO efficace parte da un'analisi approfondita del sito, "
            "dei competitor e degli obiettivi di business. Non ci limitiamo a "
            "\"ottimizzare le parole chiave\": costruiamo un piano che porta "
            "risultati misurabili nel tempo."
        ),
        "voci": [
            "**Audit SEO completo**: analisi tecnica, contenuti e struttura del sito",
            "**Ricerca keyword**: individuazione delle parole chiave con maggior potenziale",
            "**Ottimizzazione on-page**: title, meta description, struttura heading, contenuti",
            "**SEO tecnica**: velocita', indicizzazione, dati strutturati, mobile friendliness",
            "**Link building**: strategia di acquisizione link di qualita'",
            "**Reportistica periodica**: monitoraggio posizionamento e traffico organico",
        ],
        "perche": (
            "Il traffico organico e' uno dei canali piu' sostenibili nel tempo: una "
            "volta posizionato, un sito continua a generare visite senza costo per "
            "click. E' l'investimento che, a differenza dell'advertising, continua "
            "a rendere anche quando smetti di spendere."
        ),
        "come": "",  # vuoto = usa il testo standard condiviso
    },
    {
        "slug": "web-marketing-strategico",
        "titolo": "Web marketing strategico",
        "descrizione": "Analisi di target e concorrenti per costruire una strategia di web marketing solida e misurabile.",
        "intro": (
            "Prima di ogni azione operativa studiamo il tuo mercato, il tuo "
            "pubblico e i tuoi concorrenti: solo cosi' ogni scelta successiva "
            "(canali, contenuti, budget) ha una direzione chiara."
        ),
        "voci": [
            "**Analisi di target e buyer persona**",
            "**Studio della concorrenza** sui canali digitali",
            "**Piano strategico** con obiettivi e priorita' per canale",
        ],
        "perche": (
            "Senza una strategia di partenza si rischia di disperdere budget su "
            "canali e messaggi che non parlano al pubblico giusto."
        ),
        "come": "",
    },
    {
        "slug": "consulenza-ecommerce",
        "titolo": "Consulenza eCommerce",
        "descrizione": "Consulenza per far crescere vendite, conversioni e marginalita' del tuo negozio online.",
        "intro": (
            "Analizziamo il tuo eCommerce a 360 gradi - dal funnel d'acquisto "
            "alla scheda prodotto - per individuare dove si perdono vendite e "
            "come recuperarle."
        ),
        "voci": [
            "**Audit del funnel d'acquisto** e del checkout",
            "**Ottimizzazione schede prodotto** e categorie",
            "**Piano di crescita** su traffico, conversioni e marginalita'",
        ],
        "perche": (
            "Piccoli attriti nel percorso d'acquisto costano vendite ogni giorno: "
            "trovarli e sistemarli e' spesso piu' redditizio di aumentare il "
            "traffico."
        ),
        "come": "",
    },
    {
        "slug": "lead-generation",
        "titolo": "Lead generation",
        "descrizione": "Generazione di contatti qualificati con marketing e CRM integrati.",
        "intro": (
            "Costruiamo un sistema di acquisizione contatti che unisce campagne "
            "di marketing e gestione CRM, cosi' ogni lead viene tracciato e "
            "seguito fino alla conversione."
        ),
        "voci": [
            "**Campagne di acquisizione lead** su piu' canali",
            "**Integrazione con il CRM** per il tracciamento",
            "**Nurturing** dei contatti raccolti",
        ],
        "perche": (
            "Generare contatti senza un sistema che li segue e li qualifica "
            "significa sprecare gran parte dell'investimento fatto per portarli."
        ),
        "come": "",
    },
    {
        "slug": "web-analytics-e-cro",
        "titolo": "Web analytics e CRO",
        "descrizione": "Analisi dei dati e ottimizzazione del tasso di conversione del sito.",
        "intro": (
            "Misuriamo il comportamento reale degli utenti sul sito per capire "
            "dove abbandonano e testare modifiche che aumentano le conversioni."
        ),
        "voci": [
            "**Configurazione e audit di analytics**",
            "**Analisi del comportamento utenti** (heatmap, funnel)",
            "**Test A/B** per ottimizzare le conversioni",
        ],
        "perche": (
            "Ottimizzare le conversioni sul traffico che gia' hai e' spesso piu' "
            "veloce ed economico che aumentare il traffico stesso."
        ),
        "come": "",
    },
    {
        "slug": "reputazione-online",
        "titolo": "Reputazione online",
        "descrizione": "Monitoraggio e gestione della reputazione online del tuo brand.",
        "intro": (
            "Monitoriamo cosa si dice del tuo brand online - recensioni, "
            "menzioni, discussioni - e costruiamo un piano per proteggerne e "
            "migliorarne l'immagine."
        ),
        "voci": [
            "**Monitoraggio recensioni e menzioni**",
            "**Gestione delle recensioni** su Google e altre piattaforme",
            "**Strategia di miglioramento** della percezione del brand",
        ],
        "perche": (
            "La reputazione online influenza direttamente le decisioni d'acquisto: "
            "ignorarla significa lasciarla in mano al caso."
        ),
        "come": "",
    },
    # ---- prossimo servizio: copia il blocco sopra e modifica i valori ----
]

def _servizio_leggero(slug, titolo, descrizione):
    """Genera un blocco servizio 'leggero' standard: intro breve, 3 bullet
    generici basati sul nome, perche' generico. Da rifinire in una seconda
    passata (2026-09-22, richiesto in chat: 'ora leggeri, dopo seconda
    passata ci sfoghiamo'). Non tocca i servizi gia' scritti a mano sopra."""
    return {
        "slug": slug,
        "titolo": titolo,
        "descrizione": descrizione,
        "intro": (
            f"Il servizio di {titolo.lower()} fa parte della nostra offerta: "
            "ti affianchiamo con un approccio pratico, basato su dati e "
            "obiettivi di business chiari fin dall'inizio."
        ),
        "voci": [
            f"**Analisi iniziale** dedicata a {titolo.lower()}",
            "**Piano operativo** su misura per la tua attivita'",
            "**Monitoraggio dei risultati** nel tempo",
        ],
        "perche": (
            f"Investire in {titolo.lower()} in modo strutturato, invece che "
            "in modo estemporaneo, porta risultati piu' solidi e misurabili "
            "nel tempo."
        ),
        "come": "",
    }


_SERVIZI_LEGGERI = [
    # Strategia e consulenza (restanti)
    ("dashboard-e-business-intelligence", "Dashboard e business intelligence", "Dashboard su misura per monitorare in tempo reale i dati chiave della tua attivita'."),
    ("data-strategy", "Data strategy", "Strategia per raccogliere, organizzare e usare i dati della tua azienda."),
    ("analisi-predittiva-e-reporting-ai", "Analisi predittiva e reporting AI", "Report e previsioni basate su AI per anticipare l'andamento del business."),
    ("analisi-competitiva-con-ai", "Analisi competitiva con AI", "Analisi dei concorrenti automatizzata con strumenti di intelligenza artificiale."),
    # SEO, GEO e visibilita' (Consulenza SEO gia' presente)
    ("audit-seo-del-sito", "Audit SEO del sito", "Analisi tecnica e strategica completa dello stato SEO del tuo sito."),
    ("seo-per-aziende", "SEO per aziende", "Percorsi SEO pensati per le esigenze di aziende strutturate."),
    ("seo-per-ecommerce", "SEO per eCommerce", "Ottimizzazione SEO specifica per negozi online e schede prodotto."),
    ("local-seo-google-my-business", "Local SEO / Google My Business", "Ottimizzazione della presenza locale su Google per attirare clienti vicini."),
    ("geo", "GEO", "Ottimizzazione della visibilita' su ChatGPT, Gemini e Perplexity."),
    ("geo-audit-e-strategy", "GEO Audit e Strategy", "Audit e strategia per la visibilita' sui motori di risposta AI."),
    ("seo-ai-driven", "SEO AI-driven", "Strategie SEO che integrano strumenti e processi basati su AI."),
    ("ai-search", "AI Search", "Ottimizzazione della presenza su TikTok, Amazon e YouTube come motori di ricerca."),
    ("link-building-e-digital-pr", "Link building e Digital PR", "Acquisizione di link e visibilita' editoriale di qualita'."),
    ("seo-copywriting", "SEO copywriting", "Testi ottimizzati per i motori di ricerca e per chi legge."),
    ("amazon-seo", "Amazon SEO", "Ottimizzazione delle schede prodotto per la ricerca interna di Amazon."),
    # Advertising (PPC)
    ("google-ads", "Google Ads", "Campagne Search, Shopping, Display, YouTube e PMax su Google Ads."),
    ("meta-ads", "Meta Ads", "Campagne pubblicitarie su Facebook e Instagram."),
    ("tiktok-ads", "TikTok Ads", "Campagne pubblicitarie su TikTok."),
    ("linkedin-ads", "LinkedIn Ads", "Campagne pubblicitarie B2B su LinkedIn."),
    ("ppc-per-ecommerce", "PPC per eCommerce", "Campagne a pagamento pensate per negozi online."),
    ("social-ads-per-ecommerce", "Social ads per eCommerce", "Advertising sui social pensato per vendere prodotti online."),
    # Social e contenuti
    ("social-media-marketing", "Social media marketing", "Gestione strategica dei canali social del tuo brand."),
    ("influencer-marketing", "Influencer marketing", "Collaborazioni con creator per aumentare visibilita' e credibilita'."),
    ("content-creation-e-marketing", "Content creation e marketing", "Creazione di contenuti e strategia editoriale per i tuoi canali."),
    ("email-marketing", "Email marketing", "DEM, newsletter e automation via email per fidelizzare i clienti."),
    ("video-marketing", "Video marketing", "Produzione di video per comunicare il tuo brand e i tuoi prodotti."),
    ("infografica-e-grafica-animata", "Infografica e grafica animata", "Contenuti visivi e animati per comunicare dati e concetti."),
    ("grafica-per-social", "Grafica per social", "Grafica coordinata per i tuoi profili social."),
    ("podcast", "Podcast", "Produzione e strategia di un podcast per il tuo brand."),
    # Design e brand
    ("brand-identity", "Brand identity", "Costruzione dell'identita' visiva e valoriale del tuo brand."),
    ("web-design", "Web design", "Progettazione grafica di siti web efficaci e coerenti col brand."),
    ("ui-ux-design", "UI/UX design", "Progettazione dell'esperienza e dell'interfaccia utente."),
    # Sviluppo web
    ("siti-web-aziendali-e-portali", "Siti web aziendali e portali", "Realizzazione di siti web aziendali e portali su misura."),
    ("landing-page-e-funnel", "Landing page e funnel", "Landing page e funnel pensati per convertire i visitatori."),
    ("restyling-del-sito", "Restyling del sito", "Rinnovamento grafico e funzionale di un sito esistente."),
    ("sviluppo-ecommerce", "Sviluppo eCommerce", "Sviluppo eCommerce su Shopify, WooCommerce, Magento e PrestaShop."),
    ("cms-custom", "CMS custom", "Sviluppo di sistemi di gestione contenuti su misura."),
    ("blog", "Blog", "Realizzazione e gestione di un blog aziendale."),
    ("siti-mobile-e-web-app", "Siti mobile e web app", "Sviluppo di siti responsive e web app."),
    ("sito-multilingua", "Sito multilingua", "Realizzazione di siti in piu' lingue."),
    ("frontend-editing", "Frontend editing", "Modifiche e interventi sul frontend del sito."),
    ("sviluppo-su-misura", "Sviluppo su misura", "Sviluppo di soluzioni web personalizzate."),
    ("manutenzione-e-infrastruttura", "Manutenzione e infrastruttura", "Manutenzione continuativa e gestione dell'infrastruttura del sito."),
    ("pulizia-malware-e-delisting", "Pulizia malware e delisting", "Rimozione di malware e recupero della reputazione presso i motori di ricerca."),
    # Software e applicazioni
    ("app-mobile", "App mobile", "Sviluppo di app mobile per iOS e Android."),
    ("gestionali-e-intranet", "Gestionali e intranet", "Sviluppo di gestionali e intranet, anche con ERP e AI."),
    # AI e automazione
    ("agenti-ai-per-aziende", "Agenti AI per aziende", "Agenti AI su misura per i processi della tua azienda."),
    ("agenti-ai-per-vendite", "Agenti AI per vendite", "Agenti AI dedicati al supporto delle vendite."),
    ("agenti-ai-customer-service", "Agenti AI customer service", "Agenti AI per l'assistenza clienti."),
    ("agenti-ai-vocali", "Agenti AI vocali", "Agenti AI per interazioni vocali con i clienti."),
    ("chatbot-e-assistenti-virtuali", "Chatbot e assistenti virtuali", "Sviluppo di chatbot e assistenti virtuali."),
    ("workflow-automation", "Workflow automation", "Automazione dei processi aziendali con strumenti come n8n e Make."),
    ("lead-scoring-con-ai", "Lead scoring con AI", "Valutazione automatica della qualita' dei lead tramite AI."),
    ("email-e-crm-automation", "Email e CRM automation", "Automazione dei flussi email e del CRM."),
    ("video-ai-short-form", "Video AI short-form", "Produzione di video brevi generati con AI per Reel, TikTok e Shorts."),
    ("visual-ai-su-larga-scala", "Visual AI su larga scala", "Produzione di contenuti visivi con AI su larga scala."),
    ("copy-multilingua-con-ai", "Copy multilingua con AI", "Produzione di testi in piu' lingue con l'ausilio dell'AI."),
    ("brand-voice-ai", "Brand voice AI", "Definizione e applicazione di una voce del brand coerente tramite AI."),
    ("personalizzazione-1-to-1", "Personalizzazione 1-to-1", "Esperienze personalizzate per ogni singolo utente o cliente."),
    ("ai-commerce", "AI Commerce", "Applicazione dell'AI ai processi di vendita online."),
    ("cro-con-ai", "CRO con AI", "Ottimizzazione del tasso di conversione con strumenti di AI."),
    # Settori verticali
    ("marketing-turistico", "Marketing turistico", "Marketing digitale per hotel, OTA e tour operator."),
    ("marketing-per-professionisti", "Marketing per professionisti", "Marketing digitale pensato per studi e liberi professionisti."),
]

for _slug, _titolo, _descrizione in _SERVIZI_LEGGERI:
    SERVIZI.append(_servizio_leggero(_slug, _titolo, _descrizione))
