# DOMAKALÈ SEO Generator DE — Modulo 2, GitHub + Render

Dashboard Node.js/Express per keyword e bozze tedesche con OpenAI, salvate su **PostgreSQL**. Non pubblica ancora su Shopify (Modulo 3).

## Deploy — nessuna installazione locale richiesta

1. Crea un repository GitHub **privato** (es. `domakale-seo-generator-de`) e carica **il contenuto di questa cartella alla radice** del repository (incluso `render.yaml`). Non caricare file `.env` né password.
2. In Render crea un **Postgres** database persistente. Copia la **Internal Database URL** se database e Web Service sono nello stesso account/regione Render; se utilizzi un Postgres esistente, verifica che sia raggiungibile.
3. In Render seleziona **New → Blueprint**, collega il repository GitHub; render.yaml crea il Web Service. In alternativa crea Web Service Node manuale da GitHub: Build `npm install`, Start `npm start`, Health Check `/healthz`.
4. Imposta **Environment**: `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `ADMIN_USER`, `ADMIN_PASSWORD` (almeno 16 caratteri), `COLLECTION_HANDLES` (handle reali delle collezioni, separati da virgola), `NODE_ENV=production`.
5. Avvia il deploy, attendi che `/healthz` restituisca `{"ok":true}` e apri l'URL HTTPS del Web Service. La dashboard chiede credenziali HTTP Basic.
6. Importa 2 keyword, genera una bozza, approvala e verifica che **resti nel database dopo un deploy**. Il database viene inizializzato automaticamente con una tabella `seo_de_state`.

## Sicurezza e uso
- Usa un repository privato e una password forte, proteggi l'accesso Render e non mettere segreti nel codice. L'app non incorpora chiavi nel frontend.
- Attualmente la dashboard usa **Basic Auth su HTTPS**; per uso con più operatori aggiungere autenticazione con sessioni/SSO e rate limiting prima di aprirla a utenti esterni.
- Per ambienti produttivi, abilita i backup PostgreSQL compatibili col tuo piano Render.
- È possibile che Render addebiti il Web Service e il database; controlla i piani disponibili e le condizioni attuali.
- Il file `render.yaml` configura il **servizio web**, non crea automaticamente il database: collegalo prima.
- Il controllo duplicati è per keyword normalizzata, non una keyword research esterna; verifica pertinenza e contenuti prima di approvare.
- Il modulo 2 genera bozze ed esporta un JSON per metafield `seo_de.landing`: **non crea pagine Shopify**, funzione del Modulo 3.
- Il campo `DATABASE_URL` è obbligatorio: il server non parte se manca, evitando perdita silenziosa di dati sul filesystem.
- Se intendi riutilizzare il database italiano, usa una tabella separata; questa versione crea esclusivamente `seo_de_state`.

## Rotte
- `GET /healthz` controllo di salute pubblico, non espone segreti
- `/` dashboard protetta
- `/api/config`, `/api/drafts`, `/api/import`, `/api/generate/:id`, `/api/approve/:id`, `/api/export/:id` protette

## Verifica codice
`npm install` poi `npm run check` (facoltativo: in un ambiente CI); Render esegue `npm install` al deploy.
