# Raees Al Oud — Independent commerce concept

[Open the review site](https://raees-atelier-concept.raees-atelier-concept.workers.dev)

A working portfolio study of fragrance discovery and return visits. Vanilla HTML, CSS and JavaScript in the browser; a JavaScript Cloudflare Worker and SQLite-compatible D1 database on the server. No frontend framework and no production runtime npm dependencies.

This is unaffiliated with Raees Al Oud. It does not take payments, send messages, create real customer accounts or ship products.

## Run locally

Requires Node.js 22.12+ (Node 24 LTS recommended) and npm.

```sh
npm ci
npm run db:migrate
npm run dev
```

Open http://127.0.0.1:8787. The local D1 database persists under `.wrangler/state`. No Cloudflare login, external API key, or payment credentials are needed for local operation.

```sh
npm test              # API integration tests; keep the dev server running
npm run build         # Minified frontend and Worker output
npm audit             # Dependency advisory check
npm run db:generate   # Generate a migration after schema edits
```

The browser audit at `/__qa/` is development-only. Run `npm run qa:prepare` first to provide its local axe script, then use its buttons for accessibility and responsive checks. Audit pages and scripts are excluded from production builds.

## Working features

- 29 sourced catalogue references across five fragrance forms; category filtering, price sorting, EN/AR search and product galleries.
- Variant selection and availability; server-owned pricing in integer fils.
- Three-step scent finder with transparent, deterministic matches, budget filtering and honest no-match alternatives.
- Persistent saved products, scent preferences, cart, simulated orders and reordering, isolated by visitor.
- English and Arabic through the full journey, including dialogs, errors, empty states and checkout.
- Responsive layouts, reduced motion, native accessible dialogs, keyboard focus restoration and status announcements.
- Reset deletes the visitor's database session and cascades to its demo orders.

## Project map

| Location | Responsibility |
| --- | --- |
| `public/index.html` | HTML shell, metadata, local fonts and assets |
| `public/app.js` | Router, bilingual rendering and UI interactions |
| `public/style.css` | Tokens, responsive design, animation and RTL |
| `server/index.js` | API routing, visitor isolation, validation and order writes |
| `server/domain.js` | Catalogue validation and authoritative totals |
| `server/catalog.json` | Curated snapshot of product data, with source links |
| `db/schema.ts` | Drizzle schema used only to generate SQL migrations |
| `drizzle/` | Versioned database migrations |
| `tests/api.test.mjs` | End-to-end HTTP/database integration checks |
| `docs/CASE-STUDY.md` | Research, design decisions, iterations and measurement plan |
| `docs/HANDOFF.md` | Backend architecture, production boundaries and integration plan |
| `docs/VALIDATION.md` | What was actually tested and its limitations |

## Important boundaries

Prices and availability are reference data reviewed on 16 September 2026, not a live Shopify integration. Checkout uses an explicit AED 25 delivery assumption, free at AED 1,000 subtotal, with a 5% VAT-inclusive demo calculation. No claim is made that these are the business's approved commercial terms.

Session records last 30 days in this browser; clearing cookies loses access. There is no account or cross-device recovery. Production would need approved customer identity, retention processes, verified policies, authorized product assets, native Arabic editorial review, and integrations with the existing commerce system.

See `docs/ASSETS.md` for image and font provenance. The hero is an illustrative editorial still life; product photographs belong to their respective owners.

## Hosting and source review

See [deployment instructions](docs/DEPLOYMENT.md) for the Cloudflare Workers and D1 setup. The production deployment uses `wrangler.production.jsonc` and the optimized build. `npm run review:package` prepares a portable source archive with the application, tests and documentation.
