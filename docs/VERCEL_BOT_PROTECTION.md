# Vercel Bot Protection Configuration for Email Routes

## Problem

When Vercel's bot protection is enabled, it can block legitimate API requests to email-sending endpoints and payment webhooks, preventing the application from sending order confirmation emails and processing payment notifications.

## Solution

This project implements a security-first approach that works with Vercel's bot protection:

### 1. Webhook Signature Verification (Already Implemented)

Payment webhooks use cryptographic signature verification:

- **LiqPay webhooks** (`/api/webhooks/liqpay`): Verifies signatures using `LIQPAY_PRIVATE_KEY`
- **Monobank webhooks** (`/api/webhooks/monobank`): Verifies signatures using X-Sign header validation

This allows webhooks to bypass bot protection because only legitimate payment providers can generate valid signatures.

### 2. Internal API Key Authentication

Internal email endpoints use API key authentication:

- **Order confirmation** (`/api/orders/send-confirmation`): Requires `x-api-key` header
- **Test email** (`/api/test/email POST`): Requires `x-api-key` header

Configure the API key in your environment variables:
```bash
# Generate a strong random key
openssl rand -hex 32

# Add to .env.local
INTERNAL_API_KEY=your_generated_key_here
```

### 3. Vercel Configuration (`vercel.json`)

The `vercel.json` file configures:
- Cache headers for API routes
- Extended timeout (30 seconds) for email and webhook functions

### 4. Vercel Dashboard Configuration

**IMPORTANT**: You must also configure bot protection settings in your Vercel dashboard.

#### Steps to Configure Vercel Dashboard:

1. **Go to Your Project Settings**
   - Navigate to your project on Vercel
   - Click on "Settings" tab
   - Select "Security" from the left sidebar

2. **Configure Bot Protection**
   - Find "Bot Protection" section
   - If enabled, you need to add path exclusions

3. **Add Path Exclusions**

   Add the following paths to the exclusion list:
   ```
   /api/webhooks/*
   /api/orders/send-confirmation
   /api/test/email
   ```

4. **Configure Firewall Rules (if applicable)**

   If you have Vercel Firewall enabled:
   - Go to "Firewall" section
   - Add rules to allow POST requests to webhook endpoints
   - Add rules to allow GET/POST to email test endpoint

5. **Environment Variables**

   Ensure these are set in Vercel dashboard:
   ```
   RESEND_API_KEY=your_resend_api_key
   RESEND_FROM_EMAIL=noreply@dekop.com.ua
   RESEND_FROM_NAME=Dekop Furniture Store
   INTERNAL_API_KEY=your_internal_api_key
   ```

   Generate a strong API key:
   ```bash
   openssl rand -hex 32
   ```

## Testing the Configuration

After deploying, test each endpoint:

### Test Email Endpoint
```bash
# Check configuration (no auth required)
curl https://your-domain.vercel.app/api/test/email

# Send test email (requires API key)
curl "https://your-domain.vercel.app/api/test/email?test_email=your@email.com" \
  -X POST \
  -H "x-api-key: your_internal_api_key"
```

### Test Order Confirmation
```bash
curl https://your-domain.vercel.app/api/orders/send-confirmation \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_internal_api_key" \
  -d '{"orderId": "your-order-id"}'
```

### Test Webhooks

For webhooks, you'll need to trigger actual payment events from LiqPay or Monobank test environments, as they include signature verification.

## Troubleshooting

### Issue: Still getting blocked by bot protection

**Solution 1: Check Vercel Logs**
- Go to your project on Vercel
- Check "Logs" tab for bot protection blocks
- Look for 403 or 429 status codes

**Solution 2: Verify Path Exclusions**
- Ensure paths are correctly entered in dashboard
- Paths should match exactly (case-sensitive)
- Use wildcards correctly (`/api/webhooks/*`)

**Solution 3: Contact Vercel Support**
- If using Vercel Pro or Enterprise
- Request manual configuration of bot protection exclusions
- Provide list of webhook URLs that need to be allowed

### Issue: Webhooks timing out

**Solution**: Increase function timeout in `vercel.json`:
```json
{
  "functions": {
    "api/webhooks/*.ts": {
      "maxDuration": 60
    }
  }
}
```

Note: Free tier supports up to 10s, Hobby up to 10s, Pro up to 60s

### Issue: Emails not sending

**Solution**: Check these in order:
1. Verify `RESEND_API_KEY` is set correctly
2. Check Resend dashboard for API errors
3. Review application logs for email service errors
4. Test with `/api/test/email` endpoint first

## Security Architecture

This approach provides strong security without relying on bot protection:

1. **Webhook Signature Verification** (Payment Webhooks)
   - LiqPay webhooks verify signature using `LIQPAY_PRIVATE_KEY`
   - Monobank webhooks verify signature using X-Sign header and public key
   - Only payment providers can generate valid signatures
   - Bot protection is not needed because of cryptographic verification

2. **Internal API Key Authentication** (Email Endpoints)
   - Order confirmation and test email endpoints require `x-api-key` header
   - API key is stored securely in environment variables
   - Prevents unauthorized access even if bot protection is off
   - Key can be rotated without code changes

3. **Rate Limiting** (Optional Enhancement)
   - Consider adding rate limiting using Vercel KV or Redis
   - Implement per-IP rate limits for additional protection
   - Example: 10 requests per minute per endpoint

4. **Email Service Validation**
   - All email endpoints validate Resend API key configuration
   - Invalid configurations fail fast with clear error messages

## References

- [Vercel Bot Protection Documentation](https://vercel.com/docs/security/bot-protection)
- [Vercel Firewall Documentation](https://vercel.com/docs/security/firewall)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Resend Email API Documentation](https://resend.com/docs)

## Support

If you continue to experience issues after following these steps:

1. Check the GitHub issues for similar problems
2. Create a new issue with:
   - Error messages from Vercel logs
   - Configuration screenshots (hide sensitive data)
   - Steps to reproduce the issue
3. Contact Vercel support for bot protection configuration help
