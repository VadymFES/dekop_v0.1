# Order Confirmation Flow - Setup Guide

Complete implementation of order confirmation flow for Dekop furniture e-commerce application targeting the Ukrainian market.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Payment Integration](#payment-integration)
5. [Email Configuration](#email-configuration)
6. [API Endpoints](#api-endpoints)
7. [UI Components](#ui-components)
8. [Usage Examples](#usage-examples)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This implementation provides a complete order confirmation system with:

- ✅ Order creation from cart data
- ✅ Stripe payment integration (international cards)
- ✅ Monobank payment integration (Ukrainian market)
- ✅ Automated email confirmations (Mailchimp Transactional)
- ✅ Order confirmation modal (Ukrainian language)
- ✅ Order management API
- ✅ Webhook handlers for payment status updates

---

## 🗄️ Database Setup

### Step 1: Run Database Migration

The database migration file creates two new tables: `orders` and `order_items`.

**Option A: Using Vercel Dashboard**

1. Go to your Vercel project dashboard
2. Navigate to **Storage** → Your Postgres database
3. Click on **Query** tab
4. Copy the contents of `app/db/migrations/001_create_orders_tables.sql`
5. Paste into the query editor
6. Click **Run Query**

**Option B: Using psql command line**

```bash
# Get your database URL from Vercel dashboard or .env.local
psql "YOUR_POSTGRES_URL" < app/db/migrations/001_create_orders_tables.sql
```

**Option C: Using Vercel CLI**

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login and link project
vercel login
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migration (you'll need to extract POSTGRES_URL from .env.local)
psql $POSTGRES_URL < app/db/migrations/001_create_orders_tables.sql
```

### Step 2: Verify Tables

Run this query to verify tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('orders', 'order_items');
```

You should see both tables listed.

---

## ⚙️ Environment Configuration

### Step 1: Copy Environment Template

```bash
cp .env.example .env.local
```

### Step 2: Configure Required Variables

Edit `.env.local` and fill in the following:

#### Database (Auto-configured by Vercel)
```env
# These are automatically set by Vercel Postgres
POSTGRES_URL=
POSTGRES_PRISMA_URL=
```

#### Stripe Configuration
```env
# Get from https://dashboard.stripe.com/apikeys
STRIPE_PUBLIC_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**How to get Stripe keys:**
1. Go to https://dashboard.stripe.com/
2. Navigate to **Developers** → **API keys**
3. Copy the **Publishable key** (starts with `pk_test_`)
4. Copy the **Secret key** (starts with `sk_test_`)
5. For webhook secret:
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`
   - Copy the **Signing secret** (starts with `whsec_`)

#### Monobank Configuration
```env
# Get from https://api.monobank.ua/
MONOBANK_TOKEN=your_monobank_token_here
MONOBANK_WEBHOOK_URL=https://yourdomain.com/api/webhooks/monobank
```

**How to get Monobank token:**
1. Register at https://api.monobank.ua/
2. Complete merchant verification
3. Get your API token from the dashboard
4. Configure webhook URL in Monobank settings

#### Mailchimp Transactional (Mandrill)
```env
# Get from https://mandrillapp.com/settings
MAILCHIMP_TRANSACTIONAL_API_KEY=your_mandrill_api_key_here
MAILCHIMP_FROM_EMAIL=orders@dekop.com
MAILCHIMP_FROM_NAME=Dekop Furniture Store
```

**How to get Mailchimp Transactional (Mandrill) API key:**
1. Go to https://mailchimp.com/
2. Navigate to **Transactional** (formerly Mandrill)
3. Go to **Settings** → **SMTP & API Info**
4. Create a new API key
5. Copy the API key

#### Optional Configuration
```env
# Order settings
ORDER_PREPAYMENT_PERCENTAGE=0.20  # 20% prepayment
ORDER_PAYMENT_DEADLINE_HOURS=48    # 48 hours to pay
```

---

## 💳 Payment Integration

### Stripe Setup

#### Client-Side Integration Example

```tsx
'use client';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

function CheckoutForm({ orderId, clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-success`,
      },
    });

    if (error) {
      console.error(error);
    } else if (paymentIntent.status === 'succeeded') {
      // Show order confirmation modal
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe}>Оплатити</button>
    </form>
  );
}

export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm />
    </Elements>
  );
}
```

### Monobank Setup

```tsx
async function handleMonobankPayment(orderId: string) {
  const response = await fetch('/api/payments/monobank/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId })
  });

  const { pageUrl } = await response.json();

  // Redirect to Monobank payment page
  window.location.href = pageUrl;
}
```

---

## 📧 Email Configuration

### Testing Email Locally

1. Sign up for Mailchimp Transactional (free tier available)
2. Get your API key
3. Add to `.env.local`
4. Test email sending:

```tsx
import { sendOrderConfirmationEmail } from '@/app/lib/services/email-service';

