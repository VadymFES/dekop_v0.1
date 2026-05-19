# Dekop — Ukrainian Furniture E-Commerce

Full-stack e-commerce platform for a Ukrainian furniture retailer. Built with Next.js 16 App Router, deployed on Vercel with a PostgreSQL database.

**Live site:** [dekop.com.ua](https://dekop.com.ua)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Language | TypeScript 5.9 (strict mode) |
| Styling | SCSS Modules |
| Database | Vercel Postgres (PostgreSQL) |
| File Storage | Vercel Blob |
| Email | Resend |
| Payments | LiqPay · Monobank |
| Analytics | Google Tag Manager · Vercel Analytics |
| Testing | Jest 30 · Testing Library · MSW |
| Deployment | Vercel |

---

## Features

### Storefront
- Product catalog with filtering, sorting, and keyboard-layout-aware search
- Per-category specification pages (sofas, beds, tables, chairs, wardrobes, mattresses, accessories)
- Color variant images per product
- Product reviews
- Cart (server-side, cookie-based)
- Favourites list
- Checkout with three payment methods: LiqPay, Monobank, cash on delivery
- Order confirmation emails with PDF invoice attachment
- Order status page

### Admin Panel
- Accessible at a configurable obfuscated path (`NEXT_PUBLIC_ADMIN_PATH_SECRET`)
- Session-based authentication (bcrypt passwords, SHA-256 session tokens, LRU session cache)
- Account lockout after 5 failed attempts (30-minute lockout)
- CSRF protection on all mutating routes
- Product management: create, edit, delete, image upload, colour variants, changelog
- Order management: view orders, update status
- Profile management, password reset

### Infrastructure
- Subdomain routing: `admin.dekop.com.ua` rewrites to the admin panel path
- Dynamic nonce-based Content Security Policy via `proxy.ts`
- Full security header suite (HSTS, X-Frame-Options, CSP, Permissions-Policy, etc.)
- Webhook security: IP allowlist, signature verification, replay-attack deduplication, timestamp validation
- GDPR module: consent management, data export, right-to-deletion, audit log
- Scheduled cron job (`/api/cron/cleanup`, runs daily at 02:00 UTC)

---

## Project Structure

```
app/
├── [q3p8t6v2hn5]/     # Admin panel (auth-gated)
│   ├── api/                # Admin API routes
│   ├── login/              # Login page
│   ├── orders/             # Order management
│   ├── products/           # Product management
│   └── profile/            # Admin profile
├── api/                    # Public API routes
│   ├── orders/             # Order creation & retrieval
│   ├── payments/           # Payment status checks
│   ├── products/           # Product data endpoints
│   ├── upload/             # Image upload (admin-authenticated)
│   ├── webhooks/           # LiqPay & Resend webhooks
│   ├── gdpr/               # GDPR requests
│   └── cron/               # Scheduled jobs
├── catalog/                # Catalog page
├── checkout/               # Checkout page
├── product/[slug]/         # Product detail page
├── cart/                   # Cart API & UI
├── favorites/              # Favourites page
├── lib/                    # Shared utilities
│   ├── admin-auth.ts       # Session management
│   ├── api-auth.ts         # API key auth (timing-safe)
│   ├── gdpr-compliance.ts  # GDPR operations
│   ├── validation-schemas.ts # Zod schemas for all routes
│   ├── webhook-security.ts # Webhook IP/signature/replay guards
│   └── logger.ts           # Structured logger
├── db/migrations/          # SQL migration files
└── __tests__/              # Jest test suites
proxy.ts                    # Middleware: CSP, security headers, subdomain routing
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Vercel account (for Postgres and Blob storage)

### Installation

```bash
git clone https://github.com/VadymFES/dekop_v0.1.git
cd dekop_v0.1
npm install
```

### Environment Variables

Create `.env.local` with the following variables:

```bash
# Database — provision via Vercel Postgres
POSTGRES_URL=
POSTGRES_URL_NON_POOLING=

# Storage — provision via Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Admin panel path (must be non-empty — empty string breaks routing)
NEXT_PUBLIC_ADMIN_PATH_SECRET=your-secret-path-segment

# Internal API authentication
# Generate with: openssl rand -base64 32
INTERNAL_API_KEY=

# Payment — LiqPay
LIQPAY_PUBLIC_KEY=
LIQPAY_PRIVATE_KEY=

# Payment — Monobank
MONOBANK_TOKEN=
MONOBANK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Email — Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@dekop.com.ua

# Site URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Database Setup

Run migrations in order:

```bash
npm run migrate
```

Individual migration files are in `app/db/migrations/`.

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
Admin panel: `http://localhost:3000/<NEXT_PUBLIC_ADMIN_PATH_SECRET>/login`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run full test suite |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Webhook/integration tests only |
| `npm run migrate` | Run all DB migrations |

---

## Testing

337 tests across four suites:

```
app/__tests__/
├── api/           # API route tests
├── lib/           # Utility & GDPR tests
├── services/      # Email & payment service tests
└── webhooks/      # Webhook handler tests
```

```bash
npm test
```

---

## Deployment

The project deploys to Vercel automatically on push to `master`.

1. Connect the repository to a Vercel project
2. Add all environment variables from the list above in the Vercel dashboard
3. Provision a Vercel Postgres database and Blob store — Vercel injects `POSTGRES_URL` and `BLOB_READ_WRITE_TOKEN` automatically
4. Set `NEXT_PUBLIC_ADMIN_PATH_SECRET` to a non-empty, hard-to-guess path segment
5. Push to `master`

The `vercel.json` configures:
- No-cache headers on all `/api/*` routes
- 30-second function timeout for webhook and email handlers
- Daily cron job at 02:00 UTC (`/api/cron/cleanup`)

---

## Security

See [SECURITY.md](SECURITY.md) for full documentation covering:

- Session-based admin authentication (bcrypt, SHA-256, LRU cache)
- CSRF protection on all admin mutations
- Nonce-based Content Security Policy
- Multi-layer webhook security (IP allowlist, signature, replay prevention, timestamp)
- Timing-safe API key comparison
- Zod validation on every route
- GDPR compliance module

**To report a vulnerability:** security@dekop.com.ua

---

## License

Private — all rights reserved.
