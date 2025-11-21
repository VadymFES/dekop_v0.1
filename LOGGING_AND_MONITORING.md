# Logging & Monitoring Infrastructure

## Overview

This document describes the comprehensive logging and monitoring infrastructure implemented for the Dekop e-commerce platform using **Sentry** for error tracking and structured logging.

## Architecture

### Technology Stack
- **Sentry**: Error tracking, performance monitoring, and structured logging
- **Custom Logger**: Structured logging utility with automatic data masking
- **Error Handler**: Sanitized error responses with full internal logging

### Components

1. **Sentry Configuration** (`sentry.*.config.ts`)
2. **Structured Logger** (`app/lib/logger.ts`)
3. **Error Handler** (`app/lib/error-handler.ts`)
4. **Security Monitoring** (integrated throughout)

---

## Setup & Configuration

### 1. Environment Variables

Add the following to your `.env.local`:

```bash
# Sentry DSN (Data Source Name) - Required
SENTRY_DSN=https://your_key@your_org.ingest.sentry.io/your_project_id
NEXT_PUBLIC_SENTRY_DSN=https://your_key@your_org.ingest.sentry.io/your_project_id

# Sentry Organization & Project (for source map uploads)
SENTRY_ORG=your_organization_slug
SENTRY_PROJECT=your_project_name

# Sentry Auth Token (for build-time source map uploads)
SENTRY_AUTH_TOKEN=your_sentry_auth_token_here
```

### 2. Sentry Initialization

Three separate configuration files initialize Sentry for different runtimes:

- **`sentry.client.config.ts`**: Browser/client-side initialization
- **`sentry.server.config.ts`**: Node.js server-side initialization
- **`sentry.edge.config.ts`**: Edge runtime initialization

The `instrumentation.ts` file automatically loads the appropriate configuration.

---

## Logging Capabilities

### Log Levels

| Level | Usage | Sentry Level | Description |
|-------|-------|--------------|-------------|
| `DEBUG` | Development only | debug | Detailed debugging information |
| `INFO` | General information | info | Normal application flow |
| `WARN` | Warning messages | warning | Potentially harmful situations |
| `ERROR` | Error events | error | Error events with stack traces |
| `SECURITY` | Security events | fatal | Critical security incidents |

### Logger Methods

```typescript
import { logger } from '@/app/lib/logger';

// Basic logging
logger.debug('Debugging info', { userId: '123' });
logger.info('User logged in', { userId: '123' });
logger.warn('Unusual activity', { ip: '1.2.3.4' });
logger.error('Payment failed', error, { orderId: 'ABC123' });

// Security event logging
logger.security({
  type: 'auth_failure',
  severity: 'high',
  details: 'Invalid API key provided',
  metadata: { ip: '1.2.3.4', endpoint: '/api/orders' }
}, { userId: '123' });

// Payment event logging (creates audit trail)
logger.paymentLog({
  event: 'success',
  provider: 'liqpay',
  orderId: 'ABC123',
  amount: 5000,
  transactionId: 'TXN123'
});

// Performance tracking with Sentry spans
const result = await logger.withSpan(
  { op: 'http.client', name: 'Fetch order data' },
  async () => {
    return await fetchOrder(orderId);
  }
);
```

---

## Security Event Monitoring

### Event Types

Security events are automatically tracked with the following types:

| Type | Severity | When to Use |
|------|----------|-------------|
| `auth_failure` | high/critical | Failed authentication attempts |
| `webhook_invalid` | high/critical | Invalid webhook signatures, IP validation failures |
| `replay_attack` | critical | Duplicate webhook detection |
| `unauthorized_access` | high | Access to protected resources without permission |
| `suspicious_activity` | medium/high | Unusual patterns or behaviors |
| `rate_limit` | medium | Rate limit violations |

### Security Event Examples

