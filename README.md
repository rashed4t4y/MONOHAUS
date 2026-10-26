# MONOHAUS

A complete local e-commerce demonstration for a fictional minimalist fashion and lifestyle store. The React storefront talks to an Express REST API; products, accounts, sessions, newsletter entries, orders, and stock live in SQLite. The project has not been publicly deployed.

## Run locally

Install **Node.js 24 or later**, including npm, then run these commands from this project directory:

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. The API listens at **http://127.0.0.1:3001**. The development command starts both servers, and Vite proxies `/api` to Express. Stop both with Ctrl+C. If either port is occupied, stop the existing process first; Vite intentionally does not silently change ports.

The database and 20 sample products are created automatically on first startup. Subsequent startups apply numbered migrations without clearing existing data. No administrator credentials or user accounts are seeded.

Optional environment setup:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux, use `cp .env.example .env`. Node reads `.env` through its built-in environment-file support. Development works without it. Set a stable random `SESSION_SECRET` to keep signed sessions valid across restarts; without one, development generates a new secret on every startup.

For a local production-build preview:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:3001**. Express serves `client/dist` and handles React Router refreshes. This remains a local HTTP preview with the default development environment. HTTPS production configuration is described below.

## Implemented features

- An editorial homepage, category links, new arrivals, collection and brand pages, policy pages, clearly fictional contact details, and a local newsletter form.
- A SQLite-backed catalog with search, categories, price/newest sorting, pagination, loading states, empty states, failures, and product-detail routes.
- Nineteen individually matched, Pexels-licensed product photographs, local editorial photographs, image fallbacks, and descriptive image text. One catalog item uses the existing fallback; product imagery is stored locally and is not generated at runtime.
- Product options and quantity controls, related products, a persistent shopping bag, cart drawer and cart page, live item count, totals, and feedback.
- Complete light/dark themes with persisted preference, initial system preference, reduced-motion support, responsive layouts, keyboard focus styles, and drawer focus management.
- Registration, login, logout, profile display, private order history, and order details protected by server-side authorization.
- Authenticated cash-on-delivery checkout, validated shipping fields, a server-derived quote and final totals, idempotency, order snapshots, transactional stock updates, and confirmation only after saving.
- Protected administration for product search/create/edit/archive, prices, stock, options, order items, customer delivery details, and permitted status transitions.

Checkout requires a signed-in account. There is no guest order lookup or public route exposing customer information.

## Create an administrator

Run this locally from the project root:

```sh
npm run admin:create
```

The command prompts for a name, email, and password, then asks for password confirmation. Password entry is hidden. Use a unique email and a password of 12–128 characters. The command refuses to overwrite or silently promote an existing account.

Sign in through **Account**, then open **/admin**. Ordinary customers cannot access admin APIs, even if they manually navigate to the admin URL. There are no hardcoded production credentials.

For controlled local automation, the script accepts `--stdin-json`, with `name`, `email`, and `password` supplied through standard input. Do not put passwords in command-line arguments, source files, or shell history.

## Administration and catalog data

The initial catalog is defined in `server/seed.js`. Migrations 3–4 add 12 sample products and align the first-run image details without replacing existing catalog or customer data. Editing the seed file does not overwrite an initialized store; use the admin interface to update an initialized database.

All monetary values use integer USD cents in the API and database. The admin form displays dollars and converts them to cents. Shipping is **$8**, or complimentary when the merchandise subtotal is **$150 or more**. This demonstration applies no tax, real carrier quote, external discount, or payment charge.

Stock is tracked per product, across its size/color options. Options are validated at checkout, but do not have independent stock bins. Products support additional local gallery images. Seeded products use one locally referenced main image; the new card-holder listing uses the existing fallback because the reviewed photo candidates showed third-party branding.

Photos must already exist in `client/public/assets/`. Use a local path such as `/assets/white-tee.jpg` in the admin form. The editor does not upload images. Archive requires typing the SKU, removes the piece from the storefront, preserves order history, and is blocked while the product appears in an active order. The backend also supports restoring an archived product with `PATCH /api/admin/products/:id` and `{ "active": true }`.

