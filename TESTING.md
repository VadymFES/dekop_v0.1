# Testing

## Overview

**337 tests · 10 suites · 100% passing**

| Suite | File | Tests |
|-------|------|------:|
| Session security | `lib/session-security.test.ts` | 63 |
| Secure session tokens | `api/secure-session-tokens.test.ts` | 40 |
| CSRF protection | `api/csrf-protection.test.ts` | 20 |
| Cart session security | `api/cart/cart-session-security.test.ts` | 16 |
| GDPR compliance | `lib/gdpr-compliance.test.ts` | 47 |
| GDPR API endpoints | `api/gdpr/gdpr-api-endpoints.test.ts` | 30 |
| Validation schemas | `lib/validation-schemas.test.ts` | 48 |
| Order retrieval (IDOR) | `api/orders/order-retrieval.test.ts` | 19 |
| LiqPay webhook | `webhooks/liqpay-webhook.test.ts` | 22 |
| LiqPay service | `services/liqpay-service.test.ts` | 32 |

---

## Running Tests

```bash
npm test                  # full suite
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
npm run test:ci           # CI mode (--ci --coverage --maxWorkers=2)
npm run test:unit         # services only
npm run test:integration  # webhooks only
npm run test:api          # API routes only
```

---

## Test Infrastructure

- **Jest 30** — test runner and assertions
- **ts-jest** — TypeScript support
- **Testing Library** — React component utilities
- **MSW** — API mocking for integration tests
- **node-mocks-http** — Next.js request/response mocks

Configuration: `jest.config.js` · Global setup: `jest.setup.js`

---

## Suite Breakdown

### Session Security (`lib/session-security.test.ts`) — 63 tests

**Cookie Encryption**
- AES-GCM encrypt/decrypt round-trip
- Unique IV per encryption (same input → different ciphertext)
- Unicode and special character handling
- Tamper detection (returns `null` on modified ciphertext or auth tag)
- Invalid format handling

**Cookie Signing (HMAC)**
- Sign and verify round-trip
- Consistent signatures for same value
- Rejection of tampered value, tampered signature, invalid format
- Timing-safe comparison

**CSRF Token Management**
- Token generation (unique, cryptographically secure)
- DB storage with `ON CONFLICT` upsert
- Validation: expired token, replayed token, wrong session ID
- Cleanup of expired tokens

**Session Token Management**
- Secure token generation (unique, high entropy)
- Session creation with/without user ID and metadata
- Token hashed before DB storage (plain text never persisted)
- Validation: expired, revoked, invalid format
- Session revocation and extension
- Expired session cleanup

**Attack Prevention**
- Cookie value modification attacks
- Encrypted cookie tampering
- CSRF token replay (single-use enforcement)
- CSRF token reuse across different sessions
- Session fixation (new token generated per session)
- Timing-safe signature comparison

---

### Secure Session Tokens (`api/secure-session-tokens.test.ts`) — 40 tests

**Token Generation** — entropy, uniqueness, cryptographic security

**Session Lifecycle** — create, validate, revoke, extend, cleanup

**Security Properties**
- Only hashed tokens stored (SHA-256)
- Session fixation prevention (new token after privilege elevation, old sessions invalidated)
- Sliding-window expiration
- Concurrent sessions per user
- IP and user agent binding
- Suspicious activity detection
- Logout-all-devices

---

### CSRF Protection (`api/csrf-protection.test.ts`) — 20 tests

- Token generation uniqueness
- Storage and validation flow
- Single-use enforcement (replay rejection)
- Expiration enforcement
- Session-scoped tokens (token from session A rejected for session B)
- Protection on order creation, cart add, cart update, cart delete
- Attack scenarios: cross-site form submission, XSS token theft, cross-user reuse, fixation
- Double-submit cookie pattern
- No CSRF token in URL parameters

---

### Cart Session Security (`api/cart/cart-session-security.test.ts`) — 16 tests

**Cookie Attributes**
- `httpOnly`, `Secure` (production), `SameSite=Strict`, `Max-Age` (7 days)

**Cart ID Validation**
- UUID format enforcement
- New cart creation when cookie ID not found in DB
- No cross-session cart access

**Session Isolation**
- Independent cart data per session
- Empty cart returned with no session cookie

**Cookie Lifecycle**
- New cookie on first POST
- Expiration extended on each request

**Security**
- No sensitive data in error responses
- CORS headers present
- UUID cart IDs (not sequential integers)
- Ownership validation before modifications
- No cart enumeration

---

### GDPR Compliance (`lib/gdpr-compliance.test.ts`) — 47 tests

**Data Export**
- JSON and CSV formats
- Selective inclusion of orders, cart items, consents
- Error handling, unique filename generation

**Right to Deletion**
- Full deletion flow
- Order anonymisation (`keepOrderHistory` option)
- Full anonymisation (`anonymizeInsteadOfDelete` option)
- Audit logging during deletion
- Legal compliance: transaction record retention

**Consent Management**
- Record new consent and update existing consent
- Metadata logging (IP, user agent)
- Consent retrieval (empty array when none)
- Consent revocation
- `hasRequiredConsents`: true/false/error paths

**Privacy Policy**
- Acceptance recording with metadata
- Latest-version acceptance check (true/false/no-record)

