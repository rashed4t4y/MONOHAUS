# MONOHAUS — verification record

Verified on 25 October 2026 with Node.js 24.19.0 on Windows.

## Executed checks

| Check | Result |
| --- | --- |
| npm dependency installation | 144 packages installed; lockfile saved |
| Vite production build | Passed; 1,611 modules transformed |
| Backend HTTP/database/CLI tests | 13 passed, 0 failed |
| Independent SQLite order invariant checks | 10 passed |
| npm audit | 0 reported vulnerabilities |
| Local Vite and Express startup | Both returned HTTP 200 |
| Built client served directly by Express | Rendered successfully; no new browser warnings or errors |

The final production bundle is approximately 335 KB JavaScript (103 KB gzip) and 46 KB CSS (10 KB gzip). The local photo set totals approximately 1.5 MB.

## Browser flows exercised

- Light/dark rendering, theme persistence after refresh, and preserved cart/form contents during theme changes.
- Catalog navigation, real search, category filtering, and ascending price sorting.
- Product details, required size validation, adding to bag, quantity changes, subtotal calculation, and cart persistence.
- Registration, login, logout, private account profile, and order history.
- Checkout sign-in gate, server quote, required delivery fields, saved COD demo order, confirmation page, and cart clearing after success.
- Administrator access, product creation, price editing, SKU-confirmed archiving, product/order tab switching, and order details.
- Order status processing, explicit cancellation, and stock restoration.
- Mobile navigation and search dialog.
- Local newsletter confirmation explicitly saying no email is sent.
- Native dialog focus on opening, visible focus treatment, and one main landmark.

Homepage and catalog were checked for horizontal overflow at **320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920 px**. No page overflow remained. Checkout was inspected across these breakpoints, with a visual inspection at 390 px. Admin was visually inspected at 390 px and checked for overflow at 320 px. Its product table scrolls within a keyboard-focusable region.

## Bugs found and repaired

- SQLite search escape expression, with regression assertions for literal percent, underscore, and escape characters.
- Admin response-shape mismatch when changing tabs.
- Mobile admin overflow from an unpositioned accessibility label.
- Checkout recovery route, uncertain-response guidance, and preservation of idempotent retries.
- Nested main landmarks, image filename mismatches, category capitalization, and missing mobile search access.
- Temporary Vite hot-refresh context errors were cleared by reloading; the final compiled build produced no new browser errors.

## Test data and limits

Browser QA used fictional local records only. Temporary accounts, the cancelled test order, the archived test product, and the test newsletter entry were removed. The initial catalog remains at eight products, with original stock restored.

The 13 backend tests create isolated temporary databases. Production HTTPS infrastructure, external payment/email/fulfillment, real-device touch performance, a full screen-reader audit, and OS-level reduced-motion emulation were not tested. Reduced-motion CSS rules are implemented and inspected. This is a local demo; no public deployment or GitHub push occurred.

The screenshots in outputs show the actual application, not a design mockup.


