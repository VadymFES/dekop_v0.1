import { NextRequest, NextResponse } from "next/server";

/**
 * Generates a cryptographically secure nonce for CSP
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64');
}

/**
 * Next.js Middleware - Security Headers & CSP with Nonce
 * 
 * SECURITY FEATURES:
 * - Content Security Policy with dynamic nonce
 * - CORS configuration for allowed origins
 * - HSTS, X-Frame-Options, and other security headers
 * - Security logging for sensitive endpoints
 */
export function proxy(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const origin = req.headers.get('origin');
  
  // Generate nonce for this request
  const nonce = generateNonce();

  // ==========================================
  // CORS CONFIGURATION
  // ==========================================
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
    preflightResponse.headers.set('Access-Control-Max-Age', '86400');

    return preflightResponse;
  }

  // Create response with nonce header for downstream components
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-pathname', requestUrl.pathname); // For admin route detection

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // ==========================================
  // CORS HEADERS
  // ==========================================
  if (isAllowedOrigin && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // ==========================================
  // CONTENT SECURITY POLICY
  // ==========================================
  const isDev = process.env.NODE_ENV === 'development';
  
  // Script sources
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'", // Allows scripts loaded by trusted scripts
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://www.liqpay.ua",
    "https://api.monobank.ua",
    "https://pay.google.com",
    "https://va.vercel-scripts.com",
  ];

  // In development, Next.js requires 'unsafe-eval' for Fast Refresh/HMR
  if (isDev) {
    scriptSources.push("'unsafe-eval'");
  }

  // Style sources
  // Note: 'unsafe-inline' is required for:
  // - React inline styles (style={{...}})
  // - Third-party libraries (Leaflet, etc.) that inject styles
  // - Next.js internal style handling
  // This is a known limitation when using libraries that inject inline styles
  const styleSources = [
    "'self'",
    "'unsafe-inline'", // Required for React inline styles and third-party libs
    "https://fonts.googleapis.com",
    "https://unpkg.com",
  ];

  // Image sources
  const imgSources = [
    "'self'",
    "data:",
    "blob:",
    "https:",
    // Specific domains for better security in production
    "https://dekor-1.s3.eu-north-1.amazonaws.com",
    "https://fullhouse.uz",
    "https://drive.google.com",
    "https://tk.ua",
    "https://images.unsplash.com",
    "https://images.pexels.com",
    // Leaflet map tiles
    "https://*.tile.openstreetmap.org",
    "https://unpkg.com",
  ];

  // Font sources
  const fontSources = [
    "'self'",
    "data:",
    "https://fonts.gstatic.com",
    "https://unpkg.com",
  ];

  // Connect sources (APIs, analytics, etc.)
  const connectSources = [
    "'self'",
    "https://api.liqpay.ua",
    "https://www.liqpay.ua",
    "https://api.monobank.ua",
    "https://pay.google.com",
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
    "https://www.google-analytics.com",
    "https://www.googletagmanager.com",
    "https://analytics.google.com",
    // Leaflet tiles
    "https://*.tile.openstreetmap.org",
  ];

  // Frame sources
  const frameSources = [
    "'self'",
    "https://www.liqpay.ua",
    "https://pay.google.com",
  ];

  // Worker sources (for service workers, web workers)
  const workerSources = [
    "'self'",
    "blob:", // Required for some worker implementations
  ];

  // Build CSP directives
  const cspDirectives = [
    `default-src 'self'`,
    `script-src ${scriptSources.join(' ')}`,
    `style-src ${styleSources.join(' ')}`,
    `img-src ${imgSources.join(' ')}`,
    `font-src ${fontSources.join(' ')}`,
    `connect-src ${connectSources.join(' ')}`,
    `frame-src ${frameSources.join(' ')}`,
    `worker-src ${workerSources.join(' ')}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://www.liqpay.ua`,
    `frame-ancestors 'none'`,
    // manifest-src for PWA support
    `manifest-src 'self'`,
  ];

  // Add upgrade-insecure-requests in production
  if (!isDev) {
    cspDirectives.push('upgrade-insecure-requests');
  }

  const cspHeader = cspDirectives.join('; ');

  // Set CSP header
  // Use Content-Security-Policy in production, Report-Only in development for debugging
  response.headers.set('Content-Security-Policy', cspHeader);

  // ==========================================
  // ADDITIONAL SECURITY HEADERS
  // ==========================================
  
  // HSTS - only in production
  if (!isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy (formerly Feature-Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  
  // XSS Protection (legacy, but still useful for older browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // DNS prefetch control
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // ==========================================
  // ADMIN PANEL SECURITY
  // ==========================================
  const adminPath = '/admin-secret-2024';
  const isAdminPath = requestUrl.pathname.startsWith(adminPath);

  if (isAdminPath) {
    // Add X-Robots-Tag to prevent indexing
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');

    // Log admin panel access
    console.log('[ADMIN ACCESS]', JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: requestUrl.pathname,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent')?.substring(0, 100) || 'unknown',
    }));
  }

  // ==========================================
  // SECURITY LOGGING (for sensitive endpoints)
  // ==========================================
  const sensitivePatterns = ['/api/orders', '/api/webhooks', '/api/payments', '/api/gdpr', adminPath];
  const isSensitivePath = sensitivePatterns.some(pattern =>
    requestUrl.pathname.startsWith(pattern)
  );

  if (isSensitivePath && !isAdminPath) {
    const userAgent = req.headers.get('user-agent') || '';
    const isBot = /bot|crawler|spider|scraper/i.test(userAgent);

    console.log('[SECURITY]', JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: requestUrl.pathname,
      origin: origin || 'none',
      userAgent: isBot ? 'bot' : 'user',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    }));
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
     * - Static assets (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot)$).*)',
  ],
};