**Audit Log**
- Action logging, no-throw on log error
- Retrieval with limit parameter

**Deletion Scheduling**
- Schedule with/without explicit date (default 30-day grace)
- Cancel during grace period, false when not found/already processed

---

### GDPR API Endpoints (`api/gdpr/gdpr-api-endpoints.test.ts`) — 30 tests

**`POST /api/gdpr/export`**
- Email verification before export
- JSON and CSV formats
- Rate limiting
- Audit trail logging
- Partial export for large datasets

**`POST /api/gdpr/delete`**
- Immediate confirmation with 30-day grace period
- Cancellation during grace period
- Execution after grace period
- Confirmation email on deletion
- Order anonymisation for legal compliance

**`POST /api/gdpr/consent`**
- Record, retrieve, granular types, version tracking, IP/UA recording, withdrawal

**`POST /api/gdpr/privacy-policy`**
- Acceptance recording, latest-version check, reacceptance on update, timestamp/metadata tracking

**`GET /api/gdpr/user-data`**
- Personal data summary, data processing activity list

**Security & Compliance**
- Encrypted data exports
- Time-limited download links
- All actions logged
- Unauthorized access protection
- CSRF protection on state-changing operations

---

### Validation Schemas (`lib/validation-schemas.test.ts`) — 48 tests

**XSS Prevention**
- HTML tag removal, angle bracket stripping
- Multiple XSS pattern handling
- Cyrillic character preservation
- Whitespace trimming

**Cart Item Schema** — quantity (1–100), product ID, optional colour sanitisation

**Order Creation Schema**
- All required fields, phone format (`+380XXXXXXXXX`), email normalisation
- Delivery method: `nova_poshta | store_delivery | pickup`
- Payment method: `liqpay | monobank | cash_on_delivery`
- String length limits, numeric constraints, default values

**Update Cart Quantity Schema** — 0–100, integer only, no negatives

**Email, ID, UUID, Pagination Schemas**

**Edge Cases**
- SQL injection in strings (safe via parameterised queries)
- Null byte injection
- Very long strings
- Empty/whitespace-only strings

---

### Order Retrieval — IDOR Protection (`api/orders/order-retrieval.test.ts`) — 19 tests

**IDOR Protection**
- Requires email parameter
- Verifies email matches order
- Same generic error for wrong email and nonexistent order (no information leakage)
- Case-insensitive email comparison

**Input Validation** — invalid email format rejected before DB query, UUID order ID required

**Data Retrieval** — complete order with items, orders with no items, all fields present

**Security** — generic error messages, no email enumeration, parameterised queries

**Performance** — single query with `json_agg`, efficient item fetching

---

### LiqPay Webhook (`webhooks/liqpay-webhook.test.ts`) — 22 tests

**Layer 1 — IP Validation**
- Accept when validation disabled (`DISABLE_WEBHOOK_IP_VALIDATION=true`)
- Reject unauthorised IP when enabled
- Accept from whitelisted IP

**Layer 2 — Signature Verification**
- Reject invalid signature, missing data, missing signature, tampered data

**Layer 3 — Replay Attack Prevention**
- Reject duplicate webhook (409)
- Accept unique `transaction_id`
- Fall back to `payment_id` when `transaction_id` absent

**Layer 4 — Timestamp Validation**
- Reject >10 minutes old
- Accept recent timestamp
- Accept missing timestamp (graceful)

**Payment Status Handling** — success, failed, refunded, pending, sandbox (treated as success)

**Error Handling** — missing `order_id`, DB errors, email failure, malformed JSON

**Response Headers** — security headers on all responses

---

### LiqPay Service (`services/liqpay-service.test.ts`) — 32 tests

- Payment creation: correct data structure, valid SHA1 signature, default description, custom URLs
- Missing credentials throw
- Callback verification: valid/invalid/tampered signatures, error handling
- Base64 decode: valid, invalid, malformed JSON
- Status mapping: success/sandbox → `paid`; failure/error → `failed`; reversed → `refunded`; all pending variants → `pending`; unknown → `pending`
- `checkLiqPayPaymentStatus`: success, missing credentials, API failure, network failure
- Checkout form generation: valid HTML, special character escaping
- Edge cases: large amounts, zero amount, special chars, Cyrillic, invalid email

---

## Coverage Thresholds

Configured in `jest.config.js`:

| Metric | Threshold |
|--------|----------:|
| Branches | 70% |
| Functions | 70% |
| Lines | 70% |
| Statements | 70% |

---

## Mock Patterns

### Database
```ts
jest.mock('@vercel/postgres', () => {
  const mockSql = jest.fn();
  mockSql.query = jest.fn(); // needed for parameterised sql.query() calls
  return { sql: mockSql };
});
```

### Fetch
```ts
global.fetch = jest.fn();
(fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
```

### Next.js Cookies / Headers
```ts
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({ get: jest.fn(), set: jest.fn(), delete: jest.fn() })),
}));
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Tests timeout | Increase `testTimeout` in `jest.config.js` |
| Stale module mock | `npx jest --clearCache` |
| `sql.query is not a function` | Mock must include `mockSql.query = jest.fn()` (see pattern above) |
| Path alias errors (`@/`) | Check `moduleNameMapper` in `jest.config.js` |
