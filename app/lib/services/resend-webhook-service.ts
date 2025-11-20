import crypto from 'crypto';

/**
 * Resend Webhook Verification
 *
 * Resend signs webhook requests using HMAC-SHA256
 * Documentation: https://resend.com/docs/dashboard/webhooks/verify-signature
 */

/**
 * Verifies Resend webhook signature
 *
 * @param payload - Raw request body as string
 * @param signature - Signature from svix-signature header
 * @param secret - Resend webhook signing secret
 * @returns true if signature is valid, false otherwise
 */
export function verifyResendWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Resend uses Svix for webhook signatures
    // The signature header format: "v1,signature timestamp,signature"
    // Example: "v1,1234567890,abc123def456..."

    if (!signature || !secret) {
      console.error('Missing signature or secret for Resend webhook verification');
      return false;
    }

    // Parse the signature header
    const signatureParts = signature.split(',');
    if (signatureParts.length < 3) {
      console.error('Invalid signature format');
      return false;
    }

    // Extract version, timestamp, and signatures
    const version = signatureParts[0];
    const timestamp = signatureParts[1];
    const signatures = signatureParts.slice(2);

    if (version !== 'v1') {
      console.error('Unsupported signature version:', version);
      return false;
    }

    // Construct the signed payload
    const signedPayload = `${timestamp}.${payload}`;

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('base64');

    // Check if any of the provided signatures match
    return signatures.some(sig => {
      try {
        return crypto.timingSafeEqual(
          Buffer.from(sig),
          Buffer.from(expectedSignature)
        );
      } catch {
        return false;
      }
    });
  } catch (error) {
    console.error('Error verifying Resend webhook signature:', error);
    return false;
  }
}

/**
 * Validates webhook timestamp to prevent replay attacks
 *
 * @param signature - Signature from svix-signature header
 * @param toleranceInSeconds - Maximum age of webhook in seconds (default: 5 minutes)
 * @returns true if timestamp is within tolerance, false otherwise
 */
export function validateWebhookTimestamp(
  signature: string,
  toleranceInSeconds: number = 300
): boolean {
  try {
    const signatureParts = signature.split(',');
    if (signatureParts.length < 2) {
      return false;
    }

    const timestamp = parseInt(signatureParts[1], 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const age = currentTimestamp - timestamp;

    return age >= 0 && age <= toleranceInSeconds;
  } catch {
    return false;
  }
}

/**
 * Resend webhook event types
 */
export type ResendWebhookEvent =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked';

/**
 * Resend webhook payload structure
 */
export interface ResendWebhookPayload {
  type: ResendWebhookEvent;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Additional fields based on event type
    bounce_type?: 'Hard' | 'Soft';
    bounce_reason?: string;
    complaint_type?: string;
    link?: string;
    ip_address?: string;
    user_agent?: string;
  };
}
