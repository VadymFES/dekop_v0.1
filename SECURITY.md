# Security Documentation - Dekop E-commerce Platform

## Overview

This document outlines the security measures implemented in the Dekop e-commerce platform. These measures address critical vulnerabilities and follow security best practices for handling financial transactions and customer data.

**Last Updated:** 2025-11-21
**Security Review Status:** ✅ Enhanced

---

## Table of Contents

1. [Critical Security Fixes](#critical-security-fixes)
2. [Authentication & Authorization](#authentication--authorization)
3. [Payment Security](#payment-security)
4. [Data Protection](#data-protection)
5. [Security Headers](#security-headers)
6. [Logging & Monitoring](#logging--monitoring)
7. [Configuration](#configuration)
8. [Incident Response](#incident-response)

---

## Critical Security Fixes

### 1. ✅ Monobank Webhook Signature Verification

**Issue:** Webhook signature verification was not implemented (returned `true` without checking).

**Fix:** Implemented proper RSA-SHA256 signature verification using Monobank's public key.

**Location:** `app/lib/services/monobank-service.ts:191`

**Configuration Required:**
```bash
# Add Monobank public key to .env
MONOBANK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
...your Monobank public key...
-----END PUBLIC KEY-----"
```

**How to obtain the public key:**
1. Contact Monobank support or check your merchant dashboard
2. Public key should be in PEM format
3. Never commit the actual key to version control

---

### 2. ✅ Order Retrieval Authentication (IDOR Fix)

**Issue:** Anyone with an order ID could access full customer PII (GDPR violation).

**Fix:** Implemented email verification for order access.

**Location:** `app/api/orders/[orderId]/route.ts:15`

**Usage:**
```typescript
// Before: Anyone could access
GET /api/orders/12345

// After: Email verification required
GET /api/orders/12345?email=customer@example.com
```

**Security Benefits:**
- Prevents order ID enumeration attacks
- Protects customer PII
- GDPR compliant access control
- Admin operations require API key

---

### 3. ✅ Replay Attack Protection

**Issue:** Webhooks could be captured and replayed multiple times.

**Fix:** Implemented webhook deduplication with timestamp validation.

**Location:** `app/lib/webhook-security.ts`

**Features:**
- Unique webhook ID tracking (1-hour TTL)
- Timestamp validation (10-minute window)
- Automatic cleanup of expired entries
- Prevents duplicate payment processing

**Example:**
```typescript
// Webhook is tracked by unique ID
const webhookId = `liqpay_${transactionId}`;
if (!isWebhookUnique(webhookId)) {
  // Reject duplicate webhook
}
```

---

### 4. ✅ IP Whitelist for Webhooks

**Issue:** No validation of webhook source IP addresses.

**Fix:** Implemented IP whitelist validation for payment provider webhooks.

**Location:** `app/lib/webhook-security.ts:64`

**Configuration:**
Update IP ranges in `webhook-security.ts`:
```typescript
const LIQPAY_IP_WHITELIST = [
  '91.226.25.0/24',    // Update with actual LiqPay IPs
  '77.120.109.0/24',
];

const MONOBANK_IP_WHITELIST = [
  '195.69.188.0/24',   // Update with actual Monobank IPs
];
```

**Note:** IP validation is automatically disabled in development mode.

---

### 5. ✅ Timing-Safe API Key Comparison

**Issue:** Simple string comparison vulnerable to timing attacks.

**Fix:** Implemented constant-time comparison using `crypto.timingSafeEqual`.

**Location:** `app/lib/api-auth.ts:19`

**Security Benefit:**
Prevents attackers from brute-forcing API keys by measuring response times.

---

## Authentication & Authorization

### API Key Authentication

**Endpoints requiring API key:**
- `PATCH /api/orders/[orderId]` - Order modifications (admin only)
- `POST /api/test/email` - Email testing (admin only)

**Configuration:**
```bash
# Generate a secure API key
openssl rand -base64 32

# Add to .env
INTERNAL_API_KEY=your_generated_key_here
```

**Usage:**
```bash
curl -H "x-api-key: your_api_key" https://dekop.com.ua/api/orders/123
```

**Security Features:**
- Timing-safe comparison
- Automatic rejection if key not configured
- Key never logged or exposed in errors

---

## Payment Security

### Multi-Layer Webhook Security

All payment webhooks (LiqPay and Monobank) implement **4 layers of security**:

#### Layer 1: IP Whitelist Validation
```typescript
const ipValidation = validateWebhookIp(request, 'liqpay');
if (!ipValidation.valid) {
  return 403; // Forbidden
}
```

#### Layer 2: Signature Verification
```typescript
const isValid = verifyLiqPayCallback(data, signature);
if (!isValid) {
  return 400; // Invalid signature
}
```

#### Layer 3: Replay Attack Prevention
```typescript
const webhookId = `liqpay_${transactionId}`;
if (!isWebhookUnique(webhookId)) {
  return 409; // Duplicate webhook
}
```

#### Layer 4: Timestamp Validation
```typescript
if (!validateWebhookTimestamp(timestamp, 600)) {
  return 400; // Webhook too old
}
```

### Payment Provider Configuration

**LiqPay:**
```bash
LIQPAY_PUBLIC_KEY=your_public_key
LIQPAY_PRIVATE_KEY=your_private_key
```

**Monobank:**
```bash
MONOBANK_TOKEN=your_token
MONOBANK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
```

---

## Data Protection

### Input Validation & Sanitization

All user inputs are validated using **Zod schemas**.

**Location:** `app/lib/validation-schemas.ts`

**Features:**
- XSS prevention (HTML tag removal)
- Email sanitization
- Phone number validation
- Length limits on all inputs
- SQL injection prevention (parameterized queries)

**Example:**
```typescript
const sanitizedString = z.string().transform((val) => {
  return val.trim().replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
});
```

### Sensitive Data Handling

**Logging:**
- All sensitive data is automatically masked in logs
- Credit card numbers, passwords, API keys redacted
- PII only logged when necessary for debugging

**Database:**
- All queries use parameterized statements
- No raw SQL string concatenation
- SQL injection protection verified

---

## Security Headers

Implemented via Next.js proxy at `/proxy.ts` (combined with cart management).

### Headers Applied

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Restrictive policy | XSS prevention |
| `X-Frame-Options` | `DENY` | Clickjacking protection |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing protection |
| `Strict-Transport-Security` | `max-age=31536000` | Force HTTPS (production) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer control |
| `Permissions-Policy` | Restrictive | Disable unnecessary features |

### CORS Configuration

**Allowed Origins:**
- Production: `NEXT_PUBLIC_SITE_URL`
- Development: `localhost:3000`, `localhost:3001`

**Allowed Methods:** `GET, POST, PUT, PATCH, DELETE, OPTIONS`

**Credentials:** Allowed for same-origin requests

---

## Logging & Monitoring

### Structured Logging

**Location:** `app/lib/logger.ts`

**Features:**
- JSON formatted logs for production
- Pretty formatting for development
- Automatic sensitive data masking
- Log levels: debug, info, warn, error, security

**Usage:**
```typescript
import { logger, logSecurity } from '@/app/lib/logger';

// Security event
logSecurity({
  type: 'unauthorized_access',
  severity: 'high',
  details: 'Failed API key validation',
  metadata: { ip, path }
});

// Error logging
logger.error('Payment failed', error, { orderId });
```

### Security Event Types

Monitor these events in production:
- `auth_failure` - Failed authentication attempts
- `webhook_invalid` - Invalid webhook signatures
- `replay_attack` - Duplicate webhook attempts
- `unauthorized_access` - Access without proper auth
- `suspicious_activity` - Unusual patterns
- `rate_limit` - Rate limit violations

### Monitoring Recommendations

**Production Setup:**
1. **Log Aggregation:** Send logs to DataDog, Sentry, or CloudWatch
2. **Alerting:** Configure alerts for critical security events
3. **Metrics:** Track failed auth attempts, webhook failures
4. **Dashboards:** Monitor security metrics in real-time

---

## Configuration

### Environment Variables

**Required for Production:**

```bash
# Database (provided by Vercel)
POSTGRES_URL=...

# Security
INTERNAL_API_KEY=<generate with: openssl rand -base64 32>

# Payment - LiqPay
LIQPAY_PUBLIC_KEY=...
LIQPAY_PRIVATE_KEY=...

# Payment - Monobank
MONOBANK_TOKEN=...
MONOBANK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."

# Email
RESEND_API_KEY=...
RESEND_FROM_EMAIL=noreply@dekop.com.ua

# Site URLs
NEXT_PUBLIC_SITE_URL=https://dekop.com.ua
NEXT_PUBLIC_BASE_URL=https://dekop.com.ua
```

### Security Checklist for Deployment

- [ ] All environment variables configured
- [ ] INTERNAL_API_KEY generated and set
- [ ] Monobank public key obtained and configured
- [ ] IP whitelists updated with actual payment provider IPs
- [ ] HTTPS enabled (HSTS headers active)
- [ ] CSP policy tested and adjusted for your domain
- [ ] Log aggregation service configured
- [ ] Security monitoring and alerting set up
- [ ] Database backups configured
- [ ] Incident response plan documented

---

## Incident Response

### Security Event Response Plan

#### 1. Failed Authentication (Medium Severity)
**Indicators:**
- Multiple failed API key attempts
- Pattern of 401 responses

**Response:**
1. Check security logs for IP address
2. Verify if legitimate user issue or attack
3. Consider IP blocking if pattern indicates attack
4. Rotate API key if compromised

#### 2. Webhook Signature Failure (High Severity)
**Indicators:**
- Webhook signature verification failures
- Logs showing invalid signatures

**Response:**
1. **DO NOT** process the webhook
2. Log full details (IP, headers, payload)
3. Contact payment provider to verify
4. Check if public key needs updating
5. Review IP whitelist configuration

#### 3. Replay Attack Detected (Critical Severity)
**Indicators:**
- Duplicate webhook IDs detected
- Multiple identical payment confirmations

**Response:**
1. Webhook automatically rejected (409 status)
2. Check logs for attack pattern
3. Verify webhook is not actually being resent by provider
4. If attack confirmed, review IP whitelist
5. Consider additional rate limiting

#### 4. Unauthorized Data Access (Critical Severity)
**Indicators:**
- Failed order access attempts
- Pattern of 403/401 responses

**Response:**
1. Identify affected customer accounts
2. Review access logs for data exposure
3. Notify affected customers if data accessed
4. Implement additional access controls
5. File security incident report

### Contact Information

**Security Issues:**
Report to: security@dekop.com.ua

**Emergency Response:**
- On-call developer: [Configure in monitoring]
- System admin: [Configure in monitoring]

---

## Security Testing

### Recommended Testing

**Before Production:**
1. Run `npm audit` for dependency vulnerabilities
2. Test webhook signature verification with invalid signatures
3. Attempt order access without email parameter
4. Try replaying webhook multiple times
5. Test API endpoints without API key
6. Verify CORS policies work correctly
7. Check CSP headers don't block legitimate resources

**Penetration Testing:**
Consider hiring security firm for:
- Full penetration test
- Payment flow security review
- OWASP Top 10 vulnerability scan
- Social engineering assessment

---

## Compliance

### GDPR Considerations

**Implemented:**
- ✅ Access control for personal data (email verification)
- ✅ Minimal data collection
- ✅ Data minimization in logs (sensitive data masked)

**TODO for Full Compliance:**
- [ ] User data export functionality
- [ ] User data deletion (right to be forgotten)
- [ ] Privacy policy and consent management
- [ ] Data retention policies
- [ ] Data processing agreements with payment providers

### PCI DSS Considerations

**Good Practices:**
- ✅ No credit card data stored locally
- ✅ Payment processing delegated to PCI-compliant providers (LiqPay, Monobank)
- ✅ Secure transmission (HTTPS enforced)
- ✅ Access control and logging

**Note:** Since we use third-party payment processors and don't handle card data directly, full PCI DSS compliance is primarily the responsibility of LiqPay and Monobank.

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Vercel Security Documentation](https://vercel.com/docs/security)
- [LiqPay API Documentation](https://www.liqpay.ua/documentation/api)
- [Monobank Acquiring API](https://api.monobank.ua/docs/acquiring.html)

---

## Changelog

### 2025-11-21 - Security Enhancements
- ✅ Implemented Monobank webhook signature verification
- ✅ Added order retrieval authentication (IDOR fix)
- ✅ Implemented replay attack protection
- ✅ Added IP whitelist for webhooks
- ✅ Implemented timing-safe API key comparison
- ✅ Added comprehensive security headers
- ✅ Implemented structured logging with security events
- ✅ Added error sanitization for production
- ✅ Created security documentation

---

**For questions or security concerns, please contact: security@dekop.com.ua**
