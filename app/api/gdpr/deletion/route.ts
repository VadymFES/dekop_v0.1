/**
 * API Route: /api/gdpr/deletion
 * Manages data deletion requests in compliance with GDPR Article 17 (Right to Erasure)
 * and Ukrainian Law Article 21
 */

import { NextRequest, NextResponse } from 'next/server';
import { scheduleDeletionRequest, cancelDeletionRequest } from '@/app/lib/gdpr-compliance';

/**
 * POST /api/gdpr/deletion
 * Schedules a data deletion request (no email verification required)
 *
 * Body:
 * {
 *   email: string,
 *   scheduledDate?: string (ISO format),
 *   options?: {
 *     keepOrderHistory?: boolean,
 *     keepTransactionRecords?: boolean,
 *     anonymizeInsteadOfDelete?: boolean
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, scheduledDate, options } = body;

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Parse scheduled date if provided
    const deletionDate = scheduledDate ? new Date(scheduledDate) : undefined;

    // Validate date is in the future
    if (deletionDate && deletionDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled date must be in the future' },
        { status: 400 }
      );
    }

    // Schedule deletion request
    const result = await scheduleDeletionRequest(email, deletionDate, options);

    return NextResponse.json({
      success: true,
      message: 'Data deletion request scheduled successfully',
      requestId: result.requestId,
      scheduledFor: result.scheduledFor.toISOString(),
      gracePeriodDays: Math.ceil((result.scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    });
  } catch (error) {
    console.error('Error scheduling deletion request:', error);
    return NextResponse.json(
      { error: 'Failed to schedule deletion request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gdpr/deletion?email=user@example.com&requestId=uuid
 * Cancels a scheduled deletion request (during grace period)
 *
 * Query params:
 * - email: User's email address (required)
 * - requestId: Deletion request ID (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const requestId = searchParams.get('requestId');

    // Validation
    if (!email || !requestId) {
      return NextResponse.json(
        { error: 'Both email and requestId are required' },
        { status: 400 }
      );
    }

    // Cancel deletion request
    const success = await cancelDeletionRequest(email, requestId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to cancel deletion request. It may have already been processed or does not exist.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Data deletion request cancelled successfully',
      requestId,
    });
  } catch (error) {
    console.error('Error cancelling deletion request:', error);
    return NextResponse.json(
      { error: 'Failed to cancel deletion request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
