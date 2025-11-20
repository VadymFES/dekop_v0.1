# Resend Webhook Setup Guide

## Overview

Resend webhooks allow you to track email events in real-time:
- **email.sent**: Email accepted by Resend
- **email.delivered**: Successfully delivered to recipient
- **email.bounced**: Email bounced (hard or soft)
- **email.complained**: Recipient marked as spam
- **email.opened**: Recipient opened email (requires tracking)
- **email.clicked**: Recipient clicked a link (requires tracking)

This project implements **cryptographic signature verification** for Resend webhooks using HMAC-SHA256, ensuring only legitimate Resend events are processed.

---

## Setup Instructions

### 1. Configure Webhook in Resend Dashboard

1. **Go to Resend Dashboard**
   - Navigate to https://resend.com/webhooks
   - Sign in to your account

2. **Create New Webhook**
   - Click "Create Webhook"
   - **Endpoint URL**: `https://yourdomain.com/api/webhooks/resend`
   - **Events to Subscribe**: Select the events you want to track:
     - ✅ `email.sent`
     - ✅ `email.delivered`
     - ✅ `email.bounced`
     - ✅ `email.complained`
     - ⚠️ `email.opened` (requires email tracking enabled)
     - ⚠️ `email.clicked` (requires email tracking enabled)

3. **Get Signing Secret**
   - After creating the webhook, click on it
   - Copy the **Signing Secret** (starts with `whsec_...`)
   - This is used to verify webhook authenticity

### 2. Add Environment Variables

Add the signing secret to your environment:

**Local Development (.env.local):**
```bash
RESEND_WEBHOOK_SECRET=whsec_your_signing_secret_here
```

**Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add new variable:
   - **Name**: `RESEND_WEBHOOK_SECRET`
   - **Value**: `whsec_your_signing_secret_here`
   - **Environment**: Production, Preview, Development

### 3. Test Webhook

Resend provides a webhook testing feature:

1. **In Resend Dashboard**
   - Go to your webhook
   - Click "Send Test Event"
   - Select event type (e.g., `email.delivered`)
   - Click "Send Test"

2. **Check Logs**
   - In Vercel: Dashboard → Deployments → Runtime Logs
   - Look for: `✅ Resend webhook verified`

3. **Manual Test with cURL**
   ```bash
   # Note: This will fail signature verification (expected)
   # Real webhooks from Resend will pass verification
   curl https://yourdomain.com/api/webhooks/resend \
     -X POST \
     -H "Content-Type: application/json" \
     -H "svix-signature: v1,1234567890,test" \
     -d '{
       "type": "email.delivered",
       "data": {
         "email_id": "test-123",
         "from": "noreply@dekop.com.ua",
         "to": ["customer@example.com"],
         "subject": "Test Email"
       }
     }'
   ```

---

## Security Features

### 1. Signature Verification

Every webhook is verified using HMAC-SHA256:

```typescript
// Resend signs webhooks using Svix
// Signature format: "v1,timestamp,signature1,signature2,..."
const isValid = verifyResendWebhook(body, signature, secret);
```

**What's Verified:**
- ✅ Request comes from Resend (cryptographic proof)
- ✅ Payload hasn't been tampered with
- ✅ Signature matches expected value

### 2. Replay Attack Prevention

Webhooks include timestamps to prevent replay attacks:

```typescript
// Rejects webhooks older than 5 minutes
const isRecent = validateWebhookTimestamp(signature, 300);
```

**Protection Against:**
- ❌ Replaying old webhook requests
- ❌ Man-in-the-middle attacks
- ❌ Timing attacks (uses constant-time comparison)

### 3. Multiple Signature Support

Resend may provide multiple signatures during key rotation:

```typescript
// Checks all provided signatures
signatures.some(sig => crypto.timingSafeEqual(sig, expected));
```

---

## Webhook Events

### Email Lifecycle Events

#### 1. email.sent
```json
{
  "type": "email.sent",
  "data": {
    "email_id": "abc123",
    "from": "noreply@dekop.com.ua",
    "to": ["customer@example.com"],
    "subject": "Order Confirmation",
    "created_at": "2025-01-20T10:00:00Z"
  }
}
```
**When**: Email accepted by Resend
**Action**: Log for debugging

#### 2. email.delivered
```json
{
  "type": "email.delivered",
  "data": {
    "email_id": "abc123",
    "from": "noreply@dekop.com.ua",
    "to": ["customer@example.com"],
    "subject": "Order Confirmation"
  }
}
```
**When**: Successfully delivered to recipient
**Action**: Mark order notification as sent

#### 3. email.bounced
```json
{
  "type": "email.bounced",
  "data": {
    "email_id": "abc123",
    "from": "noreply@dekop.com.ua",
    "to": ["invalid@example.com"],
    "bounce_type": "Hard",
    "bounce_reason": "Mailbox does not exist"
  }
}
```
**When**: Email bounced (hard or soft)
**Action**:
- **Hard Bounce**: Mark email as invalid, remove from list
- **Soft Bounce**: Retry later (temporary issue)

