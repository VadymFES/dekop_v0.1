# Configuring Vercel Bot Protection for Email Routes

## The Problem

Vercel's bot protection (DDoS protection) blocks requests **at the edge**, before they reach your application code. This means:
- API key authentication doesn't help (request blocked before reaching your code)
- Response headers don't help (request already blocked)
- Middleware doesn't help (never executed)

## Solutions

You have **three options** to allow email sending with bot protection enabled:

---

## Option 1: Protection Bypass for Automation (Recommended)

This generates a secret token that bypasses bot protection when included in requests.

### Steps:

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Settings → Security → Protection Bypass for Automation

2. **Generate Bypass Token**
   - Click "Create Token"
   - Copy the generated secret (e.g., `secret_abc123xyz...`)

3. **Use Token in Requests**

   When calling your email endpoints, include the bypass header:

   ```bash
   # Test email with bypass
   curl "https://yourdomain.com/api/test/email?test_email=test@email.com" \
     -X POST \
     -H "x-vercel-protection-bypass: secret_abc123xyz..." \
     -H "x-api-key: your_internal_api_key"

   # Send order confirmation with bypass
   curl https://yourdomain.com/api/orders/send-confirmation \
     -X POST \
     -H "Content-Type: application/json" \
     -H "x-vercel-protection-bypass: secret_abc123xyz..." \
     -H "x-api-key: your_internal_api_key" \
     -d '{"orderId": "order-id"}'
   ```

4. **Store Bypass Token Securely**
   - Add to your environment variables: `VERCEL_PROTECTION_BYPASS_TOKEN`
   - Use it when making internal API calls

### When to Use This Option:
- ✅ You're calling email endpoints from your backend/server
- ✅ You have automated processes that send emails
- ✅ You want maximum security (bot protection stays on)

---

## Option 2: Disable Bot Protection for Specific Paths

Completely disable bot protection for email/webhook routes.

### Steps:

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Settings → Security → Attack Challenge Mode

2. **Configure Path Exclusions**

   Unfortunately, Vercel's UI doesn't currently support path-based exclusions for bot protection. You need to **disable it entirely** or use Option 1.

3. **Alternative: Contact Vercel Support**
   - If you have Pro or Enterprise plan
   - Request path-based exclusions for:
     - `/api/webhooks/liqpay`
     - `/api/webhooks/monobank`
     - `/api/orders/send-confirmation`
     - `/api/test/email`

### When to Use This Option:
- ⚠️ Only if you can't use Option 1
- ⚠️ You must have Pro/Enterprise plan
- ⚠️ Requires Vercel support assistance

---

## Option 3: IP Allowlisting

Allow specific IPs to bypass bot protection.

### Steps:

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Settings → Security → Trusted IPs (Pro/Enterprise only)

2. **Add Your Server IPs**
   - Add the IP addresses of servers that will call your email endpoints
   - Format: `192.168.1.1` or CIDR notation `192.168.1.0/24`

3. **Configure Payment Provider IPs**

   Add these IP ranges for webhooks:

   **LiqPay IPs** (check with LiqPay support for current list):
   ```
   Add LiqPay's webhook server IPs
   ```

   **Monobank IPs** (check with Monobank support):
   ```
   Add Monobank's webhook server IPs
   ```

### When to Use This Option:
- ✅ You have Pro or Enterprise plan
- ✅ You know the IPs of all services calling your endpoints
- ✅ Your IPs are static (not dynamic)
- ❌ Won't work for dynamic IPs or development

---

## Option 4: Disable Bot Protection Entirely (Not Recommended)

Only use this as a last resort for testing.

### Steps:

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Settings → Security → Attack Challenge Mode

2. **Disable Protection**
   - Turn off "Attack Challenge Mode"

### When to Use This Option:
- ⚠️ **ONLY for testing/development**
- ⚠️ **NEVER for production** (leaves you vulnerable to DDoS)

