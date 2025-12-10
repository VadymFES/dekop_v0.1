/**
 * Admin Logout API Route
 * POST /[admin-path-57fyg]/api/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { logoutAdmin } from '@/app/lib/admin-auth';
import { clearCsrfCookie, validateCsrfRequest } from '@/app/lib/csrf-protection';

export async function POST(request: NextRequest) {
  try {
    // Validate CSRF token (Task 6)
    const csrfValid = await validateCsrfRequest(request);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF validation failed', code: 'CSRF_INVALID' }, { status: 403 });
    }

    await logoutAdmin();
    // Clear CSRF cookie on logout (Task 6)
    await clearCsrfCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred during logout',
    }, { status: 500 });
  }
}
