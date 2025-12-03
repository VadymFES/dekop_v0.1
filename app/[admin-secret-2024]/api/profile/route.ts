/**
 * Admin Profile API Route
 * GET - Get current admin profile
 * PUT - Update profile (name)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAdminAction } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import { z } from 'zod';

const updateProfileSchema = z.object({
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
});

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get full profile data
    const result = await db.query`
      SELECT
        id, email, first_name, last_name,
        created_at, last_login_at, last_login_ip
      FROM admin_users
      WHERE id = ${admin.id}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = result.rows[0];

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        roles: admin.roles,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const { first_name, last_name } = validation.data;

    // Update profile
    await db.query`
      UPDATE admin_users
      SET
        first_name = ${first_name || null},
        last_name = ${last_name || null},
        updated_at = NOW()
      WHERE id = ${admin.id}
    `;

    // Log action
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    await logAdminAction(
      admin.id,
      admin.email,
      'profile_updated',
      'admin_users',
      admin.id,
      { first_name, last_name },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'Профіль оновлено',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
