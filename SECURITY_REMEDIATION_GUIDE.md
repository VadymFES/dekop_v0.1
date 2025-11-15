# Security Remediation Guide - DEKOP E-Commerce

**Companion Document to:** SECURITY_AUDIT_REPORT.md
**Date:** 2025-11-15

---

## Table of Contents
1. [Critical Fixes (IMMEDIATE)](#critical-fixes-immediate)
2. [High Priority Fixes](#high-priority-fixes)
3. [Medium Priority Fixes](#medium-priority-fixes)
4. [Low Priority Fixes](#low-priority-fixes)
5. [Testing Recommendations](#testing-recommendations)
6. [Deployment Checklist](#deployment-checklist)

---

## Critical Fixes (IMMEDIATE)

### FIX-01: Implement Order Access Authorization (VULN-01)

**Priority:** 🔴 CRITICAL - Deploy before production

#### Solution Overview
Implement session-based authentication and order ownership verification.

#### Step 1: Create Authentication Utilities

Create `app/lib/auth-utils.ts`:

```typescript
// app/lib/auth-utils.ts
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';

/**
 * Generates a secure session token for order access
 */
export function generateOrderAccessToken(orderId: string): string {
  const crypto = require('crypto');
  const secret = process.env.ORDER_ACCESS_SECRET || 'change-me-in-production';
  const timestamp = Date.now();
  const data = `${orderId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return Buffer.from(`${data}:${signature}`).toString('base64');
}

/**
 * Verifies order access token
 */
export function verifyOrderAccessToken(
  orderId: string,
  token: string
): boolean {
  try {
    const crypto = require('crypto');
    const secret = process.env.ORDER_ACCESS_SECRET || 'change-me-in-production';
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [tokenOrderId, timestamp, signature] = decoded.split(':');

    // Verify order ID matches
    if (tokenOrderId !== orderId) return false;

    // Verify token not expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 24 * 60 * 60 * 1000) return false;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${tokenOrderId}:${timestamp}`)
      .digest('hex');

    return signature === expectedSignature;
  } catch {
    return false;
  }
}

/**
 * Alternative: Verify order ownership via email + order ID
 */
export async function verifyOrderOwnership(
  orderId: string,
  email: string
): Promise<boolean> {
  try {
    const result = await sql`
      SELECT id FROM orders
      WHERE id = ${orderId} AND user_email = ${email}
    `;
    return result.rows.length > 0;
  } catch {
    return false;
  }
}
```

#### Step 2: Update Order Retrieval Endpoint

**Before (Vulnerable):**
```typescript
// app/api/orders/[orderId]/route.ts
export async function GET(request: Request, { params }) {
  const { orderId } = await params;
  // ❌ No authentication check
  const result = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  return NextResponse.json({ order: result.rows[0] });
}
```

**After (Secure):**
```typescript
// app/api/orders/[orderId]/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyOrderAccessToken } from '@/app/lib/auth-utils';
import type { OrderWithItems } from '@/app/lib/definitions';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // ✅ Verify access token
    if (!token || !verifyOrderAccessToken(orderId, token)) {
      return NextResponse.json(
        { error: 'Unauthorized access to order' },
        { status: 403 }
      );
    }

    // Fetch order with items
    const result = await sql`
      SELECT
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'order_id', oi.order_id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'product_slug', oi.product_slug,
            'product_article', oi.product_article,
            'quantity', oi.quantity,
            'color', oi.color,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'product_image_url', oi.product_image_url,
            'product_category', oi.product_category,
            'created_at', oi.created_at,
            'updated_at', oi.updated_at
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ${orderId}
      GROUP BY o.id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Замовлення не знайдено' },
        { status: 404 }
      );
    }

    const order: OrderWithItems = {
      ...result.rows[0],
      items: result.rows[0].items || []
    };

    return NextResponse.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Помилка при отриманні замовлення' },
      { status: 500 }
    );
  }
}
```

#### Step 3: Update Order Creation to Return Access Token

```typescript
// app/api/orders/create/route.ts
import { generateOrderAccessToken } from '@/app/lib/auth-utils';

export async function POST(request: Request) {
  // ... existing order creation code ...

  const orderId = orderResult.rows[0].id;

  // Generate access token
  const accessToken = generateOrderAccessToken(orderId);

  return NextResponse.json({
    success: true,
    order,
    accessToken, // ✅ Return token to client
    message: 'Замовлення успішно створено'
  }, { status: 201 });
}
```

#### Step 4: Update Frontend to Use Token

```typescript
// Frontend: After order creation
const response = await fetch('/api/orders/create', {
  method: 'POST',
  body: JSON.stringify(orderData)
});
const { order, accessToken } = await response.json();

// Store token for order access
localStorage.setItem(`order_token_${order.id}`, accessToken);

// Redirect with token
router.push(`/order-success?orderId=${order.id}&token=${accessToken}`);
```

#### Environment Variable
Add to `.env.local`:
```bash
# Secure random string for order access tokens
ORDER_ACCESS_SECRET=generate-random-64-char-string-here
```

Generate secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### FIX-02: Implement Monobank Webhook Signature Verification (VULN-02)

**Priority:** 🔴 CRITICAL - Required before enabling Monobank payments

#### Solution

Replace placeholder verification with proper crypto verification:

**Before (Vulnerable):**
```typescript
// app/lib/services/monobank-service.ts:180-206
export function verifyMonobankWebhook(
  publicKey: string,
  xSignBase64: string,
  bodyString: string
): boolean {
  // TODO: Implement proper signature verification
  return true; // ❌ CRITICAL VULNERABILITY
}
```

**After (Secure):**
```typescript
// app/lib/services/monobank-service.ts
import { createVerify } from 'crypto';

/**
 * Verifies Monobank webhook signature using X.509 public key
 * Documentation: https://api.monobank.ua/docs/acquiring.html#webhook
 */
export function verifyMonobankWebhook(
  publicKeyPem: string,
  xSignBase64: string,
  bodyString: string
): boolean {
  try {
    if (!xSignBase64 || !bodyString || !publicKeyPem) {
      console.error('Missing parameters for Monobank webhook verification');
      return false;
    }

    // Create verifier with SHA-256
    const verifier = createVerify('SHA256');
    verifier.update(bodyString);

    // Verify signature
    const isValid = verifier.verify(
      publicKeyPem,
      xSignBase64,
      'base64'
    );

    if (!isValid) {
      console.error('Monobank webhook signature verification failed');
      console.error('Body hash:', createVerify('SHA256').update(bodyString).digest('hex'));
    }

    return isValid;
  } catch (error) {
    console.error('Monobank webhook verification error:', error);
    return false;
  }
}
```

#### Configuration

Update `.env.example` and `.env.local`:

```bash
# =====================================================
# MONOBANK PAYMENT INTEGRATION
# =====================================================
MONOBANK_TOKEN=your_monobank_token_here
MONOBANK_WEBHOOK_URL=https://yourdomain.com/api/webhooks/monobank

# Monobank X.509 Public Key (PEM format)
# Download from Monobank merchant portal
MONOBANK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"
```

#### Webhook Handler Update

```typescript
// app/api/webhooks/monobank/route.ts:39-41
const publicKey = process.env.MONOBANK_PUBLIC_KEY || '';

if (!publicKey) {
  console.error('MONOBANK_PUBLIC_KEY not configured');
  return NextResponse.json(
    { error: 'Webhook verification not configured' },
    { status: 500 }
  );
}

const isValid = verifyMonobankWebhook(publicKey, xSign, body);
```

#### Testing

```bash
# Test with Monobank sandbox
curl -X POST http://localhost:3000/api/webhooks/monobank \
  -H "x-sign: VALID_SIGNATURE_FROM_MONOBANK_SANDBOX" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId":"test123","status":"success","reference":"order-id"}'
```

---

### FIX-03: Restrict Order Modification Endpoint (VULN-03)

**Priority:** 🔴 CRITICAL

#### Solution: Create Admin-Only Endpoint

**Option 1: Remove public PATCH endpoint entirely**
```typescript
// app/api/orders/[orderId]/route.ts
// Delete PATCH function - only webhooks should update orders
// export async function PATCH(...) { } ❌ REMOVE
```

**Option 2: Implement admin authentication**

Create admin middleware:
```typescript
// app/lib/admin-auth.ts
import { NextResponse } from 'next/server';

export async function verifyAdminAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  const adminToken = process.env.ADMIN_API_TOKEN;

  if (!adminToken) {
    console.error('ADMIN_API_TOKEN not configured');
    return false;
  }

  return token === adminToken;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized - Admin access required' },
    { status: 401 }
  );
}
```

Update PATCH endpoint:
```typescript
// app/api/orders/[orderId]/route.ts
import { verifyAdminAuth, unauthorizedResponse } from '@/app/lib/admin-auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  // ✅ Verify admin authentication
  if (!(await verifyAdminAuth(request))) {
    return unauthorizedResponse();
  }

  // ... rest of existing code ...
}
```

Environment variable:
```bash
# .env.local
ADMIN_API_TOKEN=generate-secure-random-token-here
```

---

## High Priority Fixes

### FIX-04: Implement Rate Limiting (VULN-04)

**Priority:** 🟠 HIGH - Deploy within 1 week

#### Solution: Install and Configure Rate Limiting

#### Step 1: Install Dependencies
```bash
npm install @upstash/ratelimit @upstash/redis
```

#### Step 2: Create Middleware

Create `middleware.ts` in project root:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Create rate limiters with different limits
const ratelimiters = {
  // Strict limits for sensitive endpoints
  orders: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
    analytics: true,
  }),

  // Moderate limits for API endpoints
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
    analytics: true,
  }),

  // Generous limits for public pages
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
  }),
};

