import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  verifyResendWebhook,
  validateWebhookTimestamp,
  type ResendWebhookPayload,
  type ResendWebhookEvent
} from '@/app/lib/services/resend-webhook-service';

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

    if (!signature) {
      console.error('Missing svix-signature header');
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

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RESEND_WEBHOOK_SECRET not configured');
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

    const isValid = verifyResendWebhook(body, signature, webhookSecret);
    if (!isValid) {
      console.error('Resend webhook signature verification failed');
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

    if (!validateWebhookTimestamp(signature)) {
      console.error('Resend webhook timestamp validation failed (possible replay attack)');
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

    const payload: ResendWebhookPayload = JSON.parse(body);

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
    console.error('Resend webhook error:', error);
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
      break;

    case 'email.delivered':
      break;

    case 'email.delivery_delayed':
      console.warn(`⏱️ Email delivery delayed: ${data.email_id}`);
      break;

    case 'email.bounced':
      console.error(`❌ Email bounced: ${data.email_id}`, {
        bounceType: data.bounce_type,
        reason: data.bounce_reason
      });
      break;

    case 'email.complained':
      console.error(`🚨 Spam complaint: ${data.email_id}`, {
        complaintType: data.complaint_type
      });
      break;

    case 'email.opened':
      break;

    case 'email.clicked':
      break;

    default:
      console.warn(`Unknown event type: ${type}`);
  }
}
