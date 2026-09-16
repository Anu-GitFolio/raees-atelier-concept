# Validation record

Verified 16 September 2026 against the local development server and the bundled production Worker.

## Functional and security checks

`npm test` passes all three integration groups against both servers. Assertions cover session persistence, visitor isolation, saved products, authoritative pricing despite client price tampering, quantity and product validation, unavailable variants, duplicate bag lines, delivery threshold calculations, stale-write conflicts, cross-origin rejection, concurrent idempotent checkout, owned-order reads, history, reorder, saved preferences, cascading reset, malformed JSON objects and an 8 KB request limit.

Browser walkthroughs verified product selection, saving, adding to the bag, cost breakdown, demo checkout, confirmation, history after reload, reorder and the three-step fragrance finder. Search returned the two expected rose matches and a useful no-match state. Escape closed the dialog and restored focus to its opener (a search input first consumes Escape to clear its value).

## Accessibility and responsive behaviour

The local audit harness ran axe WCAG 2 A/AA, 2.1 AA and 2.2 AA checks on home, collection, product, finder, personal collection, checkout and privacy in English and Arabic: **14 combinations, zero reported violations** after correcting footer contrast. Automated tools do not establish complete WCAG conformance.

A separate sweep checked home, collection, product, finder and checkout in both languages at 320, 360, 390, 768, 1024 and 1440 CSS pixels, with normal and doubled root text size: **120 combinations, zero page overflow or header-control overlap failures**. Computed font sizes were verified as 16 px and 32 px. Text enlargement is not identical to every browser's zoom behaviour.

Visual checks covered desktop home and bag, English phone home, and Arabic phone home and finder results. Keyboard dialog dismissal and focus restoration were checked. Reduced-motion handling is implemented in CSS. These checks used Chromium; Safari, Firefox, real-device touch testing, screen-reader testing and native Arabic editorial review remain release checks.

## Build and dependency checks

- Production build succeeds; the bundled Worker passes the same integration suite.
- Browser JavaScript: 83,251 bytes raw / 20,667 bytes gzip.
- CSS: 25,047 bytes raw / 6,380 bytes gzip.
- Worker bundle: 29,497 bytes raw / 6,624 bytes gzip.
- Desktop hero WebP: 111,800 bytes, with a smaller responsive source.
- Self-hosted fonts, optimized WebP product images, below-fold lazy loading, minified assets and no frontend framework runtime.
- `npm audit --omit=optional`: zero known reported vulnerabilities at validation time.
- Development audit scripts and axe are excluded from the deployment archive.

Compressed sizes are measured locally, not claims about hosting response compression. No Lighthouse score or field Core Web Vitals result is claimed. Real conversion and retention improvements require measurement after an authorized commercial rollout.

## Review limits

This is a fully functioning **commerce demonstration**. Orders persist, but no real payment, personal shipping details, inventory reservation, fulfilment or merchant messaging is performed. The catalogue is a documented snapshot. The project does not assert legal certification or guarantee the absence of all bugs.

## Review release

After preparing the portable Cloudflare configuration, the application was rebuilt, all three backend integration groups passed again, and the production configuration passed Wrangler’s deployment dry run. The review package includes the full source and retains third-party font licences. No live deployment is claimed by a dry run.

The Cloudflare deployment was subsequently published and verified on 16 September 2026. HTTPS home and project-information pages loaded without authentication. All three integration groups passed against the public endpoint, including persistent state, isolated orders, idempotent checkout and reorder. Test-created sessions were removed by the test cleanup. The initial new-subdomain TLS propagation delay resolved before these checks passed.