export async function middleware(request: NextRequest) {
  // Get client IP
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';

  // Determine rate limit based on path
  let ratelimit = ratelimiters.general;

  if (request.nextUrl.pathname.startsWith('/api/orders')) {
    ratelimit = ratelimiters.orders;
  } else if (request.nextUrl.pathname.startsWith('/api/')) {
    ratelimit = ratelimiters.api;
  }

  // Check rate limit
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  // Add rate limit headers
  const response = success
    ? NextResponse.next()
    : NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );

  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/cart/:path*',
    '/checkout/:path*',
  ],
};
```

#### Step 3: Configure Upstash Redis

1. Sign up at https://upstash.com (free tier available)
2. Create a Redis database
3. Add credentials to `.env.local`:

```bash
# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

#### Alternative: Simple In-Memory Rate Limiting (Development)

For development/testing without external dependencies:

```typescript
// lib/simple-ratelimit.ts
const requests = new Map<string, number[]>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get existing requests
  const userRequests = requests.get(identifier) || [];

  // Filter out old requests
  const recentRequests = userRequests.filter(time => time > windowStart);

  if (recentRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }

  // Add current request
  recentRequests.push(now);
  requests.set(identifier, recentRequests);

  return true; // Request allowed
}
```

⚠️ **Note:** In-memory solution doesn't work with serverless/multi-instance deployments. Use Upstash for production.

