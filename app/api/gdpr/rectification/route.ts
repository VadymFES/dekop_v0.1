/**
 * API Route: /api/gdpr/rectification
 * Manages data rectification requests in compliance with GDPR Article 16 (Right to Rectification)
 * and Ukrainian Law Article 20 (Right to Correct Personal Data)
 *
 * Must respond within 30 calendar days according to Ukrainian Law
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateUserData, getCurrentUserData } from '@/app/lib/gdpr-compliance';

/**
 * GET /api/gdpr/rectification?email=user@example.com
 * Retrieves current user data for review before rectification
 *
 * Query params:
 * - email: User's email address (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Get current user data
    const userData = await getCurrentUserData(email);

    if (!userData) {
      return NextResponse.json(
        { error: 'No data found for this email address' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error('Error fetching user data for rectification:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/gdpr/rectification
 * Updates user personal data (Right to Rectification)
 *
 * Body:
 * {
 *   email: string,
 *   updates: {
 *     name?: string,
 *     surname?: string,
 *     phone?: string,
 *     delivery_address?: string,
 *     delivery_city?: string,
 *     delivery_street?: string,
 *     delivery_building?: string,
 *     delivery_apartment?: string,
 *     delivery_postal_code?: string
 *   }
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, updates } = body;

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      );
    }

    // Validate that at least one field is being updated
    const allowedFields = [
      'name',
      'surname',
      'phone',
      'email',
      'delivery_address',
      'delivery_city',
      'delivery_street',
      'delivery_building',
      'delivery_apartment',
      'delivery_postal_code',
    ];

    const providedFields = Object.keys(updates);
    const validFields = providedFields.filter((field) => allowedFields.includes(field));

    if (validFields.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid fields to update',
          allowedFields,
          providedFields,
        },
        { status: 400 }
      );
    }

    // Update user data
    const result = await updateUserData(email, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: 'No existing data found for this email address' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User data updated successfully',
      updatedFields: result.updatedFields,
      updatedCount: result.updatedFields.length,
    });
  } catch (error) {
    console.error('Error updating user data:', error);
    return NextResponse.json(
      { error: 'Failed to update user data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gdpr/rectification
 * Alternative method for data rectification (for form submissions)
 * Same functionality as PUT
 */
export async function POST(request: NextRequest) {
  return PUT(request);
}
