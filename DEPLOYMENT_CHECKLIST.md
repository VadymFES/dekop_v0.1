# Deployment Checklist for Vercel

## ✅ Build Status
- **Build Result**: SUCCESS
- **TypeScript Compilation**: ✅ Passed
- **Route Generation**: ✅ All 27 routes generated
- **Security Vulnerabilities**: ✅ Fixed (0 vulnerabilities)

## 📋 Pre-Deployment Checklist

### 1. Environment Variables to Set in Vercel Dashboard

Go to your Vercel project → Settings → Environment Variables and add:

#### **Database** (Auto-provided by Vercel Postgres)
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

#### **Payment Integration**
- `LIQPAY_PUBLIC_KEY` - Your LiqPay public key
- `LIQPAY_PRIVATE_KEY` - Your LiqPay private key
- `MONOBANK_TOKEN` - Your Monobank API token
- `MONOBANK_PUBLIC_KEY` - Your Monobank public key for webhook verification
- `MONOBANK_WEBHOOK_URL` - https://yourdomain.com/api/webhooks/monobank

#### **Email Service (Resend)**
- `RESEND_API_KEY` - Get from https://resend.com/api-keys
- `RESEND_FROM_EMAIL` - e.g., noreply@dekop.com.ua
- `RESEND_FROM_NAME` - e.g., Dekop Furniture Store

#### **Security (REQUIRED for email endpoints)**
- `INTERNAL_API_KEY` - Generate using PowerShell (see below)

#### **Application Settings**
- `NEXT_PUBLIC_BASE_URL` - Your production URL (e.g., https://dekop.vercel.app)
- `NEXT_PUBLIC_SITE_URL` - Same as BASE_URL
- `NEXT_PUBLIC_API_URL` - https://dekop.vercel.app/api
- `ORDER_PREPAYMENT_PERCENTAGE` - e.g., 0.20 (for 20%)
- `ORDER_PAYMENT_DEADLINE_HOURS` - e.g., 48

### 2. Generate Internal API Key

Since OpenSSL isn't available on Windows, use PowerShell:

```powershell
# Option 1: Cryptographically secure random key (Recommended)
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$rng.GetBytes($bytes)
-join ($bytes | ForEach-Object { $_.ToString("x2") })
```

Or use Node.js:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated key and set it as `INTERNAL_API_KEY` in Vercel.

### 3. Vercel Bot Protection Configuration

If you have Vercel bot protection enabled:

1. Go to Project Settings → Security → Bot Protection
2. Add path exclusions:
   ```
   /api/webhooks/*
   /api/orders/send-confirmation
   /api/test/email
   ```

**Note**: The implementation uses signature verification (webhooks) and API key auth (email endpoints), so bot protection is not strictly required for these routes.

### 4. Domain Configuration

1. Configure your custom domain in Vercel
2. Update DNS records as instructed by Vercel
3. Update webhook URLs in LiqPay and Monobank dashboards:
   - LiqPay: `https://yourdomain.com/api/webhooks/liqpay`
   - Monobank: `https://yourdomain.com/api/webhooks/monobank`

### 5. Email Domain Verification (Resend)

1. Go to Resend dashboard → Domains
2. Add your domain (e.g., dekop.com.ua)
3. Add DNS records as instructed by Resend
4. Wait for verification (can take up to 24 hours)

## 🚀 Deployment Steps

1. **Push to GitHub** (already done ✅)
   ```bash
   git push origin claude/fix-vercel-bot-protection-email-01VYogMo3L7r2E2WvRsAf8a7
   ```

2. **Create Pull Request**
   - Merge into your main branch
   - Vercel will auto-deploy on merge

3. **Set Environment Variables**
   - Go to Vercel dashboard
   - Add all environment variables listed above
   - Make sure to set them for Production environment

4. **Trigger Deployment**
   - Vercel will auto-deploy on push to main
   - Or manually trigger from Vercel dashboard

## 🧪 Post-Deployment Testing

### Test Email Configuration
```bash
# Check configuration (no auth required)
curl https://yourdomain.com/api/test/email

# Send test email (requires API key)
curl "https://yourdomain.com/api/test/email?test_email=your@email.com" \
  -X POST \
  -H "x-api-key: YOUR_INTERNAL_API_KEY"
```

### Test Order Confirmation
```bash
curl https://yourdomain.com/api/orders/send-confirmation \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_INTERNAL_API_KEY" \
  -d '{"orderId": "test-order-id"}'
```

### Test Payment Webhooks
- Use LiqPay and Monobank test environments
- Trigger test payment
- Verify webhook is received
- Check email is sent

## 📊 Monitoring

After deployment, monitor:

1. **Vercel Logs**
   - Project → Deployments → Click deployment → Runtime Logs
   - Watch for errors in webhook processing

2. **Resend Dashboard**
   - Check email delivery status
   - Monitor for bounces or failures

3. **Database**
   - Monitor order creation
   - Verify payment status updates

## 🔒 Security Notes

Your implementation includes:

✅ **Webhook Signature Verification**
- LiqPay: Cryptographic signature using private key
- Monobank: X-Sign header validation

✅ **API Key Authentication**
- Email endpoints protected with `x-api-key` header
- Test email endpoint protected

✅ **Secure Configuration**
- All secrets in environment variables
- No secrets committed to repository

## 📖 Documentation

Key documentation files:
- `docs/VERCEL_BOT_PROTECTION.md` - Security and bot protection setup
- `.env.example` - Environment variable reference
- `README.md` - Project overview (if exists)

## ⚠️ Known Build Warning

During build, you may see a database connection error:
```
❌ Database error (51ms): Unknown error
Error fetching featured products...
```

This is **expected and safe**. It occurs because:
- Build process tries to fetch featured products for static generation
- Database is not accessible during build time
- Does not affect production runtime

## 🎯 Next Steps After Deployment

1. Test all payment flows (LiqPay, Monobank)
2. Verify email sending works
3. Test order creation end-to-end
4. Monitor logs for first 24 hours
5. Set up monitoring/alerting (optional)

## 📞 Support

If issues occur:
1. Check Vercel runtime logs
2. Verify all environment variables are set
3. Review `docs/VERCEL_BOT_PROTECTION.md`
4. Check Resend dashboard for email delivery issues

---

**All systems ready for deployment! 🚀**
