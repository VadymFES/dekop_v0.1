/**
 * API Route: /api/gdpr/export
 * Exports user data in compliance with GDPR Article 15 (Right to Access)
 * and Ukrainian Law Article 19
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportUserData } from '@/app/lib/gdpr-compliance';

/**
 * GET /api/gdpr/export?email=user@example.com&format=json
 * Exports all user data
 *
 * Query params:
 * - email: User's email address (required)
 * - format: 'json' or 'csv' (default: 'json')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const format = (searchParams.get('format') || 'json') as 'json' | 'csv';

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json(
        { error: 'Format must be either "json" or "csv"' },
        { status: 400 }
      );
    }

    // Export user data
    const exportResult = await exportUserData(email, {
      format,
      includeOrders: true,
      includeCart: true,
      includeFavorites: true,
      includeConsents: true,
      includeSessions: true,
    });

    // Return as downloadable file
    const headers = new Headers();
    headers.set('Content-Type', exportResult.contentType);
    headers.set('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    return new NextResponse(exportResult.data, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'Failed to export user data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gdpr/export
 * Alternative method for data export (for authenticated requests)
 *
 * Body:
 * {
 *   email: string,
 *   format?: 'json' | 'csv'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, format = 'json' } = body;

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Export user data
    const exportResult = await exportUserData(email, {
      format: format as 'json' | 'csv',
      includeOrders: true,
      includeCart: true,
      includeFavorites: true,
      includeConsents: true,
      includeSessions: true,
    });

    // Return as downloadable file
    const headers = new Headers();
    headers.set('Content-Type', exportResult.contentType);
    headers.set('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    return new NextResponse(exportResult.data, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'Failed to export user data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