---

### FIX-05: Secure Email Confirmation Endpoint (VULN-05)

**Priority:** 🟠 HIGH

#### Solution: Add Authentication and Rate Limiting

**Before (Vulnerable):**
```typescript
export async function POST(request: Request) {
  const { orderId } = await request.json();
  // ❌ No authentication
  await sendOrderConfirmationEmail({ order });
}
```

**After (Secure):**
```typescript
// app/api/orders/send-confirmation/route.ts
import { verifyOrderAccessToken } from '@/app/lib/auth-utils';

export async function POST(request: Request) {
  try {
    const { orderId, token } = await request.json();

    if (!orderId || !token) {
      return NextResponse.json(
        { error: 'Order ID and access token are required' },
        { status: 400 }
      );
    }

    // ✅ Verify access token
    if (!verifyOrderAccessToken(orderId, token)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Fetch complete order with items
    const orderResult = await sql`
      SELECT o.*, json_agg(...) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ${orderId}
      GROUP BY o.id
    `;

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = {
      ...orderResult.rows[0],
      items: orderResult.rows[0].items || []
    };

    // Send confirmation email
    await sendOrderConfirmationEmail({
      order,
      to: order.user_email,
      customerName: `${order.user_surname} ${order.user_name}`
    });

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent successfully'
    });

  } catch (error) {
    console.error('Error in send-confirmation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Medium Priority Fixes

### FIX-06: Add Security Headers (VULN-06)

**Priority:** 🟡 MEDIUM - Deploy before production

#### Solution: Configure Security Headers in Next.js

Update `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,

    // Security Headers
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    // Content Security Policy
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.liqpay.ua",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: https: blob:",
                            "font-src 'self' data:",
                            "connect-src 'self' https://www.liqpay.ua https://api.monobank.ua",
                            "frame-src 'self' https://www.liqpay.ua",
                            "object-src 'none'",
                            "base-uri 'self'",
                            "form-action 'self' https://www.liqpay.ua",
                            "frame-ancestors 'none'",
                            "upgrade-insecure-requests"
                        ].join('; ')
                    },
                    // Prevent clickjacking
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY'
                    },
                    // Prevent MIME sniffing
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    // Force HTTPS
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains'
                    },
                    // Referrer policy
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    // Permissions policy
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()'
                    },
                    // XSS Protection (legacy browsers)
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    }
                ]
            }
        ];
    },

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'fullhouse.uz',
            },
            {
                protocol: 'https',
                hostname: 'drive.google.com',
            },
            {
                protocol: 'https',
                hostname: 'tk.ua',
            },
            {
                protocol: 'https',
                hostname: 'dekor-1.s3.eu-north-1.amazonaws.com',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'images.pexels.com',
            },
        ],
    },
};

