# Fixing Payment Webhooks Blocked by Vercel Bot Protection

## The Problem

Payment providers (LiqPay, Monobank) send webhooks to your endpoints, but Vercel's bot protection blocks them **at the edge** before they reach your application. This means:

1. ❌ Payment webhook arrives at Vercel edge
2. ❌ Bot protection blocks it (403 Forbidden)
3. ❌ Your webhook handler never runs
4. ❌ No email sent because order not confirmed

**Key Issue**: You cannot add `x-vercel-protection-bypass` headers to external webhook requests from payment providers.

---

## Solutions (In Order of Preference)

### Option 1: IP Allowlisting (Recommended)

**Requirements**: Vercel Pro or Enterprise plan

Add payment provider IPs to Vercel's trusted IP list. This bypasses bot protection for these IPs.

#### Steps:

1. **Contact Payment Providers for IP Ranges**

   **LiqPay IPs:**
   - Contact LiqPay support: support@liqpay.ua
   - Request: "What are your webhook server IP addresses?"
   - Expected format: List of IPs or CIDR ranges

   **Monobank IPs:**
   - Contact Monobank support: api@monobank.ua
   - Request: "What are your webhook server IP addresses for api.monobank.ua?"
   - Documentation: https://api.monobank.ua/docs/

2. **Add to Vercel Dashboard**

   - Go to: Project Settings → Security → Firewall
   - Click: "Add Rule"
   - Rule type: "IP Address"
   - Action: "Allow"
   - Add each payment provider IP/CIDR range

3. **Test Webhooks**
   - Trigger test payment in LiqPay sandbox
   - Check Vercel logs for webhook receipt
   - Verify email is sent

---

### Option 2: Contact Vercel Support to Exclude Webhook Paths

**Requirements**: Vercel Pro or Enterprise plan

Request Vercel support to exclude specific paths from bot protection.

#### Steps:

1. **Open Support Ticket**
   - Go to: https://vercel.com/support
   - Subject: "Exclude webhook paths from bot protection"

2. **Request Path Exclusions**
   ```
   Please exclude the following paths from bot protection:
   - /api/webhooks/liqpay (POST only)
   - /api/webhooks/monobank (POST only)

   These are payment webhooks with cryptographic signature verification.
   They are secured by:
   - LiqPay: HMAC signature verification with LIQPAY_PRIVATE_KEY
   - Monobank: X-Sign header validation with public key
   ```

3. **Wait for Configuration**
   - Support will configure this on their end
   - Usually takes 1-2 business days
   - Test after confirmation

---

### Option 3: Use Webhook Proxy Service (Workaround)

**Requirements**: None (works on all Vercel plans)

Use a third-party webhook proxy that Vercel's bot protection allows.

#### Recommended Services:

**A) Webhook.site** (Free for testing)
1. Go to: https://webhook.site
2. Get unique URL: `https://webhook.site/abc123`
3. Configure in LiqPay/Monobank as webhook URL
4. Forward to your endpoint with custom headers

**B) Zapier** (Paid)
1. Create Zapier webhook trigger
2. Configure payment provider to send to Zapier
3. Zapier forwards to your endpoint with bypass header

**C) Self-hosted Proxy**
If you have another server (not on Vercel):
1. Set up simple proxy on that server
2. Payment providers → Your proxy → Vercel (with bypass header)

#### Example Self-Hosted Proxy (Node.js):

```javascript
// proxy-server.js
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.raw({ type: 'application/x-www-form-urlencoded' }));

app.post('/liqpay', async (req, res) => {
  try {
    const response = await axios.post(
      'https://yourdomain.com/api/webhooks/liqpay',
      req.body,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-vercel-protection-bypass': process.env.VERCEL_BYPASS_TOKEN
        }
      }
    );
    res.send(response.data);
  } catch (error) {
    res.status(500).send('Proxy error');
  }
});

app.listen(3000);
```

---

### Option 4: Temporarily Disable Bot Protection (Not Recommended)

**⚠️ WARNING**: Only use for testing. Leaves you vulnerable to DDoS attacks.

#### Steps:

1. **Go to Vercel Dashboard**
   - Project Settings → Security → Attack Challenge Mode

2. **Disable Protection**
   - Turn off "Attack Challenge Mode"

3. **Test Webhooks**
   - Verify webhooks work
   - Verify emails are sent

4. **Re-enable ASAP**
   - Turn Attack Challenge Mode back on
   - Use Option 1, 2, or 3 for permanent solution

---

## Getting Payment Provider IPs

### LiqPay

