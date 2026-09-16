# Technical handoff

## API

All state endpoints use the visitor's HTTP-only session cookie. No client-supplied owner ID is trusted.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/catalog` | GET | Read curated public product snapshot |
| `/api/session` | POST | Create or resume a 30-day anonymous session |
| `/api/state` | GET | Read validated bag, favourites and scent profile |
| `/api/cart` | PUT | Replace validated bag using expected revision |
| `/api/wishlist` | PUT | Replace saved product IDs using expected revision |
| `/api/profile` | PUT | Save validated scent preferences |
| `/api/orders` | POST | Create an idempotent simulated order |
| `/api/orders` | GET | Read only the current session's order history |
| `/api/orders/:id` | GET | Read only an order owned by the current session |
| `/api/reorder` | POST | Merge an owned order into the current bag at catalogue prices |
| `/api/reset` | POST | Delete the current session and its dependent orders |

Writes require `Origin` to equal the request origin and `X-Requested-With: raees-concept`. JSON writes are bounded to 8 KB except session initialization, which accepts no meaningful user payload. Session mutations are limited to 120 per minute. Quantities are 1–10, bags have up to 20 distinct variants, and each visitor can create up to 50 demo orders. A public production deployment additionally needs edge-level abuse limits for session creation and read traffic.

## Data model and consistency

`sessions` stores a hash of an opaque random token, JSON bag/wishlist/profile state, revision, expiry and rate-limit counters. `orders` references the session with delete cascade, snapshots each item's identity/price/quantity, and stores totals and creation time. A unique index on `(session_id, idempotency_key)` prevents duplicate logical submissions. An index on `(session_id, created)` supports history; expiry is indexed for cleanup.

The cookie is Secure on HTTPS, HTTP-only, SameSite=Strict, host-scoped, and expires after 30 days. Expired credentials cannot read records. A bounded cleanup runs on new session creation; a production system should add scheduled cleanup with a documented retention SLA. Clearing cookies loses the anonymous collection; this is disclosed in the UI.

Money uses integer fils. Demo delivery is AED 25 below AED 1,000 subtotal, otherwise free. The displayed demo VAT is one twenty-first of the inclusive total (including demo delivery), rounded to the nearest fils. No financial ledger or real tax invoice is generated.

## Existing commerce integration

The public site states that it uses Shopify. A production path would retain it as the commerce source of truth:

1. Replace the snapshot catalogue with an authorized Storefront API integration and confirmed localized content.
2. Use Shopify's cart and hosted checkout; remove simulated checkout and let the commerce platform determine prices, inventory, taxes, delivery and payment options.
3. Use an approved customer identity flow for cross-device collections; never reuse this anonymous session as authenticated identity.
4. Consume signed, verified order webhooks with deduplication and reconciliation if order data must be mirrored.
5. Confirm refund/shipping copy, trade identity, image rights, Arabic copy and privacy arrangements with the business.

The demonstration does not send messages or pretend to integrate payment providers. Merchant credentials and business decisions are required before those can be live.

## Deployment

`npm run build` emits a Workers-compatible `dist/server/index.js`, minified browser files under `dist/client`, with versioned SQL migrations in `drizzle/`. The production configuration binds the application to Cloudflare D1. Do not rewrite migrations after they have been applied; append new migrations for later schema changes.

Keep research downloads, development audits and operational secrets out of public assets. Development audit files are excluded from the build. The project carries `noindex,nofollow` and is presented as an independent portfolio demonstration.
