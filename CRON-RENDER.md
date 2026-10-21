# Render Cron Job — istruzioni

Il Web Service esistente va mantenuto. Configura **New > Cron Job** collegato allo stesso repository e branch:

- Name: `domakale-seo-de-hourly`
- Runtime: Node
- Build: `npm install`
- Command: `node cron.js`
- Schedule: `0 6-16 * * *` oppure più semplicemente `0 * * * *` (UTC; nel codice è verificata la fascia 08–17 Europe/Rome).

**Raccomandazione:** usare `0 * * * *`, così il fuso orario viene gestito senza variazioni durante l'anno. Il job farà nulla fuori fascia.

Aggiungere al Cron Job le sole variabili:
`APP_BASE_URL=https://domakale-seo-generator-de.onrender.com`
`ADMIN_USER=...` (uguale al Web Service)
`ADMIN_PASSWORD=...` (uguale al Web Service)

Nel Web Service impostare:
`SHOPIFY_SHOP_DOMAIN=<negozio>.myshopify.com`
`SHOPIFY_ADMIN_TOKEN=<token app con read_products,read_content,write_content,read_translations,write_translations come applicabile>`
`SHOPIFY_API_VERSION=2026-10`
`SHOPIFY_PUBLIC_BASE_URL=https://domakale.it`
`ALLOW_AUTO_PUBLISH=false` durante collaudo; abilitarlo SOLO dopo test SEO e verifiche di accesso, mercati, metadata.

Nel pannello online, attivare **Automazione**. Inizialmente il Cron Job genera una pagina, la salva come bozza Shopify e non la pubblica finché `ALLOW_AUTO_PUBLISH` non viene esplicitamente abilitato.

**Non** creare un nuovo database. Il Web Service aggiorna lo schema del PostgreSQL già in uso.
