# Production Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Variables - ALL REQUIRED

Add these to your production environment (Vercel, etc.):

#### Database (Vercel Postgres)
```env
POSTGRES_URL=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...
POSTGRES_USER=...
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=...
```

#### Next.js Configuration
```env
NEXT_PUBLIC_BASE_URL=https://dekop.com.ua
NEXT_PUBLIC_SITE_URL=https://dekop.com.ua
NEXT_PUBLIC_API_URL=https://dekop.com.ua/api
```

#### LiqPay Payment Gateway
```env
LIQPAY_PUBLIC_KEY=your_production_liqpay_public_key
LIQPAY_PRIVATE_KEY=your_production_liqpay_private_key
```

#### Monobank Payment Gateway
```env
MONOBANK_TOKEN=your_production_monobank_token
MONOBANK_WEBHOOK_URL=https://dekop.com.ua/api/webhooks/monobank
```

#### Resend Email Service ⭐
```env
RESEND_API_KEY=re_your_resend_api_key_from_dashboard
RESEND_FROM_EMAIL=noreply@dekop.com.ua
RESEND_FROM_NAME=Dekop Furniture Store
```

#### Order Configuration
```env
ORDER_PREPAYMENT_PERCENTAGE=0.20
ORDER_PAYMENT_DEADLINE_HOURS=48
ORDER_NUMBER_PREFIX=
```

#### Environment
```env
NODE_ENV=production
```

---

## 🚀 Deployment Steps

### Option 1: Vercel (Recommended - 5 minutes)

**1. Connect Repository**
```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Or just use the web interface
```

**2. Import Project**
- Go to https://vercel.com/new
- Import your GitHub repository: `VadymFES/dekop_v0.1`
- Select branch: `claude/debug-email-sending-013Q2KjDrqKBqB76Mibuc9wX` or merge to main first

**3. Configure Environment Variables**
- In Vercel project settings → Environment Variables
- Add ALL variables from the checklist above
- Make sure to select "Production" environment

**4. Configure Domain**
- Go to Settings → Domains
- Add custom domain: `dekop.com.ua`
- Update DNS records as Vercel instructs

**5. Deploy**
- Click "Deploy"
- Wait 2-3 minutes
- Your site is live! 🎉

---

### Option 2: Other Platforms

**Docker/VPS:**
- Ensure all environment variables are set
- Run `npm run build`
- Run `npm start`
- Configure reverse proxy (nginx) for HTTPS

**AWS/DigitalOcean:**
- Similar to Vercel, add environment variables
- Ensure Node.js 18+ is installed
- Set up SSL certificates

---

## 🔧 Post-Deployment Verification

### 1. Test Payment Webhooks (CRITICAL!)

**LiqPay Webhook:**
```bash
# LiqPay will call this URL after payment
https://dekop.com.ua/api/webhooks/liqpay
```

**Monobank Webhook:**
```bash
# Monobank will call this URL after payment
https://dekop.com.ua/api/webhooks/monobank
```

✅ **Verify webhooks are accessible:**
- Test with: `curl https://dekop.com.ua/api/webhooks/liqpay`
- Should return 400 (expected - needs payment data)
- NOT 404 or 500

### 2. Test Email Sending

Visit:
```
https://dekop.com.ua/api/test/email
```

Should show:
```json
{
  "message": "✅ Resend API key is configured - email service should work"
}
```

**Send test email:**
```
https://dekop.com.ua/api/test/email?test_email=YOUR_EMAIL@gmail.com
```

### 3. Complete Order Flow Test

1. Add product to cart
2. Go through checkout
3. Complete payment (use test card if available)
4. **Verify:**
   - ✅ Payment gateway redirects back to site
   - ✅ Webhook triggers (check logs)
   - ✅ Email is sent to customer
   - ✅ Order appears in database
   - ✅ Order status is "confirmed"

### 4. Monitor Logs

**Vercel:**
- Go to Deployments → Functions
- Check real-time logs for any errors