**Method 1: Contact Support**
```
To: support@liqpay.ua
Subject: Webhook Server IP Addresses

Hello,

We need to add your webhook server IP addresses to our firewall allowlist.

Could you please provide:
1. All IP addresses your webhook servers use
2. Whether these IPs are static or dynamic
3. Recommended security practices for webhook endpoints

Thank you!
```

**Method 2: Check Headers**
When you receive a webhook (temporarily disable bot protection):
```bash
# In your webhook handler, log the IP
console.log('Webhook IP:', request.headers.get('x-forwarded-for'));
```

### Monobank

**Method 1: Documentation**
- Check: https://api.monobank.ua/docs/
- Look for: "Webhook IP addresses" or "Callback server IPs"

**Method 2: Contact Support**
```
To: api@monobank.ua
Subject: API Webhook Server IP Addresses

Hello,

We need to add your webhook server IP addresses to our firewall allowlist.

Could you please provide:
1. All IP addresses api.monobank.ua uses for webhooks
2. Whether these IPs are static or dynamic
3. Any recommended firewall configurations

Thank you!
```

---

## Quick Test: Is Bot Protection the Issue?

### 1. Temporarily Disable Bot Protection
- Dashboard → Security → Attack Challenge Mode → OFF

### 2. Trigger Test Payment
- Use LiqPay sandbox/test payment
- Check Vercel logs

### 3. If It Works
- ✅ **Bot protection was the issue**
- Re-enable bot protection
- Use Option 1 (IP allowlisting) or Option 2 (contact support)

### 4. If It Still Doesn't Work
- Check payment provider dashboard for webhook delivery logs
- Verify webhook URL is correct
- Check signature verification isn't failing

---

## Recommended Approach

**For Production:**

1. **Immediate**: Use Option 4 (temporarily disable) to verify this is the issue
2. **Short-term**: Contact payment providers for IPs (same day)
3. **Permanent**: Implement Option 1 (IP allowlisting) once you have IPs

**Timeline:**
- Day 1: Disable bot protection, verify webhooks work
- Day 1-2: Contact payment providers for IPs
- Day 2-3: Add IPs to Vercel allowlist
- Day 3: Re-enable bot protection, test

---

## Environment Variable for Webhook Proxy (Option 3)

If using webhook proxy approach, add:

```bash
# Your Vercel bypass token (from Dashboard → Security → Protection Bypass)
VERCEL_PROTECTION_BYPASS_TOKEN=secret_your_token_here

# Proxy server URL (if using external proxy)
WEBHOOK_PROXY_URL=https://your-proxy.com
```

---

## Verifying the Fix

After implementing any solution:

### 1. Check Webhook Delivery
**LiqPay:**
- Go to LiqPay merchant dashboard
- Check webhook delivery logs
- Should show: 200 OK (not 403 Forbidden)

**Monobank:**
- Go to Monobank API dashboard
- Check webhook callback history
- Should show: Successful delivery

### 2. Check Vercel Logs
```
Dashboard → Deployments → [Latest] → Runtime Logs

Look for:
✅ LiqPay callback data: {...}
✅ LiqPay payment successful for order...
✅ Email delivered: ...
```

### 3. Test End-to-End
- Create real test order
- Make test payment
- Verify:
  - ✅ Order status updated to "confirmed"
  - ✅ Email sent to customer
  - ✅ Webhook logged in Vercel

---

## Summary

| Solution | Cost | Time | Difficulty | Recommended |
|----------|------|------|------------|-------------|
| IP Allowlisting | Pro plan | 1-2 days | Easy | ✅ Best |
| Vercel Support | Pro plan | 1-2 days | Easy | ✅ Good |
| Webhook Proxy | Variable | 1-2 hours | Medium | ⚠️ Workaround |
| Disable Protection | Free | 5 minutes | Easy | ❌ Testing only |

**Best solution**: Get payment provider IPs → Add to Vercel IP allowlist → Keep bot protection enabled

---

## Need Help?

**Issue**: Can't get payment provider IPs
**Solution**: Use Option 3 (webhook proxy) temporarily while waiting

**Issue**: Don't have Vercel Pro plan
**Solution**:
1. Upgrade to Pro ($20/month)
2. Or use Option 3 (webhook proxy)
3. Or disable bot protection (not recommended for production)

**Issue**: Still not working after IP allowlisting
**Solution**:
1. Verify IPs are correct (check x-forwarded-for header)
2. Verify IP allowlist rules are saved in Vercel
3. Check payment provider webhook delivery logs
4. Contact Vercel support for troubleshooting
