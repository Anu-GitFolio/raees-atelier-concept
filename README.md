# Raees Atelier

A bilingual fragrance discovery and shopping demo built with HTML, CSS and JavaScript, backed by a Cloudflare Worker and D1.

[Open the site](https://raees-atelier-concept.raees-atelier-concept.workers.dev)

Browse 29 fragrances and oud products, choose variants, save favourites, or use the scent finder to narrow the collection by notes, form and budget. The bag, preferences and demo order history persist between visits in the same browser. Orders can be added back to the bag for another checkout.

This is an independent project, unaffiliated with Raees Al Oud. Checkout records demo orders only; it does not take payments or arrange delivery.

## Local development

Requires Node.js 22.12 or later and npm.

```sh
npm ci
npm run db:migrate
npm run dev
```

Open `http://127.0.0.1:8787`. Wrangler creates the local database under `.wrangler/state`. Local development does not need a Cloudflare login or API keys.

## Tests and builds

Keep the development server running for the API tests:

```sh
npm test
npm run build
```

The integration tests cover visitor isolation, bag validation, server-calculated prices, stale updates, duplicate checkout requests, order history, reorder and deletion.

For browser checks, run `npm run qa:prepare` and open `/__qa/` on the local server. The audit tools check accessibility and responsive layouts and are excluded from the production build. Existing browser coverage is Chromium; Safari, Firefox and real-device checks remain outstanding.

## Code layout

| Path | Purpose |
| --- | --- |
| `public/app.js` | Routing, English and Arabic views, event handlers and API requests |
| `public/style.css` | Layout, typography, motion and right-to-left styles |
| `server/index.js` | API routes, sessions and database writes |
| `server/domain.js` | Product validation and price calculations |
| `server/catalog.json` | Product and variant snapshot with source links |
| `db/schema.ts` | Database schema |
| `drizzle/` | SQL migrations |
| `tests/` | HTTP integration tests |

The browser renders the pages and sends changes to the Worker. D1 stores anonymous sessions and orders; product data comes from the bundled catalogue. Drizzle generates migrations, while request handlers use prepared SQL directly.

Prices are integer fils and are always looked up on the server. Writes include a revision number so an older tab cannot silently overwrite newer state. Checkout uses a per-session idempotency key and a unique database constraint to prevent a retried request from creating a second order.

The session cookie is HTTP-only, SameSite Strict and Secure on HTTPS. The database stores its hash. Sessions expire after 30 days, and reset deletes the session and its orders. There are no customer accounts or cross-device recovery.

## Deploy

The production configuration is in `wrangler.production.jsonc`. For a separate deployment, change the Worker name, create a D1 database and put its ID in the `DB` binding:

```sh
npx wrangler login
npx wrangler d1 create your-database-name
npm run db:migrate:production
npm run deploy
```

Apply new migrations before deploying code that depends on them. `npm run build` writes the browser assets to `dist/client` and the Worker to `dist/server`. `npm run review:package` creates a source archive under `artifacts/`, excluding dependencies, local database records and credentials.

## Catalogue and demo rules

Product data was checked on 16 September 2026 and is not connected to live inventory. The demo uses AED 25 delivery below an AED 1,000 subtotal and a 5% VAT-inclusive calculation. These are demo assumptions, not the merchant's approved terms.

A commercial launch would need an authorised commerce integration, confirmed pricing and policies, payment processing, inventory and fulfilment. Arabic copy also needs native editorial review.

Image sources and font licences are listed in [CREDITS.md](CREDITS.md).