**Check for:**
- ✅ Email sending logs: `📧 Attempting to send...`
- ✅ Webhook logs: `LiqPay/Monobank payment successful`
- ❌ Any error messages

---

## 📋 Resend Production Setup

### 1. Verify Domain (if not done)
- Go to https://resend.com/domains
- Ensure `dekop.com.ua` shows green checkmark ✅
- If not, add DNS records:

```
Type: TXT
Name: @
Value: [from Resend dashboard]

Type: MX
Name: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
```

### 2. Check API Key
- Make sure you're using the production API key
- Not a test/sandbox key
- Starts with `re_`

### 3. Monitor Email Deliverability
- Go to https://resend.com/emails
- Check delivery status
- Monitor bounce/spam rates

---

## 🔒 Security Checklist

- ✅ All API keys are in environment variables (not in code)
- ✅ `.env.local` is in `.gitignore`
- ✅ HTTPS is enabled on production domain
- ✅ Payment webhooks verify signatures
- ✅ Database credentials are secure
- ✅ No sensitive data in client-side code

---

## 🐛 Common Production Issues

### Issue: Emails not sending
**Solution:**
1. Check Resend dashboard logs
2. Verify `dekop.com.ua` domain is verified
3. Check API key is correct in environment variables
4. Check `RESEND_FROM_EMAIL=noreply@dekop.com.ua` matches verified domain

### Issue: Webhooks not working
**Solution:**
1. Verify webhook URLs are publicly accessible
2. Check payment gateway dashboard for webhook logs
3. Ensure HTTPS is working (payment gateways require HTTPS)
4. Check webhook signature verification isn't failing

### Issue: Payment redirect errors
**Solution:**
1. Verify `NEXT_PUBLIC_BASE_URL=https://dekop.com.ua` (with HTTPS)
2. Check payment gateway settings have correct return URLs
3. Ensure SSL certificate is valid

### Issue: Database connection errors
**Solution:**
1. Verify all `POSTGRES_*` environment variables are set
2. Check database is accessible from deployment region
3. Verify connection pooling settings

---

## 📊 Monitoring & Analytics

### Recommended Tools:
1. **Vercel Analytics** - Built-in, free
2. **Sentry** - Error tracking
3. **LogRocket** - Session replay
4. **Google Analytics** - Already integrated

### What to Monitor:
- Email delivery rates (Resend dashboard)
- Payment success rates (LiqPay/Monobank dashboards)
- API response times
- Error rates
- Order conversion funnel

---

## 🎉 You're Ready for Production!

### Final Steps:
1. ✅ Merge your branch to `main` (or deploy current branch)
2. ✅ Add all environment variables to production
3. ✅ Deploy to Vercel or your hosting platform
4. ✅ Test complete order flow
5. ✅ Monitor for 24 hours
6. ✅ Celebrate! 🥳

### Support:
- **Email Issues:** Check Resend dashboard and logs
- **Payment Issues:** Check LiqPay/Monobank dashboards
- **Code Issues:** Review application logs

---

## 📝 Summary of Changes Made

All changes are in branch: `claude/debug-email-sending-013Q2KjDrqKBqB76Mibuc9wX`

### What we fixed:
1. ✅ Email sending error handling and logging
2. ✅ SSL protocol error on payment redirect
3. ✅ Test email data type issues
4. ✅ Migrated from Mailchimp to Resend
5. ✅ Improved price formatting to handle edge cases

### What's ready for production:
1. ✅ Beautiful Ukrainian order confirmation emails
2. ✅ Payment webhooks trigger emails automatically
3. ✅ Test endpoint for debugging
4. ✅ Comprehensive error logging
5. ✅ No test mode restrictions (Resend)

**Total commits:** 5
- Enhanced email logging
- Fixed payment redirect URLs
- Fixed test email data types
- Migrated to Resend
- Updated test endpoint

Good luck with your launch! 🚀
