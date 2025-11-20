# Vercel Bot Protection Configuration for Email Routes

## Problem

When Vercel's bot protection is enabled, it can block legitimate API requests to email-sending endpoints and payment webhooks, preventing the application from sending order confirmation emails and processing payment notifications.

## Solution

This project implements a multi-layered approach to ensure email functionality works with bot protection enabled:

### 1. Next.js Proxy Function (`proxy.ts`)

The proxy function identifies critical API routes and adds appropriate headers:

- `/api/webhooks/liqpay` - LiqPay payment webhook
- `/api/webhooks/monobank` - Monobank payment webhook
- `/api/orders/send-confirmation` - Order confirmation email endpoint
- `/api/test/email` - Email testing endpoint

Note: This project uses `proxy.ts` instead of `middleware.ts` for compatibility with Vercel's deployment system.

### 2. Vercel Configuration (`vercel.json`)

The `vercel.json` file configures:
- Cache headers for API routes
- Extended timeout (30 seconds) for email and webhook functions

### 3. Vercel Dashboard Configuration

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
   ```

## Testing the Configuration

After deploying, test each endpoint:

### Test Email Endpoint
```bash
# Check configuration
curl https://your-domain.vercel.app/api/test/email

# Send test email
curl "https://your-domain.vercel.app/api/test/email?test_email=your@email.com" \
  -X POST
```

### Test Order Confirmation
```bash
curl https://your-domain.vercel.app/api/orders/send-confirmation \
  -X POST \
  -H "Content-Type: application/json" \
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

## Additional Security Considerations

While we're excluding these routes from bot protection, they have their own security measures:

1. **Webhook Signature Verification**
   - LiqPay webhooks verify signature using `LIQPAY_PRIVATE_KEY`
   - Monobank webhooks verify signature using X-Sign header
   - Only valid signatures are processed

2. **Rate Limiting** (Optional Enhancement)
   - Consider adding rate limiting middleware
   - Use Vercel KV or external service
   - Limit requests per IP/per time period

3. **API Key Validation**
   - Email endpoints check for valid Resend API key
   - Invalid configurations are rejected early

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
