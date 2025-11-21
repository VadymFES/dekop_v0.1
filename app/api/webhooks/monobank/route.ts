// app/api/webhooks/monobank/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { sql } from '@vercel/postgres';
import * as Sentry from '@sentry/nextjs';
import {
  verifyMonobankWebhook,
  mapMonobankStatus
} from '@/app/lib/services/monobank-service';
import {
  isWebhookUnique,
  validateWebhookIp,
  validateWebhookTimestamp
} from '@/app/lib/webhook-security';
import { logger } from '@/app/lib/logger';

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
      name: 'Process Monobank Webhook',
      attributes: {
        provider: 'monobank'
      }
    },
    async () => {
      try {
        // Track webhook received
        Sentry.metrics.increment('webhook.received', 1, { tags: { provider: 'monobank' } });

        // SECURITY LAYER 1: IP Whitelist Validation
        const ipValidation = validateWebhookIp(request, 'monobank');
        if (!ipValidation.valid) {
          Sentry.metrics.increment('webhook.ip_validation_failed', 1, { tags: { provider: 'monobank' } });
          logger.security({
            type: 'webhook_invalid',
            severity: 'high',
            details: 'Monobank webhook IP validation failed',
            metadata: { reason: ipValidation.reason, provider: 'monobank' }
          });
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

    const body = await request.text();
    const headersList = await headers();
    const xSign = headersList.get('x-sign');

    if (!xSign) {
      return NextResponse.json(
        { error: 'Missing x-sign header' },
        {
          status: 400,
          headers: {
            'X-Robots-Tag': 'noindex',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        }
      );
    }

    // SECURITY LAYER 2: Verify webhook signature
    const publicKey = process.env.MONOBANK_PUBLIC_KEY || '';
    const isValid = verifyMonobankWebhook(publicKey, xSign, body);

    if (!isValid) {
      Sentry.metrics.increment('webhook.signature_invalid', 1, { tags: { provider: 'monobank' } });
      logger.security({
        type: 'webhook_invalid',
        severity: 'critical',
        details: 'Monobank webhook signature verification failed',
        metadata: { provider: 'monobank' }
      });
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        {
          status: 400,
          headers: {
            'X-Robots-Tag': 'noindex',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        }
      );
    }

    // Parse payload
    const payload: MonobankWebhookPayload = JSON.parse(body);

    // Get order ID from reference
    const orderId = payload.reference;

    if (!orderId) {
      logger.error('No order reference in Monobank webhook payload', undefined, {
        provider: 'monobank'
      });
      return NextResponse.json(
        { error: 'Missing order reference' },
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
    const webhookId = `monobank_${payload.invoiceId}`;
    const isUnique = await isWebhookUnique(webhookId, 'monobank', 3600, payload);
    if (!isUnique) {
      Sentry.metrics.increment('webhook.replay_attack', 1, { tags: { provider: 'monobank' } });
      logger.security({
        type: 'replay_attack',
        severity: 'critical',
        details: `Replay attack detected for Monobank webhook: ${webhookId}`,
        metadata: { webhookId, provider: 'monobank', orderId }
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
    if (payload.modifiedDate) {
      const timestamp = new Date(payload.modifiedDate).getTime();
      if (!validateWebhookTimestamp(timestamp, 600)) { // 10 minutes tolerance
        logger.security({
          type: 'webhook_invalid',
          severity: 'high',
          details: 'Monobank webhook timestamp validation failed',
          metadata: { provider: 'monobank', modifiedDate: payload.modifiedDate, orderId }
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

    // Track successful webhook processing
    Sentry.metrics.increment('webhook.processed', 1, { tags: { provider: 'monobank', status: paymentStatus } });

    // Return success response with appropriate headers
    return NextResponse.json(
      { received: true },
      {
        headers: {
          'X-Robots-Tag': 'noindex',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    );

      } catch (error) {
        logger.error('Monobank webhook error', error instanceof Error ? error : new Error('Unknown error'), {
          provider: 'monobank'
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

    logger.paymentLog({
      event: 'success',
      provider: 'monobank',
      orderId,
      transactionId: payload.invoiceId
    });

    // Fetch complete order with items to send email
    try {
      logger.info('Fetching order to send confirmation email', { orderId, provider: 'monobank' });

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
          provider: 'monobank'
        });

        // Send confirmation email
        const { sendOrderConfirmationEmail } = await import('@/app/lib/services/email-service');
        await sendOrderConfirmationEmail({
          order,
          to: order.user_email,
          customerName: `${order.user_surname} ${order.user_name}`
        });

        logger.info('Confirmation email sent successfully', { orderId, provider: 'monobank' });
      } else {
        logger.error('Order not found - cannot send confirmation email', undefined, {
          orderId,
          provider: 'monobank'
        });
      }
    } catch (emailError) {
      logger.error('Failed to send confirmation email',
        emailError instanceof Error ? emailError : new Error('Unknown email error'),
        { orderId, provider: 'monobank' }
      );

      // Don't throw - email failure shouldn't fail the webhook
      // Error details are already logged to Sentry via logger
    }

  } catch (error) {
    logger.error('Error handling Monobank payment success',
      error instanceof Error ? error : new Error('Unknown error'),
      { orderId, transactionId: payload.invoiceId, provider: 'monobank' }
    );
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

    logger.paymentLog({
      event: 'failed',
      provider: 'monobank',
      orderId,
      transactionId: payload.invoiceId
    });

  } catch (error) {
    logger.error('Error handling Monobank payment failure',
      error instanceof Error ? error : new Error('Unknown error'),
      { orderId, transactionId: payload.invoiceId, provider: 'monobank' }
    );
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

    logger.paymentLog({
      event: 'refunded',
      provider: 'monobank',
      orderId,
      transactionId: payload.invoiceId
    });

  } catch (error) {
    logger.error('Error handling Monobank refund',
      error instanceof Error ? error : new Error('Unknown error'),
      { orderId, transactionId: payload.invoiceId, provider: 'monobank' }
    );
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

    logger.info('Monobank payment pending', {
      orderId,
      transactionId: payload.invoiceId,
      provider: 'monobank'
    });

  } catch (error) {
    logger.error('Error handling Monobank payment pending',
      error instanceof Error ? error : new Error('Unknown error'),
      { orderId, transactionId: payload.invoiceId, provider: 'monobank' }
    );
    throw error;
  }
}