---

## Recommended Setup

For production, use **both security layers**:

1. **Vercel Protection Bypass Token** (Option 1)
   - Use `x-vercel-protection-bypass` header for internal calls

2. **Your Internal API Key** (already implemented)
   - Keep `x-api-key` header requirement
   - Provides second layer of security

### Example: Calling Email Endpoint from Your Backend

```javascript
// In your backend service
const response = await fetch('https://yourdomain.com/api/orders/send-confirmation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-vercel-protection-bypass': process.env.VERCEL_PROTECTION_BYPASS_TOKEN,
    'x-api-key': process.env.INTERNAL_API_KEY,
  },
  body: JSON.stringify({ orderId: 'order-123' })
});
```

---

## Webhooks (LiqPay, Monobank)

Payment webhooks are **already secure** through signature verification:
- LiqPay: Verifies cryptographic signature
- Monobank: Validates X-Sign header

**For webhooks**, you can:
1. Use Option 3 (IP Allowlisting) - add payment provider IPs
2. Or disable bot protection for webhook paths (contact Vercel support)
3. Webhooks should generally work as payment providers are usually allowlisted

---

## Testing Your Configuration

### 1. Test Without Bypass (Should Fail)
```bash
curl "https://yourdomain.com/api/test/email?test_email=test@email.com" \
  -X POST \
  -H "x-api-key: your_internal_api_key"
# Expected: 403 Forbidden or bot protection challenge
```

### 2. Test With Bypass (Should Succeed)
```bash
curl "https://yourdomain.com/api/test/email?test_email=test@email.com" \
  -X POST \
  -H "x-vercel-protection-bypass: secret_abc123xyz..." \
  -H "x-api-key: your_internal_api_key"
# Expected: 200 OK + email sent
```

---

## Environment Variables Checklist

Add these to Vercel dashboard (Settings → Environment Variables):

```bash
# Email Service
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@dekop.com.ua
RESEND_FROM_NAME=Dekop Furniture Store

# Security
INTERNAL_API_KEY=your_internal_api_key
VERCEL_PROTECTION_BYPASS_TOKEN=secret_abc123xyz...  # From Option 1

# Payment Gateways
LIQPAY_PUBLIC_KEY=your_liqpay_public_key
LIQPAY_PRIVATE_KEY=your_liqpay_private_key
MONOBANK_TOKEN=your_monobank_token
MONOBANK_PUBLIC_KEY=your_monobank_public_key
```

---

## Common Errors and Solutions

### Error: 403 Forbidden
**Cause**: Bot protection blocking request
**Solution**: Add `x-vercel-protection-bypass` header (Option 1)

### Error: 401 Unauthorized
**Cause**: Missing or invalid API key
**Solution**: Add correct `x-api-key` header

### Error: 503 Service Unavailable
**Cause**: Rate limited by Vercel
**Solution**: Wait or contact Vercel support to increase limits

### Webhooks Not Working
**Cause**: Payment provider IPs blocked
**Solution**: Add provider IPs to allowlist (Option 3) or contact Vercel support

---

## Priority Actions

**Do this NOW:**

1. ✅ Go to Vercel Dashboard → Security → Protection Bypass for Automation
2. ✅ Generate a bypass token
3. ✅ Save token as `VERCEL_PROTECTION_BYPASS_TOKEN` in environment variables
4. ✅ Update your email-sending code to include both headers:
   - `x-vercel-protection-bypass: <token>`
   - `x-api-key: <your-internal-key>`

This combination provides maximum security while allowing your legitimate requests through.

---

## Need Help?

If you're still having issues:
1. Check Vercel logs: Dashboard → Deployments → [Latest] → Runtime Logs
2. Look for 403 errors or bot protection messages
3. Verify both tokens are set correctly in environment variables
4. Test with curl commands above
5. Contact Vercel support if on Pro/Enterprise plan
