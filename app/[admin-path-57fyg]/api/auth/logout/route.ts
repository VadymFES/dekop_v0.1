/**
 * Admin Logout API Route
 * POST /[admin-secret-2024]/api/auth/logout
 */

import { NextResponse } from 'next/server';
import { logoutAdmin } from '@/app/lib/admin-auth';

export async function POST() {
  try {
    await logoutAdmin();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred during logout',
    }, { status: 500 });
  }
}
