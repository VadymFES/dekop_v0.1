# Testing Resend Email Integration

## Prerequisites

1. **Get Resend API Key**
   - Sign up at https://resend.com
   - Go to API Keys section
   - Create a new API key
   - Copy the key (starts with `re_`)

2. **Update .env.local**
   ```bash
   RESEND_API_KEY=re_your_actual_api_key_here
   RESEND_FROM_EMAIL=noreply@dekop.com.ua
   RESEND_FROM_NAME=Dekop Furniture Store
   ```

3. **Important: Email Restrictions**
   - **Without domain verification**: You can only send emails to the email address you used to sign up with Resend
   - **With domain verification**: You can send to any email address
   - For testing, use your Resend signup email first

## Method 1: Using the Test Script (Easiest)

```bash
# Make sure dev server is running
npm run dev

# In another terminal, run:
./test-email.sh your@email.com
```

## Method 2: Using cURL Commands

### Check Email Configuration
```bash
curl http://localhost:3000/api/test/email
```

Expected response:
```json
{
  "status": "Email configuration check",
  "emailService": "Resend",
  "config": {
    "resendKeyConfigured": true,
    "fromEmail": "noreply@dekop.com.ua",
    "fromName": "Dekop Furniture Store"
  },
  "message": "✅ Resend API key is configured"
}
```

### Send Test Email
```bash
curl -X POST "http://localhost:3000/api/test/email?test_email=your@email.com"
```

Expected success response:
```json
{
  "success": true,
  "message": "Test email sent successfully to your@email.com",
  "messageId": "abc123...",
  "status": "sent",
  "testOrder": {
    "order_number": "TEST-1234",
    "total_amount": 15000
  }
}
```

## Method 3: Using Browser/Postman

1. Start dev server: `npm run dev`
2. Open browser or Postman
3. Make POST request to: `http://localhost:3000/api/test/email?test_email=your@email.com`

## Troubleshooting

### Error: "RESEND_API_KEY is not configured"
- Check that `.env.local` exists in project root
- Verify the API key is set correctly
- Restart the dev server after changing `.env.local`

### Error: "Failed to send email via Resend"
- **Check your API key** is valid and not expired
- **Verify email address**:
  - Use your Resend signup email for testing
  - OR verify your domain in Resend dashboard
- **Check Resend dashboard** for error logs: https://resend.com/logs

### Email Not Arriving
- Check spam/junk folder
- Verify the email address is correct
- Check Resend dashboard logs for delivery status
- For free tier, ensure you're sending to your verified email

## Domain Verification (For Production)

To send emails from `noreply@dekop.com.ua` in production:

1. Go to Resend Dashboard → Domains
2. Add domain: `dekop.com.ua`
3. Add DNS records provided by Resend:
   - TXT record for verification
   - MX records (if using Resend as email provider)
   - DKIM records for authentication
4. Wait for verification (usually a few minutes)
5. Once verified, you can send from any address @dekop.com.ua

## Test Email Content

The test email includes:
- Order confirmation format
- Test order number (TEST-xxxx)
- Sample product (Тестовий диван "Комфорт")
- Ukrainian language content
- Proper formatting with HTML template
- All order details (customer info, delivery, payment)

## Next Steps

Once email sending works:
1. Test payment webhooks (LiqPay/Monobank)
2. Verify order confirmation emails are sent automatically
3. Test order status update emails
4. Monitor Resend dashboard for delivery statistics

## Useful Links

- Resend Dashboard: https://resend.com/overview
- Resend Logs: https://resend.com/logs
- Resend API Keys: https://resend.com/api-keys
- Resend Domains: https://resend.com/domains
- Resend Documentation: https://resend.com/docs
