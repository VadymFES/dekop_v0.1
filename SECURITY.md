# Security Documentation

**Last updated:** 2026-05-11  
**Status:** Production ready

---

## Table of Contents

1. [Authentication & Session Management](#1-authentication--session-management)
2. [CSRF Protection](#2-csrf-protection)
3. [Input Validation](#3-input-validation)
4. [Payment Webhook Security](#4-payment-webhook-security)
5. [API Authentication](#5-api-authentication)
6. [Security Headers & CSP](#6-security-headers--csp)
7. [GDPR Compliance](#7-gdpr-compliance)
8. [Environment Configuration](#8-environment-configuration)
9. [Deployment Checklist](#9-deployment-checklist)
10. [Incident Response](#10-incident-response)

---

## 1. Authentication & Session Management

### Admin Panel Auth

Session-based authentication with no third-party auth library dependency.

**Login flow:**
1. Email + password submitted → bcrypt (`BCRYPT_ROUNDS = 12`) comparison
2. Account lockout after 5 failed attempts (30-minute lockout via `locked_until`)
3. On success: `randomBytes(32)` token generated, SHA-256 hash stored in `admin_sessions` table
4. Raw token set as `httpOnly`, `Secure`, `SameSite=lax` cookie (`admin_session`)
5. Cookie domain set to `.dekop.com.ua` in production (shared across subdomains)

**Session validation (every admin request):**
- Token read from cookie → SHA-256 hashed → checked against DB
- DB validates: `revoked = false`, `expires_at > NOW()`, `is_active = true`, `is_locked = false`
- Validated user + permissions loaded via single JOIN query
- Result cached in LRU in-memory cache (5-minute TTL, 1000-entry max) to reduce DB load
- `last_activity_at` updated asynchronously (fire-and-forget, non-blocking)

**Session duration:** 12 hours  
**Implementation:** `app/lib/admin-auth.ts`

### Cart Sessions

Anonymous cart sessions use a UUID stored in a cookie (`cart_session`):
- `httpOnly`, `Secure` (production), `SameSite=Strict`, 7-day `Max-Age`
- UUID validated on every request; invalid format → new cart created
- Cart ownership enforced: users cannot access another session's cart

---

## 2. CSRF Protection

All admin mutating routes (POST, PATCH, PUT, DELETE) require a CSRF token.

**Flow:**
1. Client fetches a CSRF token (stored in `admin_csrf_tokens` table with session ID and expiry)
2. Token submitted in `X-CSRF-Token` header on every state-changing request
3. Server validates: token exists, not expired, not already used, matches session
4. Token invalidated after single use (replay protection)

**Properties:**
- Tokens are `randomBytes(32)` — cryptographically secure
- Bound to session ID — cross-session reuse rejected
- One-time use — replay rejected
- Not placed in URL parameters

**Implementation:** `app/lib/session-security.ts`, `app/[q3p8t6v2hn5]/components/CsrfProvider.tsx`

---

## 3. Input Validation

All API routes validate inputs with Zod before any DB interaction. Bypassing Zod is not permitted.

**Sanitisation applied to all string fields:**
```ts
const sanitizedString = z.string().transform(val =>
  val.trim().replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
);
```

This strips HTML tags and angle brackets, preventing stored and reflected XSS.

**Key schemas (`app/lib/validation-schemas.ts`):**

| Schema | Key constraints |
|--------|----------------|
| Cart item | quantity 1–100, integer product ID |
| Order creation | phone `+380XXXXXXXXX`, email normalised to lowercase, delivery and payment method enums |
| Update cart quantity | 0–100 integer |
| Product ID | positive integer |
| Order ID | UUID v4 |

**Payment methods:** `liqpay`, `monobank`, `cash_on_delivery`  
**Delivery methods:** `nova_poshta`, `store_delivery`, `pickup`

SQL injection is prevented by parameterised queries throughout (`@vercel/postgres` tagged template literals and `sql.query(text, params)` — never string concatenation).

---

## 4. Payment Webhook Security

Both LiqPay and Monobank webhooks pass through four independent security layers. A failure at any layer returns early without processing.

### Layer 1 — IP Allowlist

Incoming IP compared against provider-specific CIDR ranges.  
Disabled in development or when `DISABLE_WEBHOOK_IP_VALIDATION=true`.

```ts
// Update with actual provider IPs
const LIQPAY_IP_WHITELIST = ['91.226.25.0/24', '77.120.109.0/24'];
const MONOBANK_IP_WHITELIST = ['195.69.188.0/24'];
```

### Layer 2 — Signature Verification

- **LiqPay:** SHA1 HMAC over `LIQPAY_PRIVATE_KEY + data + LIQPAY_PRIVATE_KEY`
- **Monobank:** RSA-SHA256 signature in `X-Sign` header, verified against `MONOBANK_PUBLIC_KEY`

### Layer 3 — Replay Attack Prevention

Webhook IDs (`transaction_id` or `payment_id` for LiqPay, `invoiceId` for Monobank) stored in the `webhook_deduplication` table with a 1-hour TTL. Duplicate webhook → 409 Conflict.

### Layer 4 — Timestamp Validation

Webhook timestamp must be within 10 minutes of server time. Stale webhooks → 400.

**Implementation:** `app/lib/webhook-security.ts`  
**Routes:** `app/api/webhooks/liqpay/route.ts`, `app/api/webhooks/resend/route.ts`

---

## 5. API Authentication

Internal API endpoints (order modifications, email testing, file upload) are protected by a pre-shared API key.

**Header:** `x-api-key: <INTERNAL_API_KEY>`

**Comparison is timing-safe:**
```ts
import { timingSafeEqual } from 'crypto';
```
Prevents timing-based brute-force of the key. Requests denied if `INTERNAL_API_KEY` is not configured.

**Upload endpoint** (`/api/upload`) additionally requires a valid admin session cookie (`admin_session`), enforced via `getCurrentAdmin()`.

**Implementation:** `app/lib/api-auth.ts`

---

## 6. Security Headers & CSP

Applied to all routes via `proxy.ts` (Next.js middleware).

### Headers

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | Nonce-based (see below) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` (production only) |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |
| `X-XSS-Protection` | `1; mode=block` |
| `X-Robots-Tag` | `noindex, nofollow` (admin routes only) |

### Content Security Policy

A fresh 128-bit random nonce is generated per request (`crypto.getRandomValues`). Scripts must carry this nonce or be loaded by a trusted script (`'strict-dynamic'`).

**Production `script-src`:**
```
'self' 'nonce-{nonce}' 'strict-dynamic'
https://www.googletagmanager.com https://www.google-analytics.com
https://www.liqpay.ua https://api.monobank.ua
https://pay.google.com https://va.vercel-scripts.com
```

**Development additions:** `'unsafe-eval'` (required for Next.js Fast Refresh / HMR)

`style-src` includes `'unsafe-inline'` — required for React inline styles and third-party libraries (Leaflet, etc.) that inject styles. This is a known limitation.

### CORS

Explicit allowlist — no wildcard origins. In production, only `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_URL`, `https://dekop.com.ua`, and `https://admin.dekop.com.ua`. Credentials are allowed for same-origin and explicitly whitelisted cross-origin requests.

---

## 7. GDPR Compliance

Implemented in `app/lib/gdpr-compliance.ts` and exposed via `app/api/gdpr/`.

| Feature | Implementation |
|---------|---------------|
| Data export | JSON and CSV, email-verified before download |
| Right to erasure | Immediate confirmation → 30-day grace period → deletion |
| Order anonymisation | PII stripped; transaction record retained for legal compliance |
| Consent management | Granular types, versioned, IP + user agent recorded |
| Privacy policy tracking | Per-user, per-version acceptance with timestamp |
| Audit log | All GDPR actions logged to `gdpr_audit_log` table |

### Order Access (IDOR Protection)

`GET /api/orders/[orderId]` requires an `?email=` parameter. The supplied email is validated and compared (case-insensitively) against the email stored for that order. The same generic error is returned whether the order doesn't exist or the email doesn't match — preventing both order enumeration and email disclosure.

---

## 8. Environment Configuration

### Required Variables

```bash
# Database (injected automatically by Vercel Postgres)
POSTGRES_URL=
POSTGRES_URL_NON_POOLING=

# Storage (injected automatically by Vercel Blob)
BLOB_READ_WRITE_TOKEN=

# Admin panel routing — MUST be non-empty
NEXT_PUBLIC_ADMIN_PATH_SECRET=your-hard-to-guess-segment

# Internal API key — generate with: openssl rand -base64 32
INTERNAL_API_KEY=

# LiqPay
LIQPAY_PUBLIC_KEY=
LIQPAY_PRIVATE_KEY=

# Monobank
MONOBANK_TOKEN=
MONOBANK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@dekop.com.ua

# Site URLs
NEXT_PUBLIC_SITE_URL=https://dekop.com.ua
NEXT_PUBLIC_BASE_URL=https://dekop.com.ua
```

> **Important:** `NEXT_PUBLIC_ADMIN_PATH_SECRET` must never be set to an empty string. An empty value causes `pathname.includes('')` to match every route, breaking admin route detection throughout the application. The code falls back to `'q3p8t6v2hn5'` if the variable is absent.

> **Note:** `NEXT_PUBLIC_ADMIN_PATH_SECRET` is bundled into the client-side JavaScript bundle (as all `NEXT_PUBLIC_` variables are). It provides routing obscurity, not security. Real access control is the session-based auth that runs independently of the path.

---

## 9. Deployment Checklist

**Environment**
- [ ] All required variables configured in Vercel dashboard
- [ ] `INTERNAL_API_KEY` generated (`openssl rand -base64 32`)
- [ ] `NEXT_PUBLIC_ADMIN_PATH_SECRET` set to a non-empty value
- [ ] Monobank public key obtained and configured
- [ ] `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_BASE_URL` set to production domain

**Payment Gateways**
- [ ] IP allowlists updated with actual provider IPs (or `DISABLE_WEBHOOK_IP_VALIDATION=true` if IPs unavailable)
- [ ] Webhook signature verification tested in sandbox
- [ ] Full payment flow tested end-to-end for all payment methods

**Infrastructure**
- [ ] HTTPS active (HSTS header will enforce after first visit)
- [ ] CSP headers verified with [securityheaders.com](https://securityheaders.com)
- [ ] SSL/TLS certificate valid and auto-renewing

**Testing**
- [ ] `npm test` passes with 0 failures
- [ ] Full order flow tested (checkout → payment → webhook → confirmation email)
- [ ] Error paths tested (failed payment, timeout)

**Monitoring**
- [ ] Error tracking configured (Sentry or equivalent)
- [ ] Log aggregation set up
- [ ] Alerts configured for webhook signature failures and repeated auth failures

---

## 10. Incident Response

### Failed Admin Authentication (Medium)
1. Check logs for IP pattern
2. If brute-force suspected: account is auto-locked after 5 attempts; consider IP-level blocking
3. If credentials compromised: revoke all sessions via `revokeAllUserSessions(userId)`, reset password

### Webhook Signature Failure (High)
1. Webhook is rejected automatically — no action needed to prevent processing
2. Log includes full request metadata
3. Verify provider public key is current
4. Check IP allowlist configuration

### Replay Attack Detected (High)
1. Webhook automatically rejected (409) — duplicate not processed
2. Review logs for attack pattern vs. legitimate provider retry
3. If deliberate attack: review IP allowlist, consider rate limiting at edge

### Suspected Data Access (Critical)
1. Identify affected orders/users via audit log
2. Revoke all admin sessions immediately
3. Notify affected users if personal data was accessed
4. Rotate `INTERNAL_API_KEY`
5. File incident report

---

**Security contact:** security@dekop.com.ua
