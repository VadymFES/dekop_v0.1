// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware - Security & CORS Configuration
 *
 * This middleware applies security headers and CORS policies to all routes.
 * It runs on the Edge Runtime for optimal performance.
 *
 * SECURITY FEATURES:
 * - Content Security Policy (CSP)
 * - X-Frame-Options (clickjacking protection)
 * - X-Content-Type-Options (MIME sniffing protection)
 * - Strict-Transport-Security (HSTS)
 * - Referrer-Policy
 * - Permissions-Policy
 * - CORS configuration
 */

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get the request origin
  const origin = request.headers.get('origin');
  const requestUrl = new URL(request.url);

  // ==========================================
  // CORS CONFIGURATION
  // ==========================================

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
  if (request.method === 'OPTIONS') {
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
   *
   * IMPORTANT: Adjust this policy based on your actual needs
   * Current policy is restrictive - add trusted domains as needed
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
    "upgrade-insecure-requests",
  ];

  response.headers.set(
    'Content-Security-Policy',
    cspDirectives.join('; ')
  );

  /**
   * X-Frame-Options
   * Prevents clickjacking attacks by controlling if page can be embedded in frames
   */
  response.headers.set('X-Frame-Options', 'DENY');

  /**
   * X-Content-Type-Options
   * Prevents MIME type sniffing
   */
  response.headers.set('X-Content-Type-Options', 'nosniff');

  /**
   * Strict-Transport-Security (HSTS)
   * Forces HTTPS connections
   * Only set in production with HTTPS
   */
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  /**
   * Referrer-Policy
   * Controls how much referrer information is shared
   */
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  /**
   * Permissions-Policy
   * Controls which browser features can be used
   */
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  /**
   * X-XSS-Protection
   * Legacy XSS protection (mostly replaced by CSP, but still useful for older browsers)
   */
  response.headers.set('X-XSS-Protection', '1; mode=block');

  /**
   * X-DNS-Prefetch-Control
   * Controls DNS prefetching
   */
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // ==========================================
  // SECURITY LOGGING
  // ==========================================

  // Log suspicious activity
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /bot|crawler|spider|scraper/i.test(userAgent);

  // Log access to sensitive endpoints
  if (requestUrl.pathname.startsWith('/api/orders') ||
      requestUrl.pathname.startsWith('/api/webhooks') ||
      requestUrl.pathname.startsWith('/api/payments')) {
    console.log('[SECURITY]', {
      method: request.method,
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
 * Specifies which routes this middleware applies to
 *
 * This applies to all routes except:
 * - Next.js internals (_next)
 * - Static files (images, fonts, etc.)
 * - Favicon
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
