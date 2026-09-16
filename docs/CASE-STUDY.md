# A scent of your own

Independent Raees Al Oud commerce concept · September 2026

## The opportunity

The assignment supplied a website as a standard of reference, without a feature specification. I chose to explore a coherent customer journey: discover a fragrance, understand the selection, save what feels relevant, place a clearly simulated order, and return to a familiar collection.

The hypothesis is that decision support and useful continuity can support purchase confidence and repeat visits. The concept does not claim a proven conversion uplift or knowledge of the business's internal priorities.

## What was reviewed

The public sitemap, navigation and footer yielded 49 URLs for content inspection: home, product and collection pages, policies, contact, empty news index, cart, search, wishlist and account entry. 47 returned readable pages. The linked wishlist returned 404; account entry redirected to Shopify and could not be read by the content fetcher. No account login, real checkout, order, or contact submission was attempted.

All 30 product records were inspected; the apparently non-customer-facing `Offline` test listing was excluded from the 29-item demonstration catalogue. The detailed URL inventory separates content inspection from visual checks. Representative home and product templates were inspected in the browser; this was not a visual test of every reference URL.

## Evidence and priorities

| Observation | Customer implication | Concept response | Confidence |
| --- | --- | --- | --- |
| Announcement says four-day returns; refund policy says two days for unopened goods | Purchase uncertainty | Flag the discrepancy and link original policies; do not invent a resolution | High, public content |
| `/pages/contact` contains a US placeholder address, sample phone and `info@example.com`; policy contact page provides Dubai details | Competing trust signals | Avoid copying the contact template; direct real-business enquiries to the official site | High, public content |
| Linked `/pages/wishlist` returned 404 | Possible break in return-visit flow | Working saved collection backed by the server | High for observed response; live behaviour may change |
| Several oils and sprays have no descriptive body copy | Insufficient evidence for detailed recommendations | Explain product form; do not invent scent notes, ingredient lists or certifications | High, catalogue snapshot |
| Spotlight, Azule and De Ja Vu note lists and prose differ | Risk of confidently repeating inconsistent claims | Short descriptions use overlapping supported notes; source links remain available | High, product content |
| Product template shows an all-zero urgency timer | Unhelpful urgency signal | Emphasize product information and decision support | High, representative visual check |
| Existing categories distinguish wood, oil, perfumes and sprays | A useful, recognizable information structure | Preserve product-form categories and clarify them in the discovery experience | High |

## Design direction

An editorial fragrance atelier: deep umber, ivory, quiet brass accents, generous serif headlines, precise sans-serif navigation, and tactile product imagery. A composed still life introduces the material world of oud. Product photography remains factual. The new page silhouette and interactions are distinct from the source site.

The hero is followed by direct product-form navigation and a small selection of actual products. A three-step fragrance finder turns notes, form and budget into explainable matches. The personal collection gives that interaction somewhere useful to live on the next visit.

Motion is restrained: image easing, button feedback, short page transitions and dialog movement. Reduced-motion preferences suppress it. The interface never depends on animation to communicate state.

## The retention loop

1. Select a fragrance family, format and budget.
2. See exact matches first; if there are none, explicitly describe alternatives.
3. Save a fragrance without creating an account.
4. Return to the saved collection and preferences.
5. Reorder from a demo history into a reviewable bag; never place another order automatically.

No newsletter gate, manufactured scarcity, invented reviews, loyalty points or automatic marketing enrolment was added. These require commercial evidence or operational support that this assignment did not provide.

## Engineering decisions

The frontend is vanilla HTML/CSS/JS. Small render functions share a consistent set of UI patterns without a runtime framework. Browser requests go to a JavaScript Worker. D1 holds session-scoped collection state and demo orders.

Opaque 256-bit session credentials are HTTP-only cookies, hashed before database lookup. Writes require the same origin and a custom request header. Prepared statements bind all untrusted data. A revision check prevents stale tabs from overwriting newer changes. Checkout writes an immutable item snapshot and clears the bag in a database batch; a unique per-session idempotency key prevents retry duplicates.

Product and variant validation, availability, quantity limits, shipping assumptions and totals belong to the server. A browser-supplied price cannot change an order. Monetary values are integer fils.

## Iterations

**Design requirements:** clear independence, demo-only data, visitor isolation, authoritative totals, idempotency, recoverable errors, Arabic throughout the journey and keyboard accessibility.

**Iteration 1 — complete journey:** implemented the catalogue, finder, saved collection, bag, checkout, history and reorder. API checks and browser walkthrough verified the whole journey and persistence.

**Iteration 2 — usability and reliability:** increased supporting-text sizes, corrected footer contrast, retained keyboard focus after re-renders, improved repeated-dialog scroll locking, protected confirmation pages with an owned-order lookup, guarded delayed search rendering after close, added bounded request timeouts, refreshed stale checkout summaries before retry, and hardened malformed-body handling.

Automated accessibility and responsive checks were then repeated. Detailed results and limitations are in `VALIDATION.md`.

## Cultural and regulatory context

English and Arabic are implemented together, with document-level direction, logical spacing and isolated currency strings. Content avoids gender assumptions, religious ornamentation and unsupported origin, halal or certification claims. Native Arabic editorial review remains a production requirement.

Official sources used to inform the brief:

- UAE consumer protection: https://www.moet.gov.ae/documents/20121/0/Law_15_2020_pdf.pdf/b676fd26-275c-3652-e949-8b3663e7bd79
- FTA consumer price and tax guidance: https://tax.gov.ae/DataFolder/Files/Pdf/2022/Get%20to%20know%20your%20Tax%20Obligations.pdf
- UAE data-protection overview: https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws.

The project is a demonstration, not a legal compliance certification. A real launch requires confirmation of applicable laws and the company's approved policies and data-processing arrangements.

## How I would measure it

| Hypothesis | Primary measure | Supporting measure | Guardrail |
| --- | --- | --- | --- |
| Guided discovery improves confidence | Product-to-cart rate among eligible visitors | Finder completion and product engagement | Returns, no-result rate |
| Saved collections help repeat visits | Returning-customer conversion | Saved-product revisit rate | Privacy complaints and deletion failures |
| Reordering reduces repeat-purchase effort | Repeat-purchase rate by customer cohort | Time from history to reviewed cart | Accidental duplicates and cancellation rate |

Establish a baseline, agree attribution and cohort windows, estimate a sample size, and run controlled experiments before claiming improvement. The demo has no advertising analytics and creates no fabricated business results.

## A two-minute walkthrough

Open the home page and explain the original visual direction. Use the finder to choose Floral, Perfumes and AED 350. Open a result, select its variant, save it and add it to the bag. Show the cost breakdown, create a demo order, then reload its history and reorder. Switch to Arabic and a phone viewport. End by showing the API tests and explaining one tradeoff: anonymous browser continuity lowers friction but does not provide cross-device identity.
