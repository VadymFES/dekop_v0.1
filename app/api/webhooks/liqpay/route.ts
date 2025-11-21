// app/api/webhooks/liqpay/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import {
  verifyLiqPayCallback,
  parseLiqPayCallback,
  mapLiqPayStatus
} from '@/app/lib/services/liqpay-service';
import {
  isWebhookUnique,
  validateWebhookIp,
  validateWebhookTimestamp
} from '@/app/lib/webhook-security';

/**
 * POST /api/webhooks/liqpay
 * Handles LiqPay webhook callbacks for payment confirmations
 *
 * SECURITY LAYERS:
 * 1. IP whitelist validation
 * 2. Signature verification
 * 3. Replay attack prevention
 * 4. Timestamp validation
 */
export async function POST(request: Request) {
  try {
    // SECURITY LAYER 1: IP Whitelist Validation
    const ipValidation = validateWebhookIp(request, 'liqpay');
    if (!ipValidation.valid) {
      console.error('LiqPay webhook IP validation failed:', ipValidation.reason);
      return NextResponse.json(
        { error: 'Unauthorized IP address' },
        {
          status: 403,
          headers: {
            'X-Robots-Tag': 'noindex',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        }
      );
    }

    const formData = await request.formData();
    const data = formData.get('data') as string;
    const signature = formData.get('signature') as string;

    if (!data || !signature) {
      return NextResponse.json(
        { error: 'Missing data or signature' },
        {
          status: 400,
          headers: {
            'X-Robots-Tag': 'noindex',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        }
      );
    }

    // SECURITY LAYER 2: Verify callback signature
    const isValid = verifyLiqPayCallback(data, signature);

    if (!isValid) {
      console.error('LiqPay webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        {
          status: 400,
          headers: {
            'X-Robots-Tag': 'noindex',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        }
      );
    }

    // Parse callback data
    const callbackData = parseLiqPayCallback(data);

    console.log('LiqPay callback data:', callbackData);

    const {
      order_id: orderId,
      status: liqpayStatus,
      transaction_id: transactionId,
      payment_id: paymentId,
      create_date: createDate
    } = callbackData;

    if (!orderId) {
      console.error('No order_id in LiqPay callback data');
      return NextResponse.json(
        { error: 'Missing order_id' },
        {
          status: 400,
          headers: {
            'X-Robots-Tag': 'noindex',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        }
      );
    }

    // SECURITY LAYER 3: Replay Attack Prevention
    const webhookId = `liqpay_${transactionId || paymentId}`;
    const isUnique = await isWebhookUnique(webhookId, 'liqpay', 3600, callbackData);
    if (!isUnique) {
      console.error(`Replay attack detected for LiqPay webhook: ${webhookId}`);
      return NextResponse.json(
        { error: 'Duplicate webhook - already processed' },
        {
          status: 409,
          headers: {
            'X-Robots-Tag': 'noindex',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        }
      );
    }

    // SECURITY LAYER 4: Timestamp Validation
    if (createDate) {
      const timestamp = new Date(createDate).getTime();
      if (!validateWebhookTimestamp(timestamp, 600)) { // 10 minutes tolerance
        console.error('LiqPay webhook timestamp validation failed');
        return NextResponse.json(
          { error: 'Webhook timestamp too old or invalid' },
          {
            status: 400,
            headers: {
              'X-Robots-Tag': 'noindex',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            }
          }
        );
      }
    }

    // Map LiqPay status to our internal status
    const paymentStatus = mapLiqPayStatus(liqpayStatus);

    // Update order based on payment status
    if (paymentStatus === 'paid') {
      await handleLiqPayPaymentSuccess(orderId, transactionId || paymentId);
    } else if (paymentStatus === 'failed') {
      await handleLiqPayPaymentFailure(orderId, transactionId || paymentId);
    } else if (paymentStatus === 'refunded') {
      await handleLiqPayRefund(orderId, transactionId || paymentId);
    } else {
      // pending or other status
      await handleLiqPayPaymentPending(orderId, transactionId || paymentId);
    }

    // Return success response with appropriate headers
    return NextResponse.json(
      { status: 'ok' },
      {
        headers: {
          'X-Robots-Tag': 'noindex',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    );

  } catch (error) {
    console.error('LiqPay webhook error:', error);
    return NextResponse.json(
      {
        error: 'Webhook handler failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: {
          'X-Robots-Tag': 'noindex',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    );
  }
}

/**
 * Handles successful LiqPay payment
 */
async function handleLiqPayPaymentSuccess(orderId: string, transactionId: string) {
  try {
    // Update order payment status
    await sql`
      UPDATE orders
      SET
        payment_status = 'paid',
        payment_intent_id = ${transactionId},
        order_status = 'confirmed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
    `;

    console.log(`LiqPay payment successful for order ${orderId}`);

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
    console.error('Error handling LiqPay payment success:', error);
    throw error;
  }
}

/**
 * Handles failed LiqPay payment
 */
async function handleLiqPayPaymentFailure(orderId: string, transactionId: string) {
  try {
    await sql`
      UPDATE orders
      SET
        payment_status = 'failed',
        payment_intent_id = ${transactionId},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
    `;

    console.log(`LiqPay payment failed for order ${orderId}`);

  } catch (error) {
    console.error('Error handling LiqPay payment failure:', error);
    throw error;
  }
}

/**
 * Handles LiqPay refund
 */
async function handleLiqPayRefund(orderId: string, transactionId: string) {
  try {
    await sql`
      UPDATE orders
      SET
        payment_status = 'refunded',
        payment_intent_id = ${transactionId},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
    `;

    console.log(`LiqPay refund processed for order ${orderId}`);

  } catch (error) {
    console.error('Error handling LiqPay refund:', error);
    throw error;
  }
}

/**
 * Handles pending LiqPay payment
 */
async function handleLiqPayPaymentPending(orderId: string, transactionId: string) {
  try {
    await sql`
      UPDATE orders
      SET
        payment_status = 'pending',
        payment_intent_id = ${transactionId},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
    `;

    console.log(`LiqPay payment pending for order ${orderId}`);

  } catch (error) {
    console.error('Error handling LiqPay payment pending:', error);
    throw error;
  }
}
