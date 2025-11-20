# Vercel Firewall Configuration for Email & Webhooks

## Issue
Vercel's bot protection is blocking API endpoints, preventing:
- Payment webhooks (LiqPay, Monobank) from triggering emails
- Test email endpoints from working
- Rate limiting legitimate API calls

## Solution: Configure Vercel Firewall Rules

### Step 1: Access Vercel Firewall Settings

1. Go to https://vercel.com/dashboard
2. Select your project (`dekop_v0.1`)
3. Go to **Settings** → **Firewall**

### Step 2: Create Bypass Rules for API Endpoints

#### Rule 1: Allow Payment Webhooks (CRITICAL)

**Rule Name:** Allow Payment Webhooks

**Condition:**
```
Path starts with /api/webhooks/
```

**Action:** Bypass

**Why:** LiqPay and Monobank need to POST to these endpoints to confirm payments and trigger order emails.

---

#### Rule 2: Allow Email API (Optional - for testing)

**Rule Name:** Allow Email Sending APIs

**Condition:**
```
Path starts with /api/orders/
OR
Path starts with /api/test/
```

**Action:** Bypass

**Why:** Allows manual email sending and testing.

**Note:** For production security, you might want to:
- Remove `/api/test/` bypass
- Add authentication to `/api/test/email`
- Only allow from specific IPs

---

### Step 3: Vercel Firewall Configuration Methods

#### Method A: Using Vercel Dashboard (Recommended)

1. **Vercel Dashboard** → Your Project → **Settings** → **Firewall**

2. Look for **"Firewall Rules"** or **"Custom Rules"**

3. Click **"Add Rule"** or **"Create Rule"**

4. Configure rule:
   - **Condition Type:** Path
   - **Operator:** starts with
   - **Value:** `/api/webhooks/`
   - **Action:** Allow / Bypass

5. Save and deploy

---

#### Method B: Using vercel.json Configuration

If Vercel firewall has limited dashboard options, you can configure via `vercel.json`:

**Create/Update `vercel.json` in project root:**

```json
{
  "headers": [
    {
      "source": "/api/webhooks/:path*",
      "headers": [
        {
          "key": "X-Robots-Tag",
          "value": "noindex"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

**Note:** This may not directly bypass bot protection, but ensures routes are accessible.

---

#### Method C: Disable Bot Protection Entirely (Not Recommended)

If Vercel's bot protection can't be configured per-path:

**Only as last resort:**
1. Vercel Dashboard → Project → Settings → Firewall
2. Disable bot protection temporarily
3. Test if webhooks work
4. Re-enable and look for allowlist options

---

### Step 4: Alternative - Use Vercel Protection with IP Allowlist

If Vercel doesn't allow path-based rules, allowlist payment provider IPs:

#### LiqPay IP Ranges (if available from LiqPay docs)
- Add LiqPay server IPs to allowlist

#### Monobank IP Ranges (if available from Monobank docs)
- Add Monobank server IPs to allowlist

**Where to find IPs:**
- LiqPay documentation: https://www.liqpay.ua/documentation
- Monobank API docs: https://api.monobank.ua/docs/

---

### Step 5: Verify Configuration

After configuring firewall rules:

```powershell
# Test webhook endpoints are accessible (should not get 403/429)
Invoke-RestMethod -Uri "https://dekop.com.ua/api/webhooks/liqpay" -Method Get

# Expected: 405 Method Not Allowed (endpoint exists but GET not allowed)
# Bad: 403 Forbidden or 429 Too Many Requests (still blocked)
```

```powershell
# Test email endpoint configuration check
Invoke-RestMethod -Uri "https://dekop.com.ua/api/test/email" -Method Get

# Should return JSON with configuration
```

```powershell
# Test sending email
Invoke-RestMethod -Uri "https://dekop.com.ua/api/test/email?test_email=vadimfes2@gmail.com" -Method Post

# Should return success response
```

---

## Vercel-Specific Firewall Features

### If Using Vercel Pro/Enterprise:

**Advanced Firewall Rules Available:**
- Path-based rules
- IP allowlisting/blocklisting
- Rate limiting per endpoint
- Custom security rules

**Configuration:**
1. Vercel Dashboard → Security
2. Firewall Rules → Add Rule
3. Select "Path" condition
4. Enter `/api/webhooks/*`
5. Action: "Allow"

### If Using Vercel Hobby (Free):

**Limited Options:**
- May not have path-based firewall rules
- Bot protection is all-or-nothing

**Options:**
1. **Upgrade to Pro** for advanced firewall rules ($20/month)
2. **Disable bot protection** (not recommended)
3. **Use middleware** to implement custom protection

---

## Option: Use Next.js Middleware for Custom Protection

If Vercel firewall is too restrictive, use Next.js middleware:

**Create `middleware.ts` in project root:**

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow webhooks without bot protection
  if (pathname.startsWith('/api/webhooks/')) {
    // No additional checks, allow through
    return NextResponse.next();
  }

  // Allow email APIs (optional - add auth here if needed)
  if (pathname.startsWith('/api/orders/send-confirmation')) {
    return NextResponse.next();
  }

  // For test endpoint, you could add IP restrictions
  if (pathname === '/api/test/email') {
    // Optional: Check for specific IP or auth header
    const clientIp = request.ip || request.headers.get('x-forwarded-for');
    // Add your IP check logic here
    return NextResponse.next();
  }

  // All other routes continue normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/webhooks/:path*',
    '/api/orders/:path*',
    '/api/test/:path*',
  ],
};
```

This middleware runs before Vercel's bot protection and can implement custom logic.

---

## Recommended Configuration

### For Production (Best Practice):

1. **Allow without protection:**
   - `/api/webhooks/*` - Payment providers must reach these

2. **Protect but allow authenticated requests:**
   - `/api/orders/send-confirmation` - Add API key auth
   - `/api/test/*` - Require authentication or remove in production

3. **Keep full protection:**
   - All public pages
   - Other API endpoints
   - Forms and user-facing features

---

## Testing Checklist

After configuration:

- [ ] Webhook endpoints return 405 (not 403/429) on GET requests
- [ ] Test email endpoint works: `/api/test/email`
- [ ] Can send test email without 429 errors
- [ ] Payment webhooks work (test with small payment)
- [ ] Order confirmation emails arrive after payment
- [ ] Bot protection still active on public pages

---

## Support Resources

- Vercel Firewall Docs: https://vercel.com/docs/security/firewall
- Vercel Pro Features: https://vercel.com/pricing
- LiqPay Webhooks: https://www.liqpay.ua/documentation/api/callback
- Monobank Webhooks: https://api.monobank.ua/docs/

---

## Quick Summary

**Current State:**
- ✅ Emails work perfectly
- ✅ Resend integration configured
- ❌ Bot protection blocking API calls

**Required Action:**
1. Go to Vercel Dashboard → Project → Settings → Firewall
2. Add rule to bypass protection for `/api/webhooks/*`
3. Test webhooks are accessible
4. Process a test payment to verify end-to-end

**If Vercel doesn't have path-based rules:**
- Use Next.js middleware (see above)
- OR upgrade to Vercel Pro for advanced firewall
- OR contact Vercel support for assistance

---

## Need Help?

If you can't find firewall settings in Vercel Dashboard:
1. Check if you're on Hobby (free) plan - may not have this feature
2. Look under: Security, Firewall, Protection, or Advanced settings
3. Contact Vercel support: https://vercel.com/support
4. Consider implementing middleware solution above
