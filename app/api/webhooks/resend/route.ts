// app/api/webhooks/resend/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  verifyResendWebhook,
  validateWebhookTimestamp,
  type ResendWebhookPayload,
  type ResendWebhookEvent
} from '@/app/lib/services/resend-webhook-service';
import { logger } from '@/app/lib/logger';

/**
 * POST /api/webhooks/resend
 * Handles Resend webhook events for email tracking
 *
 * Events:
 * - email.sent: Email accepted by Resend
 * - email.delivered: Email successfully delivered
 * - email.delivery_delayed: Delivery delayed
 * - email.complained: Recipient marked as spam
 * - email.bounced: Email bounced
 * - email.opened: Email opened (requires tracking enabled)
 * - email.clicked: Link clicked (requires tracking enabled)
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('svix-signature');
    const svixId = headersList.get('svix-id');
    const svixTimestamp = headersList.get('svix-timestamp');

    // Log webhook receipt
    logger.info('Resend webhook received', {
      webhookId: svixId,
      timestamp: svixTimestamp,
      bodyLength: body.length
    });

    if (!signature) {
      logger.security(
        {
          type: 'webhook_invalid',
          severity: 'medium',
          details: 'Missing svix-signature header',
          metadata: { webhookId: svixId }
        },
        { path: '/api/webhooks/resend' }
      );
      return NextResponse.json(
        { error: 'Missing signature header' },
        {
          status: 400,
          headers: {
            'X-Robots-Tag': 'noindex',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        }
      );
    }

    // Get webhook signing secret
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('RESEND_WEBHOOK_SECRET not configured', undefined, {
        path: '/api/webhooks/resend',
        webhookId: svixId
      });
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        {
          status: 500,
          headers: {
            'X-Robots-Tag': 'noindex',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        }
      );
    }

    // Verify webhook signature
    const isValid = verifyResendWebhook(body, signature, webhookSecret);
    if (!isValid) {
      logger.security(
        {
          type: 'webhook_invalid',
          severity: 'high',
          details: 'Resend webhook signature verification failed',
          metadata: { webhookId: svixId, timestamp: svixTimestamp }
        },
        { path: '/api/webhooks/resend' }
      );
      return NextResponse.json(
        { error: 'Invalid signature' },
        {
          status: 401,
          headers: {
            'X-Robots-Tag': 'noindex',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        }
      );
    }

    // Validate timestamp to prevent replay attacks
    if (!validateWebhookTimestamp(signature)) {
      logger.security(
        {
          type: 'replay_attack',
          severity: 'high',
          details: 'Resend webhook timestamp validation failed (possible replay attack)',
          metadata: { webhookId: svixId, timestamp: svixTimestamp }
        },
        { path: '/api/webhooks/resend' }
      );
      return NextResponse.json(
        { error: 'Webhook timestamp expired' },
        {
          status: 401,
          headers: {
            'X-Robots-Tag': 'noindex',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        }
      );
    }

    // Parse webhook payload
    const payload: ResendWebhookPayload = JSON.parse(body);

    logger.info('Resend webhook verified', {
      webhookId: svixId,
      eventType: payload.type,
      emailId: payload.data.email_id,
      to: payload.data.to
    });

    // Handle different event types
    await handleResendEvent(payload);

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
    logger.error(
      'Resend webhook error',
      error instanceof Error ? error : new Error(String(error)),
      { path: '/api/webhooks/resend' }
    );
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
 * Handles Resend webhook events
 */
async function handleResendEvent(payload: ResendWebhookPayload) {
  const { type, data } = payload;

  switch (type) {
    case 'email.sent':
      logger.info('Email sent', {
        emailId: data.email_id,
        to: data.to,
        eventType: 'email.sent'
      });
      // Track email sent event
      break;

    case 'email.delivered':
      logger.info('Email delivered', {
        emailId: data.email_id,
        to: data.to,
        eventType: 'email.delivered'
      });
      // Track successful delivery
      break;

    case 'email.delivery_delayed':
      logger.warn('Email delivery delayed', {
        emailId: data.email_id,
        eventType: 'email.delivery_delayed'
      });
      // Track delayed delivery
      break;

    case 'email.bounced':
      logger.error('Email bounced', undefined, {
        emailId: data.email_id,
        bounceType: data.bounce_type,
        bounceReason: data.bounce_reason,
        eventType: 'email.bounced'
      });
      // Handle bounce (hard bounces should remove from mailing list)
      if (data.bounce_type === 'Hard') {
        // TODO: Mark email as invalid in database
        // TODO: Consider removing from future mailings
      }
      break;

    case 'email.complained':
      logger.error('Spam complaint', undefined, {
        emailId: data.email_id,
        complaintType: data.complaint_type,
        eventType: 'email.complained'
      });
      // Handle spam complaint
      // TODO: Unsubscribe user immediately
      // TODO: Mark in database to prevent future emails
      break;

    case 'email.opened':
      logger.info('Email opened', {
        emailId: data.email_id,
        ipAddress: data.ip_address,
        eventType: 'email.opened'
      });
      // Track email open
      break;

    case 'email.clicked':
      logger.info('Link clicked', {
        emailId: data.email_id,
        link: data.link,
        ipAddress: data.ip_address,
        userAgent: data.user_agent,
        eventType: 'email.clicked'
      });
      // Track link click
      break;

    default:
      logger.warn('Unknown event type', {
        eventType: type
      });
  }
}