export default nextConfig;
```

#### Testing Security Headers

```bash
# Check headers after deployment
curl -I https://yourdomain.com

# Or use online tool
# https://securityheaders.com/
```

---

### FIX-07: Implement CSRF Protection (VULN-07)

**Priority:** 🟡 MEDIUM

#### Solution: Add CSRF Token Validation

#### Step 1: Install Dependencies
```bash
npm install csrf
```

#### Step 2: Create CSRF Utilities

```typescript
// app/lib/csrf.ts
import { createHash, randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const CSRF_SECRET = process.env.CSRF_SECRET || 'change-me-in-production';

export function generateCsrfToken(): string {
  const token = randomBytes(32).toString('hex');
  return token;
}

export function verifyCsrfToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false;
  return token === storedToken;
}

export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get('csrf-token')?.value;

  if (!token) {
    token = generateCsrfToken();
  }

  return token;
}

export async function setCsrfCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 // 24 hours
  });
}
```

#### Step 3: Add CSRF Endpoint

```typescript
// app/api/csrf/route.ts
import { NextResponse } from 'next/server';
import { getCsrfToken, setCsrfCookie } from '@/app/lib/csrf';

export async function GET() {
  const token = await getCsrfToken();
  await setCsrfCookie(token);

  return NextResponse.json({ csrfToken: token });
}
```

#### Step 4: Validate CSRF in Protected Endpoints

```typescript
// app/api/orders/create/route.ts
import { cookies } from 'next/headers';
import { verifyCsrfToken } from '@/app/lib/csrf';