```typescript
// Authentication failure
logger.security({
  type: 'auth_failure',
  severity: 'critical',
  details: 'API key validation failed - missing configuration',
  metadata: { endpoint: '/api/orders/create' }
});

// Webhook signature verification failure
logger.security({
  type: 'webhook_invalid',
  severity: 'critical',
  details: 'LiqPay webhook signature verification failed',
  metadata: { provider: 'liqpay', orderId: 'ABC123' }
});

// Replay attack detection
logger.security({
  type: 'replay_attack',
  severity: 'critical',
  details: 'Replay attack detected for webhook',
  metadata: { webhookId: 'liqpay_TXN123', provider: 'liqpay' }
});
```

---

## Audit Logging for Financial Transactions

### What is Logged

All financial transactions are automatically logged to Sentry with full audit trails:

1. **Payment Creation**
   - Provider (LiqPay, Monobank)
   - Order ID
   - Amount
   - Transaction ID

2. **Payment Success**
   - Order confirmation
   - Email notification sent
   - Payment provider confirmation

3. **Payment Failure**
   - Failure reason
   - Order status update
   - Customer notification

4. **Refunds**
   - Refund amount
   - Refund reason
   - Order status change

### Payment Audit Example

```typescript
// Automatically creates Sentry event with:
// - Message: "Payment success: liqpay - Order ABC123"
// - Tags: { payment: true, paymentEvent: 'success', provider: 'liqpay', orderId: 'ABC123' }
// - Extra data: { amount, transactionId, provider, orderId }
// - Breadcrumbs: Payment flow tracking

logger.paymentLog({
  event: 'success',
  provider: 'liqpay',
  orderId: 'ABC123',
  amount: 5000,
  transactionId: 'TXN123'
});
```

### Viewing Audit Logs

In Sentry:
1. Navigate to **Issues** > Filter by tag `payment: true`
2. Navigate to **Breadcrumbs** to see payment flow timeline
3. Use search: `tags.payment:true tags.orderId:ABC123`

---

## Error Handling

### Sanitized Error Responses

The error handler ensures:
- **Production**: Generic, safe error messages (prevents information disclosure)
- **Development**: Full error details with stack traces
- **Sentry**: Full error details logged internally

### Error Types

| Type | HTTP Status | Example |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `AUTHENTICATION_ERROR` | 401 | Invalid API key |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `PAYMENT_ERROR` | 402 | Payment processing failed |
| `DATABASE_ERROR` | 500 | Database query failed |
| `EXTERNAL_API_ERROR` | 502 | External service unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `RATE_LIMIT_ERROR` | 429 | Too many requests |

### Error Handler Usage

```typescript
import { handleError, createPaymentError } from '@/app/lib/error-handler';

export async function POST(request: Request) {
  try {
    // Your code here
    if (!isValid) {
      throw createPaymentError('Payment validation failed', { orderId });
    }
  } catch (error) {
    // Automatically logs to Sentry and returns sanitized response
    return handleError(error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/api/payments/create'
    });
  }
}

// Or use the wrapper (recommended)
import { withErrorHandler } from '@/app/lib/error-handler';

export const POST = withErrorHandler(async (request: Request) => {
  // Your code here - errors are automatically handled
});
```

---

## Data Privacy & Masking

### Automatic Data Masking

The logger automatically masks sensitive data in all logs:

**Masked Fields:**
- `password`
- `apiKey`, `api_key`
- `token`
- `secret`
- `creditCard`, `credit_card`
- `cvv`
- `ssn`
- `privateKey`, `private_key`

Example:
```typescript
logger.info('User data', {
  username: 'john',
  password: 'secret123',  // Will be logged as '[REDACTED]'
  email: 'john@example.com'
});
```

### Sentry Data Filtering

Additional filtering happens at the Sentry level:
- Cookies removed
- Authorization headers removed
- Sensitive query parameters redacted

---

## Performance Monitoring

### Sentry Tracing

Automatic performance tracking for:
- API requests
- Database queries
- External service calls
- Payment processing

### Custom Spans

