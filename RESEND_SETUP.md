# Resend Email Service Setup Guide

This guide will help you set up Resend email service for dekop.com.ua in under 10 minutes.

## What is Resend?

Resend is a modern email API service that's perfect for transactional emails (order confirmations, status updates, etc.).

**Benefits:**
- ✅ **Free tier**: 3,000 emails/month, 100 emails/day
- ✅ **No test mode restrictions**: Send to any email immediately
- ✅ **Simple setup**: One API key, no complex configuration
- ✅ **Great deliverability**: 99%+ inbox delivery rate
- ✅ **Developer-friendly**: Clean API, excellent docs

## Step 1: Create Resend Account (2 minutes)

1. Go to https://resend.com
2. Click **"Sign Up"** or **"Get Started"**
3. Sign up with your GitHub account or email
4. Verify your email address

## Step 2: Add Your Domain (5 minutes)

1. In Resend dashboard, go to **"Domains"** → **"Add Domain"**
2. Enter: `dekop.com.ua`
3. Resend will show you DNS records to add

### DNS Records to Add

Add these records to your domain registrar (where you bought dekop.com.ua):

```
Type: TXT
Name: @ (or dekop.com.ua)
Value: [Resend will provide this - looks like: resend-verify=abc123...]

Type: MX
Name: @ (or dekop.com.ua)
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
```

**Where to add DNS records:**
- If using Cloudflare: DNS → Add Record
- If using GoDaddy: My Products → DNS → Add Record
- If using nic.ua: DNS Settings → Add Record

4. Wait 5-15 minutes for DNS to propagate
5. In Resend, click **"Verify DNS Records"**
6. When verified, you'll see a green checkmark ✅

## Step 3: Get API Key (1 minute)

1. In Resend dashboard, go to **"API Keys"**
2. Click **"Create API Key"**
3. Name it: `dekop-production` or `dekop-dev`
4. Select **"Full Access"** or **"Sending Access"**
5. Click **"Create"**
6. **Copy the API key** (starts with `re_`)
   - ⚠️ **Important**: Save it now - you won't see it again!

## Step 4: Configure Environment Variables (1 minute)

Add these to your environment variables:

### For Local Development (.env.local)

Create `.env.local` file in your project root:

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@dekop.com.ua
RESEND_FROM_NAME=Dekop Furniture Store
```

### For Production (Vercel/Your Hosting)

Add the same variables to your hosting platform:

**Vercel:**
1. Go to your project → Settings → Environment Variables
2. Add:
   - `RESEND_API_KEY` = `re_...`
   - `RESEND_FROM_EMAIL` = `noreply@dekop.com.ua`
   - `RESEND_FROM_NAME` = `Dekop Furniture Store`
3. Redeploy your app

**Other platforms:** Add the same environment variables to your deployment config.

## Step 5: Test Email Sending (1 minute)

### Test in Browser

Open in your browser:
```
http://localhost:3000/api/test/email?test_email=YOUR_EMAIL@gmail.com
```

Replace `YOUR_EMAIL@gmail.com` with your actual email.

### Test in PowerShell

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/test/email?test_email=YOUR_EMAIL@gmail.com" -Method POST
```

### Expected Result

You should see:
```json
{
  "success": true,
  "message": "Test email sent successfully to YOUR_EMAIL@gmail.com",
  "messageId": "..."
}
```

**Check your inbox!** You should receive a beautiful Ukrainian order confirmation email.

## Troubleshooting

### "Domain not verified" error

- Wait 15-30 minutes for DNS propagation
- Check DNS records are added correctly
- Use `nslookup` or https://dnschecker.org to verify DNS

### "API key not configured" error

- Make sure `.env.local` exists in project root
- Restart your dev server after adding env variables
- Check spelling: `RESEND_API_KEY` (not `RESENT` or `RESEND_KEY`)

### "RESEND_API_KEY is not configured" in logs

- Check env variable is set correctly
- Make sure API key starts with `re_`
- Try copying the API key again (no extra spaces)

### Emails not arriving

- Check spam folder
- Verify domain is verified in Resend dashboard (green checkmark)
- Check Resend dashboard → Logs for delivery status
- Make sure you're using `noreply@dekop.com.ua` (verified domain)

## Pricing

**Free Tier:**
- 3,000 emails per month
- 100 emails per day
- Perfect for starting out

**Paid Plans (if you grow):**
- $20/month: 50,000 emails
- $80/month: 100,000 emails

**Current cost:** $0.10 per 1,000 emails is cheaper than Mailchimp!

## Support

- **Resend Docs**: https://resend.com/docs
- **Resend Support**: support@resend.com
- **DNS Help**: Check with your domain registrar

## What's Next?

Once setup is complete:
1. ✅ Emails will send automatically when customers complete orders
2. ✅ Payment webhooks (LiqPay, Monobank) will trigger confirmation emails
3. ✅ You can manually send emails via `/api/orders/send-confirmation`

**All your email sending is now handled by Resend!** 🎉
