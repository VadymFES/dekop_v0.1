/**
 * Admin Password Change API Route
 * PUT - Change password
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentAdmin,
  logAdminAction,
  hashPassword,
  verifyPassword,
  hashToken,
  revokeAllUserSessions,
  createSession,
  setSessionCookie,
} from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import { validateCsrfRequest, generateCsrfToken, setCsrfCookie } from '@/app/lib/csrf-protection';
import { z } from 'zod';

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Поточний пароль обов\'язковий'),
  new_password: z.string()
    .min(8, 'Новий пароль має бути не менше 8 символів')
    .max(128, 'Пароль занадто довгий'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Паролі не співпадають',
  path: ['confirm_password'],
});

export async function PUT(request: NextRequest) {
  try {
    // Validate CSRF token (Task 6)
    const csrfValid = await validateCsrfRequest(request);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF validation failed', code: 'CSRF_INVALID' }, { status: 403 });
    }

    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const { current_password, new_password } = validation.data;

    // Get current password hash
    const result = await db.query`
      SELECT password_hash FROM admin_users WHERE id = ${admin.id}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { password_hash } = result.rows[0];

    // Verify current password
    const isValid = await verifyPassword(current_password, password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Невірний поточний пароль' }, { status: 400 });
    }

    // Hash new password
    const newHash = await hashPassword(new_password);

    // Update password
    await db.query`
      UPDATE admin_users
      SET password_hash = ${newHash}, updated_at = NOW()
      WHERE id = ${admin.id}
    `;

    // Revoke all existing sessions for security
    await revokeAllUserSessions(admin.id);

    // Create new session
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    const newToken = await createSession(admin.id, ipAddress, userAgent);
    await setSessionCookie(newToken);

    // Generate new CSRF token for the new session (Task 6)
    const sessionTokenHash = hashToken(newToken);
    const csrfToken = generateCsrfToken(sessionTokenHash);
    await setCsrfCookie(csrfToken);

    // Log action
    await logAdminAction(
      admin.id,
      admin.email,
      'password_changed',
      'admin_users',
      admin.id,
      null,
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'Пароль змінено успішно',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
