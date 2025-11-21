// app/api/webhooks/liqpay/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as Sentry from '@sentry/nextjs';
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
import { logger } from '@/app/lib/logger';

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
  return await Sentry.startSpan(
    {
      op: 'webhook.process',
      name: 'Process LiqPay Webhook',
      attributes: {
        provider: 'liqpay'
      }
    },
    async () => {
      try {
        // Track webhook received
        Sentry.metrics.increment('webhook.received', 1, { tags: { provider: 'liqpay' } });

        // SECURITY LAYER 1: IP Whitelist Validation
        const ipValidation = validateWebhookIp(request, 'liqpay');
        if (!ipValidation.valid) {
          Sentry.metrics.increment('webhook.ip_validation_failed', 1, { tags: { provider: 'liqpay' } });
          logger.security({
            type: 'webhook_invalid',
            severity: 'high',
            details: 'LiqPay webhook IP validation failed',
            metadata: { reason: ipValidation.reason, provider: 'liqpay' }
          }, { ip: ipValidation.clientIp });
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
      Sentry.metrics.increment('webhook.signature_invalid', 1, { tags: { provider: 'liqpay' } });
      logger.security({
        type: 'webhook_invalid',
        severity: 'critical',
        details: 'LiqPay webhook signature verification failed',
        metadata: { provider: 'liqpay' }
      });
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

    logger.info('LiqPay webhook received', {
      provider: 'liqpay',
      orderId: callbackData.order_id,
      status: callbackData.status
    });

    const {
      order_id: orderId,
      status: liqpayStatus,
      transaction_id: transactionId,
      payment_id: paymentId,
      create_date: createDate
    } = callbackData;

    if (!orderId) {
      logger.error('No order_id in LiqPay callback data', undefined, {
        provider: 'liqpay',
        callbackData
      });
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
      Sentry.metrics.increment('webhook.replay_attack', 1, { tags: { provider: 'liqpay' } });
      logger.security({
        type: 'replay_attack',
        severity: 'critical',
        details: `Replay attack detected for LiqPay webhook: ${webhookId}`,
        metadata: { webhookId, provider: 'liqpay', orderId }
      });
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
        logger.security({
          type: 'webhook_invalid',
          severity: 'high',
          details: 'LiqPay webhook timestamp validation failed',
          metadata: { provider: 'liqpay', createDate, orderId }
        });
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

    // Track successful webhook processing
    Sentry.metrics.increment('webhook.processed', 1, { tags: { provider: 'liqpay', status: paymentStatus } });

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
        logger.error('LiqPay webhook error', error instanceof Error ? error : new Error('Unknown error'), {
          provider: 'liqpay'
        });
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
  );
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

    logger.paymentLog({
      event: 'success',
      provider: 'liqpay',
      orderId,
      transactionId
    });

    // Fetch complete order with items to send email
    try {
      logger.info('Fetching order to send confirmation email', { orderId, provider: 'liqpay' });

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

        logger.info('Order found, sending confirmation email', {
          orderId,
          orderNumber: order.order_number,
          userEmail: order.user_email,
          provider: 'liqpay'
        });

        // Send confirmation email
        const { sendOrderConfirmationEmail } = await import('@/app/lib/services/email-service');
        await sendOrderConfirmationEmail({
          order,
          to: order.user_email,
          customerName: `${order.user_surname} ${order.user_name}`
        });

        logger.info('Confirmation email sent successfully', { orderId, provider: 'liqpay' });
      } else {
        logger.error('Order not found - cannot send confirmation email', undefined, {
          orderId,
          provider: 'liqpay'
        });
      }
    } catch (emailError) {
      logger.error('Failed to send confirmation email',
        emailError instanceof Error ? emailError : new Error('Unknown email error'),
        { orderId, provider: 'liqpay' }
      );

      // Don't throw - email failure shouldn't fail the webhook
      // Error details are already logged to Sentry via logger
    }

  } catch (error) {
    logger.error('Error handling LiqPay payment success',
      error instanceof Error ? error : new Error('Unknown error'),
      { orderId, transactionId, provider: 'liqpay' }
    );
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

    logger.paymentLog({
      event: 'failed',
      provider: 'liqpay',
      orderId,
      transactionId
    });

  } catch (error) {
    logger.error('Error handling LiqPay payment failure',
      error instanceof Error ? error : new Error('Unknown error'),
      { orderId, transactionId, provider: 'liqpay' }
    );
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

    logger.paymentLog({
      event: 'refunded',
      provider: 'liqpay',
      orderId,
      transactionId
    });

  } catch (error) {
    logger.error('Error handling LiqPay refund',
      error instanceof Error ? error : new Error('Unknown error'),
      { orderId, transactionId, provider: 'liqpay' }
    );
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

    logger.info('LiqPay payment pending', { orderId, transactionId, provider: 'liqpay' });

  } catch (error) {
    logger.error('Error handling LiqPay payment pending',
      error instanceof Error ? error : new Error('Unknown error'),
      { orderId, transactionId, provider: 'liqpay' }
    );
    throw error;
  }
}