Order transitions are enforced by the server:

```text
pending -> processing -> shipped -> delivered
   |           |
   +-----------+-> cancelled
```

Cancellation restores quantities once, in the same transaction. Delivered and cancelled orders are terminal. Orders cannot jump straight from pending to shipped.

## Architecture

```text
client/
  public/assets/          Local photographs and SVG fallbacks
  src/components/         Header, footer, product cards, drawer
  src/context/            Cart and account state
  src/pages/              Storefront, checkout, account and admin
  src/services/api.js     API transport and CSRF token handling
  src/styles/             Design tokens, responsive layouts and motion
  vite.config.js          React build and development API proxy
server/
  app.js                  Express application and middleware
  index.js                HTTP entry point
  db.js                   SQLite migrations and row mapping
  seed.js                 Centralized sample catalog
  lib/                    Validation, hashing, sessions and authorization
  routes/                 Catalog, authentication, shopping and admin APIs
  services/orders.js      Quotes, checkout and order lifecycle
  scripts/create-admin.js Local administrator creation
  tests/api.test.js       API, security, persistence and CLI tests
  data/                   Runtime SQLite files (ignored)
scripts/dev.mjs           Starts frontend and backend together
.env.example              Configuration placeholders
IMAGE_SOURCES.md           Source links, photographers and license notes
```

Dependencies are installed once at the project root. Frontend and backend source remain separate; the root package avoids npm workspace symlinks for compatibility with Windows environments that restrict symlink creation. `package-lock.json` records the installed dependency graph.

Frontend dependencies: React, React DOM, React Router DOM, and Lucide React icons. Build dependencies: Vite and the React Vite plugin. Backend dependencies: Express, express-session, express-rate-limit, and Helmet. SQLite (`node:sqlite`), password hashing (`node:crypto`), and tests (`node:test`) use built-in Node modules. Some Node 24 minor releases may label SQLite experimental; use an up-to-date supported Node 24 release. No native SQLite npm package needs compilation. There is no Framer Motion or Redux dependency.

## API overview

