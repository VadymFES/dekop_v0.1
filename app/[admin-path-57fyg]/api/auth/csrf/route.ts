/**
 * CSRF Token Refresh API Route
 * GET /[admin-path-57fyg]/api/auth/csrf
 *
 * Returns a fresh CSRF token for authenticated users.
 * Called by CsrfProvider when token is missing or expired.
 */

import { NextResponse } from 'next/server';
import { refreshCsrfToken, getCsrfCookie } from '@/app/lib/csrf-protection';
import { getSessionToken } from '@/app/lib/admin-auth';

export async function GET() {
  try {
    // Check if user has a valid session
    const sessionToken = await getSessionToken();
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if there's an existing valid CSRF token
    const existingToken = await getCsrfCookie();
    if (existingToken) {
      // Return existing token
      return NextResponse.json({ csrfToken: existingToken });
    }

    // Generate new CSRF token
    const newToken = await refreshCsrfToken();
    if (!newToken) {
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }

    return NextResponse.json({ csrfToken: newToken });
  } catch (error) {
    console.error('CSRF refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
