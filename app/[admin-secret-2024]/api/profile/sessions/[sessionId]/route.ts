/**
 * Admin Single Session API Route
 * DELETE - End (revoke) a specific session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAdminAction, getSessionToken, hashToken } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;

    // Verify the session belongs to the current user
    const sessionResult = await db.query`
      SELECT id, token_hash FROM admin_sessions
      WHERE id = ${sessionId} AND user_id = ${admin.id}
    `;

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Сесію не знайдено' }, { status: 404 });
    }

    // Check if trying to end current session
    const currentToken = await getSessionToken();
    const currentTokenHash = currentToken ? hashToken(currentToken) : null;
    const isCurrentSession = sessionResult.rows[0].token_hash === currentTokenHash;

    if (isCurrentSession) {
      return NextResponse.json({
        error: 'Неможливо завершити поточну сесію. Використайте кнопку "Вийти".',
      }, { status: 400 });
    }

    // Revoke the session
    await db.query`
      UPDATE admin_sessions
      SET revoked = true, revoked_at = NOW(), revoked_reason = 'user_terminated'
      WHERE id = ${sessionId}
    `;

    // Log action
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    await logAdminAction(
      admin.id,
      admin.email,
      'session_terminated',
      'admin_sessions',
      sessionId,
      null,
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'Сесію завершено',
    });
  } catch (error) {
    console.error('End session error:', error);
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }
}
