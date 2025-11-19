# Email Flow After Payment - Technical Documentation

## Overview

The email confirmation system is triggered automatically after successful payment processing through either LiqPay or Monobank payment gateways. This document outlines the complete email flow, configuration requirements, and testing procedures.

## Configuration Requirements

### Required Environment Variables

```bash
# Mailchimp Transactional (Mandrill) API Configuration
MAILCHIMP_TRANSACTIONAL_API_KEY=your_mailchimp_api_key_here

# Optional - Defaults provided if not set
MAILCHIMP_FROM_EMAIL=orders@dekop.com       # Default: orders@dekop.com
MAILCHIMP_FROM_NAME=Dekop                   # Default: Dekop
```

### Verify Configuration

```bash
# Check if email service is configured
curl https://your-domain.com/api/test/email

# Expected response if configured:
{
  "status": "Email configuration check",
  "config": {
    "mailchimpKeyConfigured": true,
    "fromEmail": "orders@dekop.com",
    "fromName": "Dekop"
  },
  "message": "✅ Mailchimp API key is configured - email service should work"
}
```

## Payment Webhook Flow

### 1. LiqPay Payment Success Flow

**File:** `app/api/webhooks/liqpay/route.ts`

```
┌─────────────────┐
│   LiqPay API    │
│  (Payment OK)   │
└────────┬────────┘
         │
         │ POST /api/webhooks/liqpay
         │ { data, signature }
         │
         ▼
┌─────────────────────────────────┐
│  Verify Signature               │
│  Parse payment data             │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  handleLiqPayPaymentSuccess()   │
│                                 │
│  1. Update order status:        │
│     - payment_status = 'paid'   │
│     - order_status = 'confirmed'│
│                                 │
│  2. Fetch order with items      │
│     (JOIN with order_items)     │
│                                 │
│  3. Send confirmation email     │
│     sendOrderConfirmationEmail()│
│                                 │
│  4. Log success                 │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Email Service                  │
│  (Mailchimp Transactional)      │
│                                 │
│  → Customer receives email      │
└─────────────────────────────────┘
```

**Code Reference:** `app/api/webhooks/liqpay/route.ts:90-158`

```typescript
async function handleLiqPayPaymentSuccess(
  orderId: string,
  transactionId: string
) {
  // 1. Update order status
  await sql`
    UPDATE orders
    SET
      payment_status = 'paid',
      order_status = 'confirmed',
      updated_at = NOW()
    WHERE id = ${orderId}
  `;

  // 2. Fetch complete order with items
  const orderResult = await sql`
    SELECT o.*, json_agg(...) as items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.id = ${orderId}
    GROUP BY o.id
  `;

  // 3. Send confirmation email
  const { sendOrderConfirmationEmail } = await import(
    '@/app/lib/services/email-service'
  );

  await sendOrderConfirmationEmail({
    order: orderWithItems,
    to: orderWithItems.user_email,
    customerName: `${orderWithItems.user_surname} ${orderWithItems.user_name}`,
  });

  console.log(`✅ Confirmation email sent for order ${orderId}`);
}
```

### 2. Monobank Payment Success Flow

**File:** `app/api/webhooks/monobank/route.ts`

The Monobank webhook follows the exact same pattern as LiqPay:

```
┌─────────────────┐
│  Monobank API   │
│  (Payment OK)   │
└────────┬────────┘
         │
         │ POST /api/webhooks/monobank
         │ { reference, status, ... }
         │
         ▼
┌──────────────────────────────────┐
│  Verify webhook signature        │
│  Parse payment data              │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  handleMonobankPaymentSuccess()  │
│                                  │
│  Same flow as LiqPay:            │
│  1. Update order status          │
│  2. Fetch order with items       │
│  3. Send confirmation email      │
│  4. Log success                  │
└──────────────────────────────────┘
```

**Code Reference:** `app/api/webhooks/monobank/route.ts:97-167`

## Email Service Implementation

### Email Service Function

**File:** `app/lib/services/email-service.ts`

```typescript
export async function sendOrderConfirmationEmail(
  params: SendOrderConfirmationParams
): Promise<EmailResult> {
  const { order, to, customerName } = params;

  // Check configuration
  if (!process.env.MAILCHIMP_TRANSACTIONAL_API_KEY) {
    console.warn('⚠️ Email service not configured');
    return {
      success: false,
      error: 'Email service not configured'
    };
  }

  // Prepare email message
  const message = {
    from_email: process.env.MAILCHIMP_FROM_EMAIL || 'orders@dekop.com',
    from_name: process.env.MAILCHIMP_FROM_NAME || 'Dekop',
    to: [{ email: to, name: customerName }],
    subject: `Підтвердження замовлення ${order.order_number} - Dekop`,
    html: buildOrderConfirmationHTML(order),
  };

  // Send via Mailchimp Transactional API
  try {
    const response = await mailchimpClient.messages.send({ message });
    return {
      success: true,
      messageId: response[0]?.id
    };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Email Template Content

The email includes:

1. **Order Header** (Ukrainian)
   - "Дякуємо за ваше замовлення!" (Thank you for your order!)
   - Order number and date

2. **Customer Information**
   - Name and surname
   - Phone number
   - Email address

3. **Delivery Information**
   - Delivery method
   - City and address

4. **Order Items Table**
   - Product name
   - Quantity
   - Price per unit
   - Subtotal

5. **Payment Information**
   - Payment method
   - Total amount
   - Payment status

6. **Footer**
   - Contact information
   - Support email

## Manual Email Trigger

For testing or resending emails, use the manual trigger endpoint:

**File:** `app/api/orders/send-confirmation/route.ts`

```bash
# Resend confirmation email for specific order
POST /api/orders/send-confirmation
Content-Type: application/json

