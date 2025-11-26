import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";

const generateNonce = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64');
};

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
  // NONCE GENERATION
  // ==========================================
  const nonce = generateNonce();

  // Set the nonce on a custom *request* header. 
  // This is the reliable way for pages/layouts to read it later via headers().
  req.headers.set('x-content-security-policy-nonce', nonce); 

  // ==========================================
  // CART MANAGEMENT (for cart routes only)
  // ==========================================
  if (requestUrl.pathname.startsWith('/cart/api')) {
    let storedCookie = await cookies();
    let cartCookie = storedCookie.get("cartId");

    if (!cartCookie) {
      // @ts-ignore - Vercel's sql module may not have standard TS types
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
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[];

  const isAllowedOrigin = origin && allowedOrigins.some(allowed => {
    if (process.env.NODE_ENV === 'development' && allowed.includes('localhost')) {
      return origin.includes('localhost');
    }
    return origin === allowed;
  });

  if (isAllowedOrigin && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

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
    preflightResponse.headers.set('Access-Control-Max-Age', '86400');

    return preflightResponse;
  }

  // ==========================================
  // SECURITY HEADERS (Nonce Applied Here)
  // ==========================================

  /**
   * Content-Security-Policy (CSP)
   */
  const nonceSource = `'nonce-${nonce}'`;

  const scriptSources = [
    "'self'",
    nonceSource,
    "https://www.googletagmanager.com",
    "https://www.liqpay.ua",
    "https://api.monobank.ua",
    "https://pay.google.com",
    "https://va.vercel-scripts.com",
  ];

  // Add 'unsafe-eval' in dev for Next.js HMR/Fast Refresh
  if (process.env.NODE_ENV === 'development') {
    scriptSources.push("'unsafe-eval'");
  }

  const styleSources = [
    "'self'",
    nonceSource,
    "https://fonts.googleapis.com",
    "https://unpkg.com",
  ];

  const cspDirectives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    `style-src ${styleSources.join(' ')}`,
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com https://unpkg.com",
    "connect-src 'self' https://api.liqpay.ua https://www.liqpay.ua https://api.monobank.ua https://pay.google.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com",
    "frame-src 'self' https://www.liqpay.ua https://pay.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://www.liqpay.ua",
    "frame-ancestors 'none'",
  ];

  let cspHeaderValue = cspDirectives.join('; ');

  if (process.env.NODE_ENV === 'production') {
    cspHeaderValue = `${cspHeaderValue}; upgrade-insecure-requests`;

    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  response.headers.set(
    'Content-Security-Policy',
    cspHeaderValue
  );

  /**
   * Non-CSP Security Headers
   */
  response.headers.set('X-Frame-Options', 'DENY'); 
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // ==========================================
  // SECURITY LOGGING
  // ==========================================
  const userAgent = req.headers.get('user-agent') || '';
  const isBot = /bot|crawler|spider|scraper/i.test(userAgent);

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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)',
  ],
};