/**
 * Admin Logout API Route
 * POST /[admin-path-57fyg]/api/auth/logout
 */

import { NextResponse } from 'next/server';
import { logoutAdmin } from '@/app/lib/admin-auth';
import { clearCsrfCookie } from '@/app/lib/csrf-protection';

export async function POST() {
  try {
    // Note: CSRF validation intentionally skipped for logout
    // Being logged out via CSRF attack is not a security risk (just inconvenience)
    // This also ensures users without CSRF tokens can still logout

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
