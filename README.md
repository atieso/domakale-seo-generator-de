# DOMAKALÈ SEO Generator DE — v0.4 (GitHub + Render)

Questa release estende la v0.3 e **non** crea un nuovo database. È compatibile con la tabella `seo_de_state` precedente.

## Cosa include
- Gestione della coda di keyword esistente
- Impostazione limite giornaliero 1–10
- Cron Job Render orario in fascia 08–17 (fuso Europe/Rome)
- Recupero delle collezioni Shopify tramite GraphQL
- Generazione AI delle landing, verifica degli handle e controlli base
- Creazione di pagine Shopify **non pubblicate** usando il template `seo-de` e il metafield JSON `seo_de.landing`
- Possibilità di pubblicazione automatica con doppia abilitazione: switch sulla dashboard e `ALLOW_AUTO_PUBLISH=true` su Render
- Tracciamento di stati e pubblicazioni in PostgreSQL

## Installazione
1. Sovrascrivere i file nel repository GitHub esistente **alla radice**, mantenendo le variabili ambiente del Web Service.
2. Aggiungere `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_TOKEN`, `SHOPIFY_API_VERSION`, `SHOPIFY_PUBLIC_BASE_URL`, `ALLOW_AUTO_PUBLISH=false` al Web Service Render.
3. Verificare che l'app Shopify abbia gli scope per la lettura delle collezioni (`read_products`) e per la creazione di pagine (`write_content` o `write_online_store_pages`, secondo configurazione API).
4. Attendere il deploy e aprire la dashboard: appare la sezione 'Automazione Shopify Germania'.
5. Configurare su Render un **Cron Job** separato, seguendo `CRON-RENDER.md`. Il cron chiama il Web Service: non richiede una propria connessione PostgreSQL.
6. Caricare 2 keyword test. Attivare l'automazione e usare il comando 'Esegui un ciclo test' nella fascia 08–17 Europe/Rome. Dovrebbe creare una bozza Shopify con modello `seo-de`.
7. Controllare su Shopify i metafield, il rendering DE, il noindex in IT, i canonical/hreflang, la disponibilità delle collezioni sul mercato DE e i metadata. Solo quando è tutto corretto impostare `ALLOW_AUTO_PUBLISH=true`.

## Limitazioni importanti
- La release imposta contenuti nel template, ma **non registra ancora in Shopify le traduzioni dei SEO title/meta description**; il payload AI li conserva per l'integrazione successiva.
- Il controllo di disponibilità effettiva delle collezioni nel mercato Germania non è implementato: il sistema verifica che la collezione Shopify esista, non che sia pubblicata per il mercato.
- Il rilevamento della cannibalizzazione è basilare (slug e keyword) e non sostituisce una revisione semantica.
- `ALLOW_AUTO_PUBLISH` deve restare `false` finché questi controlli e la SEO DE non sono completati. Con valore `false`, non pubblica automaticamente pagine live.
- Se hai cambiato modello o struttura di metafield rispetto al Modulo 1, confronta l'esempio con il template installato prima dell'uso.
- L'AI non garantisce che tutte le pagine siano originali o utili; 10 è un limite massimo, non un obiettivo SEO.

## Sicurezza
Le credenziali Render, Shopify e OpenAI vanno configurate soltanto nelle variabili di ambiente. Non caricare `.env` nel repository. Evitare di diffondere link con segreti in querystring.

## API aggiunte (autenticazione HTTP Basic già presente)
- `GET /api/automation/status`
- `PUT /api/automation/settings`
- `POST /api/automation/tick`
- `GET /api/automation/events`
- `GET /api/shopify/collections`
- `POST /api/shopify/publish/:id` (pubblicazione manuale di una bozza già creata; usare solo dopo controllo SEO)

## Nota operativa
Per il primo deploy mantenere `enabled=false` nel pannello. L'attivazione del Cron Job e della dashboard sono passaggi distinti.
