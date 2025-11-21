import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";

/**
 * Next.js Proxy - Combines Cart Management & Security Features
 *
 * FEATURES:
 * - Cart session management
 * - Security headers (CSP, HSTS, etc.)
 * - CORS configuration
 * - Security logging
 */

export async function proxy(req: NextRequest) {
  const response = NextResponse.next();
  const requestUrl = new URL(req.url);

  // ==========================================
  // CART MANAGEMENT (for cart routes only)
  // ==========================================
  if (requestUrl.pathname.startsWith('/api/cart')) {
    let storedCookie = await cookies();
    let cartCookie = storedCookie.get("cartId");

    if (!cartCookie) {
      const { rows } = await sql`INSERT INTO carts DEFAULT VALUES RETURNING id`;
      const newCartId = rows[0].id;

      response.cookies.set("cartId", newCartId, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
    }
  }

  // ==========================================
  // CORS CONFIGURATION
  // ==========================================
  const origin = req.headers.get('origin');

  // Allowed origins for CORS
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[];

  // Check if origin is allowed
  const isAllowedOrigin = origin && allowedOrigins.some(allowed => {
    // Support wildcards in development
    if (process.env.NODE_ENV === 'development' && allowed.includes('localhost')) {
      return origin.includes('localhost');
    }
    return origin === allowed;
  });

  // Set CORS headers
  if (isAllowedOrigin && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 204 });

    if (isAllowedOrigin && origin) {
      preflightResponse.headers.set('Access-Control-Allow-Origin', origin);
      preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    preflightResponse.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    preflightResponse.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-API-Key, X-Requested-With'
    );
    preflightResponse.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

    return preflightResponse;
  }

  // ==========================================
  // SECURITY HEADERS
  // ==========================================

  /**
   * Content-Security-Policy (CSP)
   * Prevents XSS attacks by controlling which resources can be loaded
   */
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.liqpay.ua https://api.monobank.ua",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://www.liqpay.ua https://api.monobank.ua",
    "frame-src 'self' https://www.liqpay.ua",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://www.liqpay.ua",
    "frame-ancestors 'none'",
  ];

  // Only upgrade to HTTPS in production (breaks localhost development)
  if (process.env.NODE_ENV === 'production') {
    cspDirectives.push("upgrade-insecure-requests");
  }

  response.headers.set(
    'Content-Security-Policy',
    cspDirectives.join('; ')
  );

  /**
   * X-Frame-Options - Prevents clickjacking attacks
   */
  response.headers.set('X-Frame-Options', 'DENY');

  /**
   * X-Content-Type-Options - Prevents MIME type sniffing
   */
  response.headers.set('X-Content-Type-Options', 'nosniff');

  /**
   * Strict-Transport-Security (HSTS) - Forces HTTPS
   * Only set in production
   */
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  /**
   * Referrer-Policy - Controls referrer information
   */
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  /**
   * Permissions-Policy - Controls browser features
   */
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  /**
   * X-XSS-Protection - Legacy XSS protection
   */
  response.headers.set('X-XSS-Protection', '1; mode=block');

  /**
   * X-DNS-Prefetch-Control
   */
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // ==========================================
  // SECURITY LOGGING
  // ==========================================

  // Log suspicious activity
  const userAgent = req.headers.get('user-agent') || '';
  const isBot = /bot|crawler|spider|scraper/i.test(userAgent);

  // Log access to sensitive endpoints
  if (requestUrl.pathname.startsWith('/api/orders') ||
      requestUrl.pathname.startsWith('/api/webhooks') ||
      requestUrl.pathname.startsWith('/api/payments')) {
    console.log('[SECURITY]', {
      method: req.method,
      path: requestUrl.pathname,
      origin,
      userAgent: isBot ? 'bot' : 'user',
      timestamp: new Date().toISOString(),
    });
  }

  return response;
}

/**
 * Matcher configuration
 * Applies to all routes except static files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)',
  ],
};
