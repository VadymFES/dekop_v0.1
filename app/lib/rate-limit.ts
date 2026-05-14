import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: Date;
}

/**
 * Postgres-backed sliding-window rate limiter.
 * Uses an atomic upsert so it is safe under concurrent requests.
 * Falls open (allows) if the DB call fails — never blocks legitimate traffic
 * due to infrastructure issues.
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

  try {
    const { rows } = await db.query`
      INSERT INTO rate_limits (key, count, window_start)
      VALUES (${key}, 1, ${now.toISOString()})
      ON CONFLICT (key) DO UPDATE
        SET
          count = CASE
            WHEN rate_limits.window_start < ${windowStart.toISOString()}
            THEN 1
            ELSE rate_limits.count + 1
          END,
          window_start = CASE
            WHEN rate_limits.window_start < ${windowStart.toISOString()}
            THEN ${now.toISOString()}
            ELSE rate_limits.window_start
          END
      RETURNING count, window_start
    `;

    const count: number = rows[0]?.count ?? 0;
    const windowStartTs = rows[0]?.window_start
      ? new Date(rows[0].window_start).getTime()
      : now.getTime();
    const reset = new Date(windowStartTs + config.windowSeconds * 1000);

    return {
      success: count <= config.limit,
      remaining: Math.max(0, config.limit - count),
      reset,
    };
  } catch {
    // Fail open — a DB hiccup must never block real users
    return { success: true, remaining: 1, reset: new Date() };
  }
}

/** Extract the real client IP from Vercel/proxy headers */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/** Build a scoped key: "login:1.2.3.4" */
export function rateLimitKey(scope: string, request: Request): string {
  return `${scope}:${clientIp(request)}`;
}

/** Return a 429 response with Retry-After header */
export function tooManyRequests(reset: Date): NextResponse {
  const retryAfter = Math.ceil((reset.getTime() - Date.now()) / 1000);
  return NextResponse.json(
    { error: { code: 'rate_limit_exceeded', message: 'Too many requests. Try again later.' } },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': reset.toISOString(),
      },
    }
  );
}
