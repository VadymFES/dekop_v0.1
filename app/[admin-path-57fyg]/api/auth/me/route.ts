/**
 * Get Current Admin User API Route
 * GET /[admin-path-57fyg]/api/auth/me
 */

import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/app/lib/admin-auth';

export async function GET() {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        permissions: admin.permissions,
        roles: admin.roles,
      },
    });
  } catch (error) {
    console.error('Get current admin error:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred',
    }, { status: 500 });
  }
}