export async function POST(request: Request) {
  // Verify CSRF token
  const csrfToken = request.headers.get('x-csrf-token');
  const cookieStore = await cookies();
  const storedToken = cookieStore.get('csrf-token')?.value;

  if (!verifyCsrfToken(csrfToken || '', storedToken || '')) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  // ... rest of order creation logic
}
```

#### Step 5: Update Frontend

```typescript
// Frontend: Fetch CSRF token on mount
useEffect(() => {
  fetch('/api/csrf')
    .then(res => res.json())
    .then(data => setCsrfToken(data.csrfToken));
}, []);

// Include in requests
fetch('/api/orders/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify(orderData)
});
```

---

## Low Priority Fixes

### FIX-08: Sanitize Error Messages (VULN-08)

**Priority:** 🟢 LOW

#### Solution: Environment-Aware Error Handling

Create error utility:

```typescript
// app/lib/error-utils.ts
const isDevelopment = process.env.NODE_ENV === 'development';

export function sanitizeError(error: unknown): {
  message: string;
  details?: string;
} {
  if (error instanceof Error) {
    return {
      message: 'An error occurred',
      details: isDevelopment ? error.message : undefined
    };
  }

  return {
    message: 'An unknown error occurred',
    details: isDevelopment ? String(error) : undefined
  };
}

export function logError(context: string, error: unknown) {
  console.error(`[${context}]`, error);

  // In production, send to error tracking service
  if (!isDevelopment && process.env.SENTRY_DSN) {
    // Sentry.captureException(error);
  }
}
```

Update error handling:

```typescript
// app/api/orders/[orderId]/route.ts
import { sanitizeError, logError } from '@/app/lib/error-utils';

export async function GET(request: Request, { params }) {
  try {
    // ... existing code ...
  } catch (error) {
    logError('GET /api/orders/[orderId]', error);
    const sanitized = sanitizeError(error);

    return NextResponse.json(
      {
        error: 'Помилка при отриманні замовлення',
        ...sanitized
      },
      { status: 500 }
    );
  }
}
```

---

## Testing Recommendations

### Security Testing Checklist

#### 1. Authentication Tests
```bash
# Test order access without token (should fail)
curl -X GET http://localhost:3000/api/orders/ORDER-ID
# Expected: 403 Forbidden

# Test order access with valid token (should succeed)
curl -X GET http://localhost:3000/api/orders/ORDER-ID?token=VALID-TOKEN
# Expected: 200 OK with order data

# Test order access with expired token (should fail)
# Expected: 403 Forbidden
```

#### 2. Payment Webhook Tests
```bash
# Test Monobank webhook with invalid signature
curl -X POST http://localhost:3000/api/webhooks/monobank \
  -H "x-sign: invalid-signature" \
  -d '{"status":"success","reference":"order-id"}'
# Expected: 400 Bad Request

# Test LiqPay webhook with invalid signature
curl -X POST http://localhost:3000/api/webhooks/liqpay \
  -F "data=fake-data" \
  -F "signature=fake-signature"
# Expected: 400 Bad Request
```

#### 3. Rate Limiting Tests
```bash
# Test rate limit (repeat 15 times quickly)
for i in {1..15}; do
  curl -X GET http://localhost:3000/api/orders/some-id
