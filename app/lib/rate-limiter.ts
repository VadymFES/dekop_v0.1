/**
 * Rate Limiter for API endpoints
 * Provides protection against DDoS attacks, brute force attempts, and resource exhaustion
 *
 * IMPORTANT: This is an in-memory implementation suitable for development and small-scale production.
 * For high-traffic production environments, consider using Redis-based rate limiting with
 * libraries like @upstash/ratelimit or ioredis.
 */

import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// Note: This will reset on server restart and doesn't work across multiple instances
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 60 seconds to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Rate limit configuration for different endpoint types
 */
export const RateLimitConfig = {
  // Strict limits for payment and order endpoints
  PAYMENT: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
  },
  ORDER_CREATE: {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
  },
  // Moderate limits for cart operations
  CART: {
    maxRequests: 30,
    windowMs: 60000, // 1 minute
  },
  // Relaxed limits for read operations
  READ: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
  // Very strict for webhooks to prevent abuse
  WEBHOOK: {
    maxRequests: 20,
    windowMs: 60000, // 1 minute
  },
  // Strict for test endpoints
  TEST: {
    maxRequests: 5,
    windowMs: 300000, // 5 minutes
  },
};

/**
 * Gets client identifier from request
 * Uses IP address as the primary identifier
 */
function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare

  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown';

  return ip;
}

/**
 * Checks if a request should be rate limited
 *
 * @param request - The incoming request
 * @param config - Rate limit configuration
 * @param identifier - Optional custom identifier (defaults to IP address)
 * @returns Object with success status and rate limit info
 */
export function checkRateLimit(
  request: Request,
  config: { maxRequests: number; windowMs: number },
  identifier?: string
): {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
} {
  const clientId = identifier || getClientIdentifier(request);
  const key = `${clientId}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // First request or window expired, create new entry
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // Increment count
  entry.count++;

  if (entry.count > config.maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Creates a rate limit response with appropriate headers
 */
export function createRateLimitResponse(
  limit: number,
  remaining: number,
  resetTime: number
): NextResponse {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

/**
 * Middleware-style rate limiter that can be used in API routes
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const rateLimitResult = applyRateLimit(request, RateLimitConfig.ORDER_CREATE);
 *   if (!rateLimitResult.success) {
 *     return rateLimitResult.response;
 *   }
 *
 *   // Continue with request handling...
 * }
 * ```
 */
export function applyRateLimit(
  request: Request,
  config: { maxRequests: number; windowMs: number },
  identifier?: string
): {
  success: boolean;
  response?: NextResponse;
  headers: Record<string, string>;
} {
  const result = checkRateLimit(request, config, identifier);

  const headers = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  };

  if (!result.success) {
    return {
      success: false,
      response: createRateLimitResponse(result.limit, result.remaining, result.resetTime),
      headers,
    };
  }

  return {
    success: true,
    headers,
  };
}

/**
 * Helper to add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  headers: Record<string, string>
): NextResponse {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
