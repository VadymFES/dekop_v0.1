// app/api/webhooks/monobank/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { sql } from '@vercel/postgres';
import {
  verifyMonobankWebhook,
  mapMonobankStatus
} from '@/app/lib/services/monobank-service';

interface MonobankWebhookPayload {
  invoiceId: string;
  status: string;
  amount: number;
  ccy: number;
  createdDate: string;
  modifiedDate: string;
  reference: string; // Our order ID
  destination?: string;
  comment?: string;
}

/**
 * POST /api/webhooks/monobank
 * Handles Monobank webhook events for payment confirmations
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const xSign = headersList.get('x-sign');

    if (!xSign) {
      return NextResponse.json(
        { error: 'Missing x-sign header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const publicKey = process.env.MONOBANK_PUBLIC_KEY || '';
    const isValid = verifyMonobankWebhook(publicKey, xSign, body);

    if (!isValid) {
      console.error('Monobank webhook signature verification failed');
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Parse payload
    const payload: MonobankWebhookPayload = JSON.parse(body);

    // Get order ID from reference
    const orderId = payload.reference;

    if (!orderId) {
      console.error('No order reference in Monobank webhook payload');
      return NextResponse.json(
        { error: 'Missing order reference' },
        { status: 400 }
      );
    }

    // Map Monobank status to our internal status
    const paymentStatus = mapMonobankStatus(payload.status);

    // Update order based on payment status
    if (paymentStatus === 'paid') {
      await handleMonobankPaymentSuccess(orderId, payload);
    } else if (paymentStatus === 'failed') {
      await handleMonobankPaymentFailure(orderId, payload);
    } else if (paymentStatus === 'refunded') {
      await handleMonobankRefund(orderId, payload);
    } else {
      // pending or other status
      await handleMonobankPaymentPending(orderId, payload);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Monobank webhook error:', error);
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
 * Handles successful Monobank payment
 */
async function handleMonobankPaymentSuccess(
  orderId: string,
  payload: MonobankWebhookPayload
) {
  try {
    await sql`
      UPDATE orders
      SET
        payment_status = 'paid',
        payment_intent_id = ${payload.invoiceId},
        order_status = 'confirmed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
    `;

    console.log(`Monobank payment successful for order ${orderId}`);

    // Fetch complete order with items to send email
    try {
      console.log(`📧 Fetching order ${orderId} to send confirmation email...`);

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
        const orderRow = orderResult.rows[0];
        const order = {
          ...orderRow,
          items: orderRow.items || []
        } as any;

        console.log(`📦 Order found: ${order.order_number}, sending email to ${order.user_email}`);

        // Send confirmation email
        const { sendOrderConfirmationEmail } = await import('@/app/lib/services/email-service');
        await sendOrderConfirmationEmail({
          order,
          to: order.user_email,
          customerName: `${order.user_surname} ${order.user_name}`
        });

        console.log(`✅ Confirmation email sent successfully for order ${orderId}`);
      } else {
        console.error(`❌ Order ${orderId} not found - cannot send confirmation email`);
      }
    } catch (emailError) {
      console.error(`❌ FAILED to send confirmation email for order ${orderId}`);
      console.error('Email error details:', emailError);

      if (emailError instanceof Error) {
        console.error('Email error message:', emailError.message);
        console.error('Email error stack:', emailError.stack);
      }

      // Don't throw - email failure shouldn't fail the webhook
      // But make sure the error is clearly visible in logs
    }

  } catch (error) {
    console.error('Error handling Monobank payment success:', error);
    throw error;
  }
}

/**
 * Handles failed Monobank payment
 */
async function handleMonobankPaymentFailure(
  orderId: string,
  payload: MonobankWebhookPayload
) {
  try {
    await sql`
      UPDATE orders
      SET
        payment_status = 'failed',
        payment_intent_id = ${payload.invoiceId},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
    `;

    console.log(`Monobank payment failed for order ${orderId}`);

  } catch (error) {
    console.error('Error handling Monobank payment failure:', error);
    throw error;
  }
}

/**
 * Handles Monobank refund
 */
async function handleMonobankRefund(
  orderId: string,
  payload: MonobankWebhookPayload
) {
  try {
    await sql`
      UPDATE orders
      SET
        payment_status = 'refunded',
        payment_intent_id = ${payload.invoiceId},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
    `;

    console.log(`Monobank refund processed for order ${orderId}`);

  } catch (error) {
    console.error('Error handling Monobank refund:', error);
    throw error;
  }
}

/**
 * Handles pending Monobank payment
 */
async function handleMonobankPaymentPending(
  orderId: string,
  payload: MonobankWebhookPayload
) {
  try {
    await sql`
      UPDATE orders
      SET
        payment_status = 'pending',
        payment_intent_id = ${payload.invoiceId},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
    `;

    console.log(`Monobank payment pending for order ${orderId}`);

  } catch (error) {
    console.error('Error handling Monobank payment pending:', error);
    throw error;
  }
}