#### 4. email.complained
```json
{
  "type": "email.complained",
  "data": {
    "email_id": "abc123",
    "from": "noreply@dekop.com.ua",
    "to": ["customer@example.com"],
    "complaint_type": "spam"
  }
}
```
**When**: Recipient marked email as spam
**Action**:
- Immediately unsubscribe user
- Never send to this email again
- Review email content/frequency

### Engagement Events (Optional)

#### 5. email.opened
```json
{
  "type": "email.opened",
  "data": {
    "email_id": "abc123",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  }
}
```
**When**: Recipient opened email (requires tracking pixel)
**Action**: Track engagement metrics

#### 6. email.clicked
```json
{
  "type": "email.clicked",
  "data": {
    "email_id": "abc123",
    "link": "https://dekop.com.ua/order/123",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  }
}
```
**When**: Recipient clicked a tracked link
**Action**: Track engagement metrics

---

## Implementation Details

### Current Behavior

The webhook handler logs all events:

```typescript
switch (type) {
  case 'email.delivered':
    console.log(`✅ Email delivered: ${data.email_id}`);
    break;

  case 'email.bounced':
    if (data.bounce_type === 'Hard') {
      // TODO: Mark email as invalid in database
    }
    break;

  case 'email.complained':
    // TODO: Unsubscribe user immediately
    break;
}
```

### Future Enhancements

You can extend the handler to:

1. **Track Email Status in Database**
   ```typescript
   await sql`
     UPDATE orders
     SET email_delivered = true,
         email_delivered_at = NOW()
     WHERE user_email = ${data.to[0]}
   `;
   ```

2. **Handle Bounces**
   ```typescript
   await sql`
     INSERT INTO email_bounces (email, bounce_type, reason, bounced_at)
     VALUES (${data.to[0]}, ${data.bounce_type}, ${data.bounce_reason}, NOW())
   `;
   ```

3. **Manage Spam Complaints**
   ```typescript
   await sql`
     INSERT INTO email_unsubscribes (email, reason, unsubscribed_at)
     VALUES (${data.to[0]}, 'spam_complaint', NOW())
   `;
   ```

4. **Track Engagement**
   ```typescript
   await sql`
     INSERT INTO email_opens (email_id, opened_at, ip_address)
     VALUES (${data.email_id}, NOW(), ${data.ip_address})
   `;
   ```

---

## Troubleshooting

### Webhook Not Receiving Events

**Check 1: Verify Endpoint URL**
- Ensure URL is: `https://yourdomain.com/api/webhooks/resend`
- Must be HTTPS (not HTTP)
- Must be publicly accessible

**Check 2: Verify Signing Secret**
- Check `RESEND_WEBHOOK_SECRET` is set correctly
- Value should start with `whsec_`
- Copy from Resend Dashboard (don't type manually)

**Check 3: Check Vercel Logs**
- Go to: Dashboard → Deployments → Runtime Logs
- Look for webhook-related errors
- Check for signature verification failures

### Signature Verification Failing

**Error**: `Invalid signature`

**Solutions**:
1. Verify signing secret matches Resend Dashboard
2. Check environment variable is set in Vercel
3. Ensure webhook endpoint is using POST method
4. Verify you're using the raw body (not parsed JSON)

### Timestamp Validation Failing

**Error**: `Webhook timestamp expired`

**Cause**: Webhook is older than 5 minutes (replay attack protection)

**Solutions**:
1. Check server time is correct
2. Ensure webhook is being processed promptly
3. If testing, use Resend's "Send Test Event" (fresh timestamp)

---

## Testing in Development

### Using Resend's Test Feature

1. Go to Resend Dashboard → Webhooks
2. Select your webhook
3. Click "Send Test Event"
4. Choose event type
5. Click "Send Test"

### Using ngrok for Local Testing

1. **Start ngrok**
   ```bash
   ngrok http 3000
   ```

2. **Update Resend Webhook URL**
   - Copy ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Update in Resend Dashboard: `https://abc123.ngrok.io/api/webhooks/resend`

3. **Test**
   - Send test event from Resend
   - Check your local console for logs

---

## Environment Variables Summary

Add these to Vercel (and .env.local):

```bash
# Resend API (for sending emails)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@dekop.com.ua
RESEND_FROM_NAME=Dekop Furniture Store

# Resend Webhook (for receiving events)
RESEND_WEBHOOK_SECRET=whsec_your_signing_secret_here
```

---

## References

- [Resend Webhooks Documentation](https://resend.com/docs/dashboard/webhooks/introduction)
- [Resend Webhook Signature Verification](https://resend.com/docs/dashboard/webhooks/verify-signature)
- [Svix Webhook Standard](https://docs.svix.com/receiving/verifying-payloads/how)

---

## Support

If webhooks aren't working:

1. ✅ Verify signing secret is correct
2. ✅ Check Vercel deployment logs
3. ✅ Test with Resend's "Send Test Event"
4. ✅ Ensure endpoint URL is publicly accessible
5. 📧 Contact Resend support if issue persists

**Webhook endpoint**: `/api/webhooks/resend`
**Signature verification**: ✅ Implemented
**Replay protection**: ✅ Implemented
**Event handling**: ✅ Ready for customization