{
  "orderId": "order_id_here"
}
```

## Error Handling

### Email Service Failures

Email failures are **gracefully handled** and do not fail the payment webhook:

```typescript
try {
  await sendOrderConfirmationEmail(...);
  console.log('✅ Email sent');
} catch (error) {
  // Email failure is logged but doesn't throw
  console.error('⚠️ Email failed:', error);
  // Webhook still returns success to payment provider
}
```

**Rationale:** Payment has already been processed. Email failure should not cause payment provider to retry the webhook.

### Fallback Strategy

If email sending fails:
1. ✅ Payment is still marked as successful
2. ✅ Order status is still updated to 'confirmed'
3. ⚠️ Error is logged to console
4. 📧 Admin can manually resend via `/api/orders/send-confirmation`

## Testing Procedures

### 1. Check Configuration

```bash
# Verify email service is configured
curl https://your-domain.com/api/test/email
```

### 2. Send Test Email

```bash
# Send test email to your address
curl -X POST "https://your-domain.com/api/test/email?test_email=your@email.com"

# Expected response:
{
  "success": true,
  "message": "Test email sent successfully to your@email.com",
  "messageId": "abc123..."
}
```

### 3. Test Payment Flow (Staging)

**LiqPay Test:**
```bash
# Use LiqPay sandbox mode
# Create test order → Make payment → Check webhook logs

# Expected console output:
✅ LiqPay payment success for order: {orderId}
✅ Confirmation email sent for order {orderId}
```

**Monobank Test:**
```bash
# Use Monobank test environment
# Create test order → Make payment → Check webhook logs

# Expected console output:
✅ Monobank payment success for order: {orderId}
✅ Confirmation email sent for order {orderId}
```

### 4. Monitor Logs

```typescript
// Look for these log messages in production:

// Success:
"✅ Confirmation email sent for order {orderId}"

// Configuration issue:
"⚠️ Email service not configured"

// Sending failure:
"❌ Email sending failed: {error}"
```

## Troubleshooting

### Email Not Received

**Check 1: Configuration**
```bash
curl https://your-domain.com/api/test/email
# Ensure "mailchimpKeyConfigured": true
```

**Check 2: Test Email Service**
```bash
curl -X POST "https://your-domain.com/api/test/email?test_email=your@email.com"
# Check if test email arrives
```

**Check 3: Webhook Registration**
- Verify webhook URLs are registered with payment providers
- Check webhook logs in LiqPay/Monobank dashboards

**Check 4: Order Email Address**
```sql
-- Verify order has valid email
SELECT id, order_number, user_email, payment_status, order_status
FROM orders
WHERE id = 'your_order_id';
```

**Check 5: Spam Folder**
- Check customer's spam/junk folder
- Whitelist sender: orders@dekop.com

### Email Service Returns Error

**Common Issues:**

1. **Invalid API Key**
   ```
   Error: "Invalid API key"
   Fix: Verify MAILCHIMP_TRANSACTIONAL_API_KEY is correct
   ```

2. **Rate Limiting**
   ```
   Error: "Too many requests"
   Fix: Mailchimp has rate limits, space out test emails
   ```

3. **Invalid Email Address**
   ```
   Error: "Invalid recipient email"
   Fix: Ensure user_email in orders table is valid
   ```

## Monitoring and Analytics

### Email Delivery Metrics

Monitor in Mailchimp Transactional dashboard:
- Sent emails count
- Delivery rate
- Open rate
- Bounce rate
- Spam reports

### Database Query for Email Audit

```sql
-- Orders with confirmed payment (should have email sent)
SELECT
  id,
  order_number,
  user_email,
  payment_status,
  order_status,
  created_at,
  updated_at
FROM orders
WHERE payment_status = 'paid'
  AND order_status = 'confirmed'
ORDER BY created_at DESC
LIMIT 100;
```

## Summary

**Email Flow Status: ✅ Properly Implemented**

The email confirmation system is correctly integrated into both payment webhooks:
- ✅ LiqPay webhook sends email after successful payment
- ✅ Monobank webhook sends email after successful payment
- ✅ Email service uses Mailchimp Transactional
- ✅ Error handling is appropriate
- ✅ Manual resend option available
- ✅ Ukrainian language support

**To verify in production:**
1. Check configuration: `GET /api/test/email`
2. Send test email: `POST /api/test/email?test_email=your@email.com`
3. Monitor webhook logs during real payment
4. Check Mailchimp Transactional dashboard for delivery stats

**Next Steps:**
1. Ensure `MAILCHIMP_TRANSACTIONAL_API_KEY` is set in production environment
2. Test email delivery with staging payment
3. Monitor production logs for email sending confirmation
4. Set up alerts for email failures
