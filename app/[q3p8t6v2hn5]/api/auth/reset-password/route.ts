/**
 * API скидання пароля
 * POST /[q3p8t6v2hn5]/api/auth/reset-password
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/app/lib/db';
import { generateToken, hashToken, logAdminAction } from '@/app/lib/admin-auth';
import { rateLimit, rateLimitKey, tooManyRequests } from '@/app/lib/rate-limit';
import { passwordResetRequestSchema, safeValidateInput } from '@/app/lib/admin-validation';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const rl = await rateLimit(rateLimitKey('admin:reset-password', request), { limit: 3, windowSeconds: 3600 });
  if (!rl.success) return tooManyRequests(rl.reset);

  try {
    const body = await request.json();

    const validation = safeValidateInput(passwordResetRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Невірний email' }, { status: 400 });
    }

    const normalizedEmail = validation.data.email;

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

    // Send reset email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dekop.com.ua';
    const adminPath = process.env.ADMIN_PATH_SECRET;
    const resetLink = `${siteUrl}/${adminPath}/reset-password?token=${token}`;

    await resend.emails.send({
      from: 'noreply@dekop.com.ua',
      to: normalizedEmail,
      subject: 'Скидання пароля — DEKOP Адмін',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #333;">
          <h2 style="margin: 0 0 16px; font-size: 20px;">Скидання пароля</h2>
          <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: #555;">
            Ми отримали запит на скидання пароля для вашого облікового запису адміністратора DEKOP.
            Якщо це були не ви — просто проігноруйте цей лист.
          </p>
          <a href="${resetLink}"
             style="display: inline-block; padding: 12px 28px; background: #333; color: #fff;
                    text-decoration: none; border-radius: 4px; font-size: 15px; font-weight: bold;">
            Скинути пароль
          </a>
          <p style="margin: 24px 0 0; font-size: 13px; color: #999;">
            Посилання дійсне протягом 1 години.<br>
            Якщо кнопка не працює, скопіюйте це посилання у браузер:<br>
            <span style="word-break: break-all;">${resetLink}</span>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({
      success: false,
      error: 'Виникла помилка при скиданні пароля',
    }, { status: 500 });
  }
}
