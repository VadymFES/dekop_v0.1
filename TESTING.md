# Testing Documentation

This document describes the testing infrastructure and test coverage for the Dekop e-commerce platform.

## Test Infrastructure

### Framework
- **Jest**: Test runner and assertion library
- **Testing Library**: React component testing utilities
- **MSW (Mock Service Worker)**: API mocking for integration tests
- **ts-jest**: TypeScript support for Jest

### Configuration
- `jest.config.js`: Main Jest configuration
- `jest.setup.js`: Global test setup and mocks
- `app/__tests__/test-utils.ts`: Shared test utilities and helpers

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### CI/CD Pipeline
```bash
npm run test:ci
```

### Test Categories

#### Unit Tests
```bash
npm run test:unit
```
Tests individual services in isolation:
- Payment service logic
- Utility functions
- Data transformations

#### Integration Tests
```bash
npm run test:integration
```
Tests webhook handlers with all security layers:
- LiqPay webhook processing
- Monobank webhook processing
- Payment flow integration

#### API Tests
```bash
npm run test:api
```
Tests API endpoints:
- Order retrieval with IDOR protection
- Cart operations
- Input validation

## Test Coverage

### Payment Services

#### LiqPay Service (`app/__tests__/services/liqpay-service.test.ts`)
- ✅ Payment creation with valid data
- ✅ Signature generation and verification
- ✅ Status mapping (success, failure, refunded, pending, sandbox)
- ✅ Base64 encoding/decoding
- ✅ Error handling (missing credentials, network failures)
- ✅ Edge cases (large amounts, special characters, Cyrillic text)

#### Monobank Service (`app/__tests__/services/monobank-service.test.ts`)
- ✅ Invoice creation with correct parameters
- ✅ Amount conversion to kopiykas
- ✅ RSA-SHA256 signature verification
- ✅ Status mapping (success, failure, expired, refunded, pending)
- ✅ Invoice status retrieval
- ✅ Invoice cancellation
- ✅ Error handling (invalid credentials, API failures)
- ✅ Decimal precision handling

### Webhook Security

#### LiqPay Webhook (`app/__tests__/webhooks/liqpay-webhook.test.ts`)

**4-Layer Security Architecture:**
1. **Layer 1: IP Whitelist Validation**
   - ✅ Accepts webhooks from whitelisted IPs
   - ✅ Rejects unauthorized IPs when validation enabled
   - ✅ Bypasses check when DISABLE_WEBHOOK_IP_VALIDATION=true

2. **Layer 2: Signature Verification**
   - ✅ Validates SHA1 signature
   - ✅ Rejects invalid signatures
   - ✅ Detects tampered data
   - ✅ Requires both data and signature parameters

3. **Layer 3: Replay Attack Prevention**
   - ✅ Tracks processed webhooks via database
   - ✅ Rejects duplicate webhooks (409 Conflict)
   - ✅ Uses transaction_id or payment_id for deduplication

4. **Layer 4: Timestamp Validation**
   - ✅ Rejects webhooks older than 10 minutes
   - ✅ Accepts recent webhooks
   - ✅ Handles missing timestamps gracefully

**Payment Processing:**
- ✅ Successful payment → Updates order status, sends email
- ✅ Failed payment → Updates status, no email
- ✅ Refunded payment → Updates to refunded status
- ✅ Pending payment → Keeps pending status
- ✅ Sandbox mode → Treats as successful payment

**Error Handling:**
- ✅ Missing order_id in callback
- ✅ Database errors don't expose internal details
- ✅ Email failures don't block webhook processing
- ✅ Malformed JSON handled gracefully

#### Monobank Webhook (`app/__tests__/webhooks/monobank-webhook.test.ts`)

**4-Layer Security Architecture:**
1. **Layer 1: IP Whitelist Validation**
   - ✅ Accepts webhooks from whitelisted IPs
   - ✅ Rejects unauthorized IPs when validation enabled

2. **Layer 2: RSA Signature Verification**
   - ✅ Validates RSA-SHA256 signature from X-Sign header
   - ✅ Rejects invalid signatures
   - ✅ Detects tampered payloads
   - ✅ Handles special characters in JSON

3. **Layer 3: Replay Attack Prevention**
   - ✅ Tracks processed webhooks by invoiceId
   - ✅ Rejects duplicate webhooks (409 Conflict)

4. **Layer 4: Timestamp Validation**
   - ✅ Validates modifiedDate timestamp
   - ✅ Rejects old webhooks (>10 minutes)

**Payment Processing:**
- ✅ Success status → Paid, sends email
- ✅ Failure/Expired → Failed status
- ✅ Reversed → Refunded status
- ✅ Created/Processing/Hold → Pending status

**Error Handling:**
- ✅ Missing reference (order ID)
- ✅ Missing X-Sign header
- ✅ Database connection failures
- ✅ Email service failures don't block webhook

### Input Validation & Security