```typescript
// Track custom operations
const result = await logger.withSpan(
  {
    op: 'payment.process',
    name: 'Process LiqPay Payment',
    attributes: { orderId: 'ABC123', amount: 5000 }
  },
  async () => {
    return await processPayment(order);
  }
);
```

---

## Monitoring Best Practices

### 1. Use Appropriate Log Levels
- Use `logger.debug()` for verbose development-only logs
- Use `logger.info()` for normal application flow
- Use `logger.warn()` for recoverable issues
- Use `logger.error()` for error conditions
- Use `logger.security()` for security events

### 2. Include Context
Always include relevant context in your logs:
```typescript
logger.error('Order not found', undefined, {
  orderId: 'ABC123',
  userId: 'USER456',
  ip: request.headers.get('x-forwarded-for')
});
```

### 3. Track Payment Operations
Use `logger.paymentLog()` for all payment-related events:
```typescript
logger.paymentLog({
  event: 'created',
  provider: 'liqpay',
  orderId,
  amount: order.total
});
```

### 4. Monitor Security Events
Log all security-related events:
```typescript
logger.security({
  type: 'unauthorized_access',
  severity: 'high',
  details: 'Attempt to access protected resource',
  metadata: { resource: '/api/admin', ip }
});
```

---

## Alerting Configuration

### Sentry Alerts

Configure alerts in Sentry for:

1. **Critical Security Events**
   - Filter: `level:fatal AND tags.security:true`
   - Notification: Immediate (Slack, Email, PagerDuty)

2. **Payment Failures**
   - Filter: `tags.payment:true AND tags.paymentEvent:failed`
   - Notification: 15 minutes delay, aggregate

3. **Error Rate Spikes**
   - Condition: Error rate > 10 errors/minute
   - Notification: Immediate

4. **Performance Degradation**
   - Condition: Average response time > 2 seconds
   - Notification: 5 minutes delay

---

## Debugging & Troubleshooting

### Finding Logs in Sentry

1. **Search by Order ID:**
   ```
   tags.orderId:ABC123
   ```

2. **Search by Payment Provider:**
   ```
   tags.provider:liqpay
   ```

3. **Search by Error Type:**
   ```
   tags.errorType:PAYMENT_ERROR
   ```

4. **Search Security Events:**
   ```
   tags.security:true level:fatal
   ```

### Log Correlation

All logs include automatic correlation IDs through Sentry's transaction tracking:
- Request ID
- User ID (when available)
- Order ID (for payment flows)
- Provider (for payment operations)

---

## Migration from Console Logging

### Before
```typescript
console.log('Payment successful for order', orderId);
console.error('Payment failed:', error);
```

### After
```typescript
logger.paymentLog({
  event: 'success',
  provider: 'liqpay',
  orderId,
  transactionId
});

logger.paymentLog({
  event: 'failed',
  provider: 'liqpay',
  orderId,
  error
});
```

---

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `SENTRY_DSN` in production environment
- [ ] Configure `NEXT_PUBLIC_SENTRY_DSN` for client-side monitoring
- [ ] Set up Sentry alerts for critical events
- [ ] Configure Sentry release tracking
- [ ] Enable source map uploads with `SENTRY_AUTH_TOKEN`
- [ ] Review Sentry data retention policies
- [ ] Configure team notifications (Slack, email, etc.)
- [ ] Test error reporting in staging environment
- [ ] Set up Sentry performance monitoring thresholds

---

## Resources

- **Sentry Documentation**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Logger Source**: `app/lib/logger.ts`
- **Error Handler Source**: `app/lib/error-handler.ts`
- **Sentry Config**: `sentry.*.config.ts`
- **Example Usage**: See webhook handlers in `app/api/webhooks/`

---

## Support & Contact

For issues related to logging and monitoring:
1. Check Sentry dashboard for real-time errors
2. Review this documentation
3. Check application logs in production
4. Contact the development team

---

**Last Updated**: 2025-11-21
**Version**: 1.0