Responses use JSON. Errors use `{ "error": "Message", "fields": { "field": "Reason" } }`, with `fields` included when applicable. Private API responses send `Cache-Control: no-store`.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/health` | API status |
| `GET /api/products` | Search, category, sorting, pagination, new/featured filters |
| `GET /api/products/:id` | Product and related pieces |
| `GET /api/auth/session` | Public user and CSRF token |
| `POST /api/auth/register`, `/login`, `/logout` | Session authentication |
| `GET /api/account` | Profile and latest 100 private orders |
| `POST /api/checkout/quote` | Trusted prices and shipping |
| `POST /api/checkout` | Authenticated, idempotent COD order |
| `GET /api/orders/:id` | Owner-only order details |
| `POST /api/newsletter` | Local demo subscription |
| `GET`, `POST /api/admin/products` | Admin catalog list/create |
| `PATCH`, `DELETE /api/admin/products/:id` | Admin edit/archive |
| `GET /api/admin/orders`, `GET /api/admin/orders/:id` | Admin orders and details |
| `PATCH /api/admin/orders/:id` | Validated status transition |

Every mutating request requires the session's `x-csrf-token`. Fetch `/api/auth/session` first. Login and registration rotate both the session ID and token. The frontend automatically uses the latest token returned by authentication responses.

Checkout uses product identifiers, options, quantities, shipping information, and an idempotency key. The backend independently retrieves prices and stock; browser-supplied totals, shipping, and prices are ignored. An identical retry with the same key returns the existing order. Reusing that key for changed contents returns a conflict.

## Security and deployment

Passwords use salted scrypt (`N=131072`, `r=8`, `p=1`) and constant-time hash comparison. Only hashes are stored. SQLite-backed sessions use HttpOnly, SameSite=Lax cookies, a 24-hour idle lifetime, and a seven-day absolute authentication lifetime. Production adds Secure cookies. Authentication attempts and newsletter submissions are rate limited.

Database inputs use parameterized queries. Archive preserves historical references. Checkout and cancellation run in transactions with stock validation. Admin roles are read from the database on every request; browser roles and supplied user IDs grant no access. Helmet sets security headers. The application permits no cross-origin credential sharing.

For deployment to your own Node host:

1. Build with `npm run build`.
2. Set `NODE_ENV=production`, a securely generated `SESSION_SECRET` with at least 32 characters, and `APP_ORIGIN` to the exact HTTPS storefront origin, without a trailing slash.
3. Terminate HTTPS at a trusted reverse proxy. Set `TRUST_PROXY=1` only for exactly one trusted proxy hop; leave it disabled otherwise.
4. Configure `HOST`, keep the API behind the same origin, and put `DATABASE_PATH` on persistent writable storage.
5. Protect and back up the database, which contains shipping information and session data. Use a consistent SQLite backup or stop the server before copying files; WAL files matter while active.
6. Run one application process for this SQLite deployment. Multiple-instance deployments need shared storage, distributed rate limiting, monitoring, and an appropriate database architecture.

The server refuses production startup without a sufficiently long session secret and an HTTPS origin. Keep private environment files, databases, backups, and logs out of Git. The project has not been pushed to GitHub or published.

## Tests and verification

```sh
npm test
npm run build
```

The backend suite covers actual HTTP routes and isolated SQLite databases: search/filter/sort/pagination, literal wildcard search, CSRF/origin protection, cookies, password hashing, session rotation/logout, email uniqueness, role rejection, trusted totals, duplicate handling, variants, aggregate stock, concurrent oversell prevention, private order ownership, admin safeguards, status transitions, restocking, rate limits, subscriptions, persistent migrations, and administrator creation.

Verified on 25 October 2026 with Node 24.21.0: **15 automated backend tests passed, 0 failed**. This includes the complete HTTP suite, expanded catalog/category and local-image checks, database migration durability, and administrator CLI checks.

Tests use temporary databases and loopback HTTP ports; they do not modify your store database. Restricted environments must allow loopback connections for HTTP tests. The build command compiles the Vite application. Browser checks and any unverified interactions are reported separately in the delivery notes; this README does not imply automated visual coverage.

## Photography and demo limitations

See [IMAGE_SOURCES.md](IMAGE_SOURCES.md) for every photo's source, creator, resolution, and the [Pexels license](https://www.pexels.com/license/). Product names follow the depicted objects: the knit is a tie-front vest and the ridged white object is a pour-over dripper. Filenames are retained for traceability. Images are local and have an unavailable-image fallback. AI origin for the new stock-photo batch has not been independently verified; the image audit documents that limitation rather than claiming certainty.

Products, contact details, policy copy, and commercial arrangements are fictional. Licensed photographs illustrate the sample catalog without implying manufacturer relationships or endorsement. Material composition, sustainability certifications, customer ratings, and manufacturing origins are not asserted.

Cash on delivery is the only demonstration payment method. Orders are real local records, but no payment is collected, courier booked, email sent, or goods dispatched. The newsletter explicitly reports that no email will be sent. There is no external email provider, password reset, email verification, or real fulfillment integration. Configure genuine inventory, policies, payment/fulfillment operations, and operational controls before using this as a live store.



The Node executable is available, but the standard npm launcher was not on PATH during implementation. Dependencies are already installed in this workspace, so start it directly:

```powershell
node scripts/dev.mjs
```

For additional npm commands in this existing workspace, the official npm CLI used for installation is available at:

```powershell
node work/npm-tool/package/bin/npm-cli.js run build
node work/npm-tool/package/bin/npm-cli.js test
```

The source ZIP excludes temporary tooling and node_modules. On a new machine, install Node.js 24 with npm and use the standard commands at the top of this README. See QA.md for the exact checks performed.
