# Production Email Fix - Quick Checklist

## 🔥 Most Likely Cause (95% of cases)

### Issue: Domain Not Verified in Resend

**Quick Fix:**

1. **Go to Resend Dashboard:**
   https://resend.com/domains

2. **Check if `dekop.com.ua` is listed and VERIFIED**
   - ✅ Green checkmark = working
   - ❌ Red X or not listed = THIS IS YOUR PROBLEM

3. **If not verified, add domain:**
   - Click "Add Domain"
   - Enter: `dekop.com.ua`
   - Copy DNS records Resend provides
   - Add to your DNS provider:
     ```
     TXT record: _resend.dekop.com.ua → [verification string]
     ```
   - Wait 5-10 minutes
   - Click "Verify" in Resend

4. **TEMPORARY WORKAROUND (Testing Only):**
   - In Vercel: Set `RESEND_FROM_EMAIL=onboarding@resend.dev`
   - This bypasses domain verification
   - ⚠️ Only for testing! Verify your domain for production

---

## ✅ Quick Verification Steps

### Step 1: Check if env vars are set in Vercel

```bash
# Run this to check your production config:
./verify-production-email.sh https://your-production-domain.vercel.app
```

OR manually visit:
```
https://your-production-domain.vercel.app/api/test/email
```

Look for:
```json
"resendKeyConfigured": true  ← Must be TRUE
```

If FALSE:
1. Go to https://vercel.com/dashboard
2. Your project → Settings → Environment Variables
3. Add these:
   - `RESEND_API_KEY` = `re_your_key_here`
   - `RESEND_FROM_EMAIL` = `noreply@dekop.com.ua`
   - `RESEND_FROM_NAME` = `Dekop Furniture Store`
4. **IMPORTANT:** Redeploy after adding variables
   - Deployments → ⋯ → Redeploy

---

### Step 2: Test sending in production

```bash
curl -X POST "https://your-production-domain.vercel.app/api/test/email?test_email=YOUR_EMAIL"
```

Check response for specific error message.

---

### Step 3: Check logs for detailed errors

**Vercel Logs:**
1. https://vercel.com/dashboard
2. Your project → Deployments
3. Click latest deployment
4. Functions tab → Click `/api/test/email`
5. Look for error logs with 🔍 emoji (our enhanced logging)

**Resend Logs:**
- https://resend.com/logs
- Shows all email attempts and errors

---

## 🎯 Common Error Messages & Fixes

### Error: "validation_error" or mentions "domain"
**Cause:** Domain not verified
**Fix:** Verify `dekop.com.ua` in Resend dashboard
**Quick workaround:** Use `RESEND_FROM_EMAIL=onboarding@resend.dev`

### Error: "api_key" or "unauthorized"
**Cause:** API key invalid or not set
**Fix:** Check `RESEND_API_KEY` in Vercel environment variables

### Error: "RESEND_API_KEY is not configured"
**Cause:** Environment variables not set in Vercel
**Fix:** Add env vars in Vercel → Redeploy

### No error but email not arriving
**Check:**
1. Spam folder
2. Resend logs (https://resend.com/logs) - shows delivery status
3. Free tier limit (100 emails/day)

---

## 📋 Complete Setup Checklist

- [ ] **Resend Account Setup**
  - [ ] API key created
  - [ ] Domain `dekop.com.ua` added to Resend
  - [ ] Domain verified (DNS records added)
  - [ ] Not hitting rate limits (check dashboard)

- [ ] **Vercel Environment Variables**
  - [ ] `RESEND_API_KEY` set
  - [ ] `RESEND_FROM_EMAIL` set
  - [ ] `RESEND_FROM_NAME` set
  - [ ] Application redeployed after adding variables

- [ ] **Testing**
  - [ ] `/api/test/email` shows `resendKeyConfigured: true`
  - [ ] Can send test email successfully
  - [ ] Email appears in Resend logs
  - [ ] Email arrives in inbox

---

## 🚀 Deploy & Test Now

1. **Deploy this branch to production:**
   ```bash
   git push
   # Vercel auto-deploys on push
   ```

2. **Verify domain in Resend:**
   https://resend.com/domains

3. **Add/check environment variables in Vercel:**
   https://vercel.com/dashboard

4. **Redeploy if you added variables**

5. **Test with verification script:**
   ```bash
   ./verify-production-email.sh https://your-domain.vercel.app
   ```

---

## 📚 Documentation

- **Detailed debugging guide:** `PRODUCTION_EMAIL_DEBUG.md`
- **Local testing guide:** `RESEND_TESTING.md`
- **Verification script:** `./verify-production-email.sh`

---

## 🆘 Still Not Working?

1. Run: `./verify-production-email.sh https://your-production-url.vercel.app`
2. Check Vercel function logs for error with 🔍 emoji
3. Check Resend logs: https://resend.com/logs
4. Look at the error message - it now includes helpful hints!
5. Consult `PRODUCTION_EMAIL_DEBUG.md` for detailed troubleshooting

---

**TL;DR: 99% chance it's domain verification. Go to https://resend.com/domains and verify dekop.com.ua**
