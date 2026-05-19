/**
 * CSRF Token Refresh API Route
 * GET /[q3p8t6v2hn5]/api/auth/csrf
 *
 * Returns a fresh CSRF token for authenticated users.
 * Called by CsrfProvider when token is missing or expired.
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshCsrfToken, getCsrfCookie } from '@/app/lib/csrf-protection';
import { getSessionToken } from '@/app/lib/admin-auth';
import { rateLimit, rateLimitKey, tooManyRequests } from '@/app/lib/rate-limit';

export async function GET(request: NextRequest) {
  const rl = await rateLimit(rateLimitKey('admin:csrf', request), { limit: 30, windowSeconds: 60 });
  if (!rl.success) return tooManyRequests(rl.reset);
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