// In your API route or webhook
await sendOrderConfirmationEmail({
  order: orderWithItems,
  to: 'customer@example.com',
  customerName: 'Іван Петренко'
});
```

### Email Template Features

The email template includes:
- Order number and status badge
- Customer information (name, phone, email)
- Delivery details and full address
- Payment information with prepayment amount
- Itemized product list with images
- Order totals (subtotal, discount, delivery, total)
- Ukrainian language throughout
- Mobile-responsive design

---

## 🔌 API Endpoints

### Create Order

**POST** `/api/orders/create`

Creates a new order from cart data.

**Request Body:**
```json
{
  "cart_id": "uuid-of-cart",
  "user_name": "Іван",
  "user_surname": "Петренко",
  "user_phone": "+380501234567",
  "user_email": "ivan@example.com",
  "delivery_method": "nova_poshta",
  "delivery_city": "Київ",
  "delivery_street": "Хрещатик",
  "delivery_building": "1",
  "delivery_apartment": "10",
  "delivery_postal_code": "01001",
  "payment_method": "stripe",
  "discount_percent": 10,
  "delivery_cost": 100,
  "customer_notes": "Дзвоніть за годину"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order-uuid",
    "order_number": "#1234567890",
    "total_amount": 16000,
    "prepayment_amount": 3200,
    "items": [...]
  },
  "message": "Замовлення успішно створено"
}
```

### Get Order

**GET** `/api/orders/[orderId]`

Fetches order details by ID.

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order-uuid",
    "order_number": "#1234567890",
    "user_name": "Іван",
    "items": [...],
    ...
  }
}
```

### Update Order

**PATCH** `/api/orders/[orderId]`

Updates order status.

**Request Body:**
```json
{
  "order_status": "shipped",
  "payment_status": "paid"
}
```

### Webhooks

**POST** `/api/webhooks/stripe` - Stripe payment webhooks

**POST** `/api/webhooks/monobank` - Monobank payment webhooks

---

## 🎨 UI Components

### Order Confirmation Modal

```tsx
import OrderConfirmationModal from '@/app/components/order/OrderConfirmationModal';

function MyCheckoutPage() {
  const [showModal, setShowModal] = useState(false);
  const [order, setOrder] = useState(null);

  const handleOrderComplete = (orderData) => {
    setOrder(orderData);
    setShowModal(true);
  };

  return (
    <>
      {/* Your checkout form */}

      <OrderConfirmationModal
        order={order}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onContinueShopping={() => router.push('/')}
      />
    </>
  );
}
```

### Order Summary Component

```tsx
import OrderSummary from '@/app/components/order/OrderSummary';

function OrderDetailsPage({ orderItems }) {
  return (
    <div>
      <h2>Товари</h2>
      <OrderSummary items={orderItems} />
    </div>
  );
}
```

---

## 💡 Usage Examples

### Complete Order Flow Example

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OrderConfirmationModal from '@/app/components/order/OrderConfirmationModal';

export default function CheckoutPage() {
  const router = useRouter();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [order, setOrder] = useState(null);

  const handleSubmitOrder = async (formData) => {
    try {
      // Step 1: Create order
      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const { order } = await orderResponse.json();

      // Step 2: Process payment
      if (formData.payment_method === 'stripe') {
        // Handle Stripe payment
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
        await stripe.confirmPayment({
          // ... Stripe config
        });
      } else if (formData.payment_method === 'monobank') {
        // Handle Monobank payment
        // Redirect to Monobank
      }

      // Step 3: On success, show confirmation modal
      setOrder(order);
      setShowConfirmation(true);

      // Step 4: Clear cart
      await fetch('/api/cart/clear', { method: 'POST' });

    } catch (error) {
      console.error('Order error:', error);
      alert('Помилка при створенні замовлення');
    }
  };

  return (
    <div>
      {/* Your checkout form */}

      <OrderConfirmationModal
        order={order}
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onContinueShopping={() => router.push('/')}
      />
    </div>
  );
}
```

---

## 🧪 Testing

### Test Order Creation

```bash
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "cart_id": "your-cart-uuid",
    "user_name": "Тест",
    "user_surname": "Тестович",
    "user_phone": "+380501234567",
    "user_email": "test@example.com",
    "delivery_method": "nova_poshta",
    "delivery_city": "Київ",
    "payment_method": "stripe"
  }'
```

### Test Stripe Webhooks Locally

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Trigger test payment: `stripe trigger payment_intent.succeeded`

### Test Email Sending

```tsx
// In a test API route
import { sendOrderConfirmationEmail } from '@/app/lib/services/email-service';

export async function GET() {
  const testOrder = {
    // ... create test order object
  };

  await sendOrderConfirmationEmail({
    order: testOrder,
    to: 'your-email@example.com',
    customerName: 'Test User'
  });

  return Response.json({ success: true });
}
```

---

## 🐛 Troubleshooting

### Database Migration Issues

**Problem:** Tables not created

**Solution:**
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- If not, manually run the migration SQL file
```

### Stripe Webhook Errors

**Problem:** `Webhook signature verification failed`

**Solution:**
1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Make sure webhook endpoint is publicly accessible
3. Check webhook is sending to correct URL

### Email Not Sending

**Problem:** Email not received

**Solution:**
1. Check Mailchimp Transactional API key is valid
2. Verify email address is correct
3. Check spam/junk folder
4. Review Mailchimp Transactional logs
5. Make sure `MAILCHIMP_FROM_EMAIL` is verified in Mailchimp

### Payment Not Processing

**Problem:** Payment fails

**Solution:**
1. Test with Stripe test cards: `4242 4242 4242 4242`
2. Check Stripe/Monobank API keys are correct
3. Verify webhook URLs are correct
4. Check order was created in database first

---

## 📝 Next Steps

To complete the implementation:

1. **Create Checkout Page**: Build a multi-step checkout form
2. **Add Cart Clear Functionality**: Clear cart after successful order
3. **Implement Order Tracking**: Add tracking functionality for "ВІДСЛІДКУВАТИ" button
4. **Admin Dashboard**: Create admin panel for order management
5. **User Account**: Add user profile with order history
6. **PDF Invoice**: Generate PDF invoices for email attachments

---

## 🤝 Support

For issues or questions:

- Check troubleshooting section above
- Review API error messages in browser console
- Check Vercel deployment logs
- Verify all environment variables are set

---

**Built with ❤️ for Dekop Furniture Store**
