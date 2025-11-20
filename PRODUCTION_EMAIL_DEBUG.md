# Production Email Issues - Debugging Guide

## Common Causes (In Order of Likelihood)

### 🔥 1. Domain NOT Verified in Resend (MOST COMMON)

**Problem:** You're trying to send from `noreply@dekop.com.ua` but the domain isn't verified.

**Solution:**
1. Go to https://resend.com/domains
2. Click **"Add Domain"**
3. Enter: `dekop.com.ua`
4. Add the DNS records Resend provides:
   ```
   TXT record: _resend.dekop.com.ua → [verification code]
   MX records (if using Resend for receiving)
   DKIM records: resend._domainkey.dekop.com.ua
   ```
5. Wait 5-10 minutes for DNS propagation
6. Click **"Verify Domain"** in Resend dashboard

**Check domain status:**
- Go to https://resend.com/domains
- Status should be: ✅ **Verified**
- If not verified: ❌ **Pending** or **Failed**

**Alternative (Quick Fix for Testing):**
Set these environment variables in Vercel to use a verified email:
```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
# This is Resend's default verified domain for testing
```

---

### 🔥 2. Environment Variables NOT Set in Vercel

**Problem:** Your `.env.local` is only on your computer, not in production.

**Solution:**
1. Go to https://vercel.com/dashboard
2. Select your project (`dekop_v0.1`)
3. Go to **Settings** → **Environment Variables**
4. Add these variables:
   ```
   RESEND_API_KEY=re_your_actual_key_here
   RESEND_FROM_EMAIL=noreply@dekop.com.ua
   RESEND_FROM_NAME=Dekop Furniture Store
   ```
5. Select environment: **Production** ✓
6. Click **"Save"**
7. **Important:** Redeploy your app after adding variables
   - Go to **Deployments** tab
   - Click ⋯ menu on latest deployment
   - Click **"Redeploy"**

**Verify variables are set:**
```bash
# Visit this URL in production:
https://your-domain.com/api/test/email

# Look for:
"resendKeyConfigured": true  ✅
# If false ❌, variables aren't set correctly
```

---

### 3. API Key Restrictions

**Check Resend API Key:**
1. Go to https://resend.com/api-keys
2. Check your API key permissions:
   - ✅ Should have **"Full Access"** or **"Sending"** permission
   - ❌ NOT "Testing" or "Development" only
3. If needed, create a new production API key
4. Update in Vercel environment variables

---

### 4. From Email Domain Mismatch

**Problem:** Using `@dekop.com.ua` but Resend only has verified domain `@otherdomain.com`

**Check:**
1. Resend dashboard → Domains
2. Verify `dekop.com.ua` is listed and verified
3. If not, either:
   - **Option A:** Verify `dekop.com.ua` (recommended for production)
   - **Option B:** Change `RESEND_FROM_EMAIL` to match a verified domain

---

### 5. Rate Limits (Free Tier)

**Free Tier Limits:**
- 100 emails/day
- 3,000 emails/month

**Check:**
1. Go to https://resend.com/overview
2. Look at **"Emails sent today"**
3. If at limit, either:
   - Wait until tomorrow
   - Upgrade to paid plan ($20/month for 50,000 emails)

---

## Debugging Steps

### Step 1: Check Production Configuration

Visit in production:
```
https://your-production-domain.com/api/test/email
```

Expected response:
```json
{
  "config": {
    "resendKeyConfigured": true,    ← Should be TRUE
    "fromEmail": "noreply@dekop.com.ua",
    "nodeEnv": "production"
  },
  "message": "✅ Resend API key is configured"
}
```

If `resendKeyConfigured: false` → **Environment variables not set in Vercel**

---

### Step 2: Send Test Email in Production

```bash
curl -X POST "https://your-production-domain.com/api/test/email?test_email=YOUR_EMAIL"
```

Check the response for specific errors.

---

### Step 3: Check Vercel Logs

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Deployments** → Click latest deployment
4. Click **"Functions"** tab
5. Click on `/api/test/email`
6. Look for error logs:
   ```
   ❌ Resend API error: [error details]
   ```

Common errors:
- `"validation_error"` → Domain not verified
- `"invalid_api_key"` → API key wrong/expired
- `"not_found"` → Email address format invalid

---

### Step 4: Test with Resend Default Domain (Bypass Domain Verification)

Temporarily change in Vercel environment variables:
```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
```

This uses Resend's verified domain. If this works, your issue is **domain verification**.

---

## Production Checklist

Before going live, verify:

- [ ] Domain `dekop.com.ua` is verified in Resend
- [ ] Environment variables set in Vercel:
  - [ ] `RESEND_API_KEY`
  - [ ] `RESEND_FROM_EMAIL`
  - [ ] `RESEND_FROM_NAME`
- [ ] Redeployed after setting environment variables
- [ ] API key has "Full Access" or "Sending" permissions
- [ ] Not hitting rate limits (100/day on free tier)
- [ ] Test email endpoint works: `/api/test/email`
- [ ] Verified emails appear in Resend logs: https://resend.com/logs

---

## Quick Fix (Right Now)

If you need emails working immediately:

1. **In Vercel Environment Variables:**
   ```bash
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```
2. **Redeploy** the application
3. **Test** - should work now
4. **Then properly verify** `dekop.com.ua` domain for production use

---

## Getting Vercel Deployment URL

If you don't know your production URL:

```bash
# Option 1: Check package.json scripts
cat package.json | grep vercel

# Option 2: Check Vercel dashboard
# https://vercel.com/dashboard

# Option 3: Check git remote
git remote -v | grep vercel
```

---

## Need More Help?

1. **Check Resend Logs:** https://resend.com/logs
   - Shows all email attempts
   - Shows error messages
   - Shows delivery status

2. **Check Vercel Function Logs:**
   - Vercel Dashboard → Deployments → Functions
   - Real-time error logging

3. **Enable Debug Mode:**
   - Our error logging already includes detailed console logs
   - Check Vercel function logs for full error details

---

## Expected Production Flow

1. User completes order
2. Payment webhook triggers: `/api/webhooks/liqpay` or `/api/webhooks/monobank`
3. Webhook calls: `sendOrderConfirmationEmail()`
4. Resend sends email from: `noreply@dekop.com.ua`
5. Customer receives email
6. Email appears in Resend logs: https://resend.com/logs

---

## Contact Support

If still not working:
- **Resend Support:** support@resend.com
- **Check Resend Status:** https://resend.com/status
- **Vercel Support:** https://vercel.com/support