done
# Expected: First 10 succeed, last 5 return 429 Too Many Requests
```

#### 4. Security Headers Tests
```bash
# Check security headers
curl -I https://yourdomain.com | grep -E "(Content-Security|X-Frame|Strict-Transport)"
# Expected: All security headers present
```

#### 5. CSRF Tests
```bash
# Test without CSRF token
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{"user_name":"Test"}'
# Expected: 403 Forbidden
```

### Automated Testing

Create `tests/security.test.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Security Tests', () => {
  it('should reject order access without token', async () => {
    const res = await fetch('/api/orders/test-id');
    expect(res.status).toBe(403);
  });

  it('should enforce rate limits', async () => {
    const requests = Array(15).fill(null).map(() =>
      fetch('/api/orders/test-id')
    );
    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);
    expect(tooManyRequests.length).toBeGreaterThan(0);
  });

  it('should have security headers', async () => {
    const res = await fetch('/');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
```

---

## Deployment Checklist

### Pre-Deployment (Development)
- [ ] All critical fixes implemented and tested locally
- [ ] Environment variables configured in `.env.local`
- [ ] Security tests passing
- [ ] Code review completed
- [ ] No secrets in git history

### Deployment to Staging
- [ ] Configure all environment variables in Vercel/hosting platform
- [ ] Test Monobank webhook signature verification with sandbox
- [ ] Test LiqPay integration with sandbox
- [ ] Run security header checker (securityheaders.com)
- [ ] Perform manual penetration testing
- [ ] Load test rate limiting configuration

### Production Deployment
- [ ] Generate new secure tokens (ORDER_ACCESS_SECRET, ADMIN_API_TOKEN, CSRF_SECRET)
- [ ] Configure production payment gateway credentials
- [ ] Enable HTTPS enforcement
- [ ] Set up error tracking (Sentry/similar)
- [ ] Configure backup/monitoring
- [ ] Document incident response procedures
- [ ] Train team on new security features

### Post-Deployment Verification
- [ ] Verify security headers: `curl -I https://dekop.com`
- [ ] Test order access authorization
- [ ] Test payment webhooks with real transactions (small amounts)
- [ ] Monitor error logs for authentication failures
- [ ] Verify rate limiting is active
- [ ] Check email confirmation requires authentication

---

## Environment Variables Summary

Add these to `.env.local` and production environment:

```bash
# =====================================================
# SECURITY CONFIGURATION
# =====================================================

# Order Access Tokens (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ORDER_ACCESS_SECRET=your-64-char-random-string-here

# Admin API Access (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_API_TOKEN=your-64-char-random-string-here

# CSRF Protection (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
CSRF_SECRET=your-64-char-random-string-here

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Monobank Public Key for Webhook Verification
MONOBANK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"

# Error Tracking (Optional)
SENTRY_DSN=https://your-sentry-dsn-here
```

---

## Priority Action List

### Week 1 (CRITICAL - Before ANY Production Use)
1. ✅ Implement order access authorization (FIX-01)
2. ✅ Implement Monobank webhook verification (FIX-02)
3. ✅ Restrict order modification endpoint (FIX-03)
4. ✅ Test all critical fixes in staging environment

### Week 2 (HIGH - Before Public Launch)
5. ✅ Implement rate limiting (FIX-04)
6. ✅ Secure email confirmation endpoint (FIX-05)
7. ✅ Add security headers (FIX-06)
8. ✅ Perform penetration testing

### Week 3 (MEDIUM - Quality Improvements)
9. ✅ Implement CSRF protection (FIX-07)
10. ✅ Sanitize error messages (FIX-08)
11. ✅ Set up monitoring and alerting
12. ✅ Document security procedures

### Ongoing
- Regular dependency updates (`npm audit`)
- Security header monitoring
- Rate limit tuning based on traffic patterns
- Review access logs for suspicious activity

---

## Support and Resources

### Documentation
- OWASP Top 10: https://owasp.org/Top10/
- Next.js Security: https://nextjs.org/docs/app/building-your-application/configuring/security-headers
- LiqPay Docs: https://www.liqpay.ua/documentation/api/aquiring/checkout/doc
- Monobank Docs: https://api.monobank.ua/docs/acquiring.html

### Tools
- Security Headers Checker: https://securityheaders.com
- SSL Test: https://www.ssllabs.com/ssltest/
- OWASP ZAP: https://www.zaproxy.org/

---

**Document Version:** 1.0
**Last Updated:** 2025-11-15
**Next Review:** 2025-12-15
