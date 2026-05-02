// app/api/webhooks/resend/route.ts
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

    // Log webhook receipt
    console.log('📧 Resend webhook received:', {
      id: svixId,
      timestamp: svixTimestamp,
      bodyLength: body.length
    });

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

    // Get webhook signing secret
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

    // Verify webhook signature
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

    // Validate timestamp to prevent replay attacks
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

    // Parse webhook payload
    const payload: ResendWebhookPayload = JSON.parse(body);

    console.log('✅ Resend webhook verified:', {
      type: payload.type,
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
      console.log(`📨 Email sent: ${data.email_id} to ${data.to.join(', ')}`);
      // Track email sent event
      break;

    case 'email.delivered':
      console.log(`✅ Email delivered: ${data.email_id} to ${data.to.join(', ')}`);
      // Track successful delivery
      break;

    case 'email.delivery_delayed':
      console.warn(`⏱️ Email delivery delayed: ${data.email_id}`);
      // Track delayed delivery
      break;

    case 'email.bounced':
      console.error(`❌ Email bounced: ${data.email_id}`, {
        bounceType: data.bounce_type,
        reason: data.bounce_reason
      });
      // Handle bounce (hard bounces should remove from mailing list)
      if (data.bounce_type === 'Hard') {
        // TODO: Mark email as invalid in database
        // TODO: Consider removing from future mailings
      }
      break;

    case 'email.complained':
      console.error(`🚨 Spam complaint: ${data.email_id}`, {
        complaintType: data.complaint_type
      });
      // Handle spam complaint
      // TODO: Unsubscribe user immediately
      // TODO: Mark in database to prevent future emails
      break;

    case 'email.opened':
      console.log(`👁️ Email opened: ${data.email_id}`, {
        ipAddress: data.ip_address
      });
      // Track email open
      break;

    case 'email.clicked':
      console.log(`🔗 Link clicked: ${data.email_id}`, {
        link: data.link,
        ipAddress: data.ip_address,
        userAgent: data.user_agent
      });
      // Track link click
      break;

    default:
      console.warn(`Unknown event type: ${type}`);
  }
}
