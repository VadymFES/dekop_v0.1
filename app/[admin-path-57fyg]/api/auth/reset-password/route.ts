/**
 * API скидання пароля
 * POST /[admin-path-57fyg]/api/auth/reset-password
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { generateToken, hashToken, logAdminAction } from '@/app/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Email обов\'язковий',
      }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent');

    // Check if user exists
    const userResult = await db.query`
      SELECT id, email, is_active
      FROM admin_users
      WHERE email = ${normalizedEmail}
    `;

    // Always return success to prevent email enumeration attacks
    if (userResult.rows.length === 0) {
      await logAdminAction(
        null,
        normalizedEmail,
        'password_reset_requested',
        'auth',
        null,
        { reason: 'user_not_found' },
        ipAddress,
        userAgent,
        false,
        'User not found'
      );
      return NextResponse.json({ success: true });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      await logAdminAction(
        user.id,
        normalizedEmail,
        'password_reset_requested',
        'auth',
        null,
        { reason: 'account_inactive' },
        ipAddress,
        userAgent,
        false,
        'Account inactive'
      );
      return NextResponse.json({ success: true });
    }

    // Generate reset token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Revoke any existing reset tokens for this user
    await db.query`
      UPDATE admin_password_reset_tokens
      SET revoked = true, revoked_reason = 'new_request'
      WHERE user_id = ${user.id} AND used_at IS NULL AND revoked = false
    `;

    // Create new reset token
    await db.query`
      INSERT INTO admin_password_reset_tokens
        (user_id, token_hash, expires_at, ip_address, user_agent)
      VALUES
        (${user.id}, ${tokenHash}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent})
    `;

    // Log the request
    await logAdminAction(
      user.id,
      normalizedEmail,
      'password_reset_requested',
      'auth',
      null,
      { token_expires_at: expiresAt.toISOString() },
      ipAddress,
      userAgent
    );

    // In production, you would send an email here with the reset link
    // For now, we'll just log the token for testing purposes
    console.log(`[PASSWORD RESET] Token for ${normalizedEmail}: ${token}`);
    console.log(`[PASSWORD RESET] Reset URL: /admin-path-57fyg/reset-password/confirm?token=${token}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({
      success: false,
      error: 'Виникла помилка при скиданні пароля',
    }, { status: 500 });
  }
}
