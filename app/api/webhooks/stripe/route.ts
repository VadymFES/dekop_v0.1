// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { sql } from '@vercel/postgres';
import { verifyWebhookSignature } from '@/app/lib/services/stripe-service';
import type Stripe from 'stripe';

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for payment confirmations
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(paymentIntent);
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentCanceled(paymentIntent);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      {
        error: 'Webhook handler failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handles successful payment
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    const orderId = paymentIntent.metadata.order_id;

    if (!orderId) {
      console.error('No order_id in payment intent metadata');
      return;
    }

    // Update order payment status
    await sql`
      UPDATE orders
      SET
        payment_status = 'paid',
        payment_intent_id = ${paymentIntent.id},
        order_status = 'confirmed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
    `;

    console.log(`Payment successful for order ${orderId}`);

    // Fetch complete order with items to send email
    try {
      const orderResult = await sql`
        SELECT
          o.*,
          json_agg(
            json_build_object(
              'id', oi.id,
              'order_id', oi.order_id,
              'product_id', oi.product_id,
              'product_name', oi.product_name,
              'product_slug', oi.product_slug,
              'product_article', oi.product_article,
              'quantity', oi.quantity,
              'color', oi.color,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price,
              'product_image_url', oi.product_image_url,
              'product_category', oi.product_category
            )
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.id = ${orderId}
        GROUP BY o.id
      `;

      if (orderResult.rows.length > 0) {
        const order = {
          ...orderResult.rows[0],
          items: orderResult.rows[0].items || []
        };

        // Send confirmation email
        const { sendOrderConfirmationEmail } = await import('@/app/lib/services/email-service');
        await sendOrderConfirmationEmail({
          order,
          to: order.user_email,
          customerName: `${order.user_surname} ${order.user_name}`
        });

        console.log(`Confirmation email sent for order ${orderId}`);
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't throw - email failure shouldn't fail the webhook
    }

  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

/**
 * Handles failed payment
 */
async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  try {
    const orderId = paymentIntent.metadata.order_id;

    if (!orderId) {
      console.error('No order_id in payment intent metadata');
      return;
    }

    await sql`
      UPDATE orders
      SET
        payment_status = 'failed',
        payment_intent_id = ${paymentIntent.id},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
    `;

    console.log(`Payment failed for order ${orderId}`);

  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}

/**
 * Handles canceled payment
 */
async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  try {
    const orderId = paymentIntent.metadata.order_id;

    if (!orderId) {
      console.error('No order_id in payment intent metadata');
      return;
    }

    await sql`
      UPDATE orders
      SET
        payment_status = 'failed',
        order_status = 'cancelled',
        payment_intent_id = ${paymentIntent.id},
        cancelled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
    `;

    console.log(`Payment canceled for order ${orderId}`);

  } catch (error) {
    console.error('Error handling payment cancellation:', error);
    throw error;
  }
}

/**
 * Handles refunds
 */
async function handleRefund(charge: Stripe.Charge) {
  try {
    const paymentIntentId = charge.payment_intent as string;

    if (!paymentIntentId) {
      console.error('No payment_intent in charge object');
      return;
    }

    // Find order by payment intent ID
    const result = await sql`
      SELECT id FROM orders
      WHERE payment_intent_id = ${paymentIntentId}
    `;

    if (result.rows.length === 0) {
      console.error(`No order found for payment intent ${paymentIntentId}`);
      return;
    }

    const orderId = result.rows[0].id;

    await sql`
      UPDATE orders
      SET
        payment_status = 'refunded',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
    `;

    console.log(`Refund processed for order ${orderId}`);

  } catch (error) {
    console.error('Error handling refund:', error);
    throw error;
  }
}
