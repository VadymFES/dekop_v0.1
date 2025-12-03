/**
 * Admin Sessions API Route
 * GET - List active sessions for current user
 */

import { NextResponse } from 'next/server';
import { getCurrentAdmin, getSessionToken, hashToken } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current session token hash to identify current session
    const currentToken = await getSessionToken();
    const currentTokenHash = currentToken ? hashToken(currentToken) : null;

    // Get all active sessions for the user
    const result = await db.query`
      SELECT
        id,
        ip_address,
        user_agent,
        created_at,
        last_activity_at,
        token_hash
      FROM admin_sessions
      WHERE user_id = ${admin.id}
        AND revoked = false
        AND expires_at > NOW()
      ORDER BY last_activity_at DESC
    `;

    // Parse sessions and mark current
    const sessions = result.rows.map(session => ({
      id: session.id,
      ip_address: session.ip_address || 'Невідомо',
      device: parseUserAgent(session.user_agent),
      created_at: session.created_at,
      last_activity_at: session.last_activity_at,
      is_current: session.token_hash === currentTokenHash,
    }));

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// Parse user agent to get device info
function parseUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Невідомий пристрій';

  const ua = userAgent.toLowerCase();

  // Detect OS
  let os = 'Невідома ОС';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  // Detect browser
  let browser = 'Невідомий браузер';
  if (ua.includes('chrome') && !ua.includes('edge')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';

  return `${browser} на ${os}`;
}