#### Validation Schemas (`app/__tests__/lib/validation-schemas.test.ts`)

**XSS Prevention:**
- ✅ Removes HTML tags from inputs
- ✅ Strips angle brackets (<>)
- ✅ Handles multiple XSS attempts
- ✅ Preserves Cyrillic characters
- ✅ Allows safe special characters (&, ', emojis)

**Input Sanitization:**
- ✅ Trims whitespace
- ✅ Normalizes email addresses (lowercase)
- ✅ Enforces string length limits
- ✅ Validates phone number format (+380XXXXXXXXX)
- ✅ Validates email format

**Validation Rules:**
- ✅ Cart item: quantity (1-100), product ID, color
- ✅ Order creation: all required fields, enums, numeric constraints
- ✅ Phone format: Ukrainian format only
- ✅ Delivery method: nova_poshta, store_delivery, pickup
- ✅ Payment method: liqpay, monobank, cash_on_delivery

**Edge Cases:**
- ✅ SQL injection attempts (safe due to parameterized queries)
- ✅ Null byte injection
- ✅ Very long strings
- ✅ Empty/whitespace-only strings
- ✅ Invalid UUIDs

### API Endpoints

#### Order Retrieval (`app/__tests__/api/orders/order-retrieval.test.ts`)

**IDOR Protection:**
- ✅ Requires email parameter to access order
- ✅ Verifies email matches order before returning data
- ✅ Returns generic error for wrong email (doesn't leak info)
- ✅ Case-insensitive email comparison
- ✅ Prevents order ID enumeration

**Input Validation:**
- ✅ Rejects invalid email formats
- ✅ Validates email before database query
- ✅ Requires valid order ID (UUID)

**Data Retrieval:**
- ✅ Returns complete order with items
- ✅ Handles orders with no items
- ✅ Single optimized query with json_agg

**Security Best Practices:**
- ✅ Generic error messages (no information leakage)
- ✅ Prevents email enumeration attacks
- ✅ Uses parameterized queries (SQL injection protection)
- ✅ Doesn't reveal if order exists or email is wrong

## Test Utilities

### Helper Functions (`app/__tests__/test-utils.ts`)

**Mock Creators:**
- `createMockRequest()` - Creates Next.js Request objects
- `createMockTransaction()` - Mocks database transactions
- `createTestOrder()` - Generates test order data
- `createTestCart()` - Generates test cart data
- `createTestProduct()` - Generates test product data

**Signature Helpers:**
- `generateLiqPaySignature()` - Creates valid LiqPay SHA1 signatures
- `generateMonobankSignature()` - Creates valid RSA signatures
- `createTestKeyPair()` - Generates RSA key pairs for testing

**Mock Utilities:**
- `mockFetch()` - Mocks global fetch for API calls
- `mockDbClient` - Mocks database client
- `waitFor()` - Async operation helper

## Coverage Goals

Target coverage thresholds (configured in `jest.config.js`):
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Continuous Integration

### GitHub Actions / CI Pipeline

Recommended CI configuration:

```yaml
- name: Run Tests
  run: npm run test:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Testing Best Practices

### Security Testing
1. **Always test authentication/authorization** - Every protected endpoint
2. **Test IDOR vulnerabilities** - Ensure users can't access others' data
3. **Validate input sanitization** - XSS, SQL injection prevention
4. **Test error messages** - Don't leak sensitive information

### Payment Testing
1. **Mock external APIs** - Never call real payment providers in tests
2. **Test signature verification** - Critical security feature
3. **Test all payment statuses** - Success, failure, pending, refunded
4. **Test replay attack prevention** - Duplicate webhook handling

### Integration Testing
1. **Test complete flows** - Cart → Order → Payment → Webhook
2. **Test all security layers** - IP, signature, replay, timestamp
3. **Test error paths** - Network failures, timeouts, invalid data

### Unit Testing
1. **Test edge cases** - Empty strings, large numbers, special characters
2. **Test error handling** - Missing credentials, API failures
3. **Test data transformations** - Encoding, decoding, conversions

## Troubleshooting

### Common Issues

#### Tests timing out
```bash
# Increase timeout in jest.config.js
testTimeout: 10000
```

#### Mock not working
```bash
# Clear Jest cache
npx jest --clearCache
```

#### Import errors
```bash
# Check moduleNameMapper in jest.config.js
# Ensure paths match your project structure
```

## Future Testing Priorities

### To Add
- [ ] Cart API endpoint tests
- [ ] Order creation endpoint tests
- [ ] Product API tests
- [ ] E2E tests with Playwright/Cypress
- [ ] Load testing for webhooks
- [ ] Visual regression tests

### Performance Testing
- [ ] Webhook handler response time (<200ms)
- [ ] Database query optimization tests
- [ ] Concurrent webhook processing

### Additional Security Testing
- [ ] Rate limiting tests
- [ ] CSRF token validation
- [ ] Session management tests
- [ ] Cookie security tests (httpOnly, secure, sameSite)

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
