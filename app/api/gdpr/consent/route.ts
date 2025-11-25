/**
 * API Route: /api/gdpr/consent
 * Manages user cookie and data processing consents
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordConsent } from '@/app/lib/gdpr-compliance';

/**
 * POST /api/gdpr/consent
 * Records or updates user consents
 *
 * Body:
 * {
 *   email: string,
 *   consents: Array<{ type: string, granted: boolean }>,
 *   version: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, consents, version } = body;

    // Validation
    if (!email || !consents || !version) {
      return NextResponse.json(
        { error: 'Missing required fields: email, consents, version' },
        { status: 400 }
      );
    }

    if (!Array.isArray(consents)) {
      return NextResponse.json(
        { error: 'Consents must be an array' },
        { status: 400 }
      );
    }

    // Get IP address and user agent for audit trail
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Record each consent
    const consentPromises = consents.map((consent: { type: string; granted: boolean }) =>
      recordConsent(
        email,
        consent.type as any,
        consent.granted,
        version,
        { ipAddress, userAgent }
      )
    );

    await Promise.all(consentPromises);

    return NextResponse.json({
      success: true,
      message: 'Consents recorded successfully',
      recordedConsents: consents.length,
    });
  } catch (error) {
    console.error('Error recording consents:', error);
    return NextResponse.json(
      { error: 'Failed to record consents', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
