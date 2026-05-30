import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const SCRAPER_UAS = ['python-requests', 'scrapy', 'curl/', 'wget/', 'Go-http'];

function notify(
  type: 'rate_limit' | 'bot_ua',
  ip: string,
  count: number,
  ua: string,
  path: string
): void {
  const botServerUrl = process.env.BOT_SERVER_URL;
  const secret = process.env.INTERNAL_SECRET;
  if (!botServerUrl || !secret) return;
  fetch(`${botServerUrl}/internal/alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': secret },
    body: JSON.stringify({ type, ip, count, ua, path }),
  }).catch(() => {});
}

const ADMIN_SUBDOMAIN = 'admin';
const adminPath = process.env.ADMIN_PATH_SECRET;
if (!adminPath) throw new Error('ADMIN_PATH_SECRET is not set');
const ADMIN_PATH = `/${adminPath}`;
const MAIN_DOMAIN = 'dekop.com.ua';

/**
 * Generates a cryptographically secure nonce for CSP
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64');
}

/**
 * Next.js Proxy - Security Headers, CSP & Subdomain Routing
 *
 * FEATURES:
 * - Subdomain routing: admin.dekop.com.ua -> admin panel (configurable via env)
 * - Content Security Policy with dynamic nonce
 * - CORS configuration for allowed origins
 * - HSTS, X-Frame-Options, and other security headers
 * - Security logging for sensitive endpoints
 */
export async function proxy(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const hostname = req.headers.get('host') || '';
  const origin = req.headers.get('origin');
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? '';
  const path = requestUrl.pathname;

  // ==========================================
  // BOT MONITORING CHECKS (fail open on Redis errors)
  // ==========================================

  try {
    const maintenance = await redis.get<string>('maintenance_mode');
    if (String(maintenance) === 'true' && path !== '/api/health') {
      return new NextResponse('Service Unavailable', { status: 503 });
    }
  } catch {}

  try {
    const blocked = await redis.get(`blocked:${ip}`);
    if (blocked) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  } catch {}

  const isInternal = req.headers.get('x-internal-key') === process.env.INTERNAL_SECRET;

  if (!isInternal && SCRAPER_UAS.some(b => ua.includes(b))) {
    notify('bot_ua', ip, 0, ua, path);
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (!isInternal) {
    try {
      const rateKey = `rate:${ip}`;
      const count = await redis.incr(rateKey);
      if (count === 1) await redis.expire(rateKey, 60);
      if (count > 100) {
        await redis.zadd('scraper:suspects', { score: count, member: ip });
        notify('rate_limit', ip, count, ua, path);
        return new NextResponse('Too Many Requests', { status: 429 });
      }
    } catch {}
  }

  try {
    const bucket = Math.floor(Date.now() / 60000);
    const trafficKey = `traffic:minute:${bucket}`;
    const n = await redis.incr(trafficKey);
    if (n === 1) await redis.expire(trafficKey, 3600);
  } catch {}

  // ==========================================
  // SUBDOMAIN ROUTING FOR ADMIN PANEL
  // ==========================================

  // Check if request is from admin subdomain
  const isAdminSubdomain =
    hostname === `${ADMIN_SUBDOMAIN}.${MAIN_DOMAIN}` ||
    hostname.startsWith(`${ADMIN_SUBDOMAIN}.localhost`) ||
    hostname === `${ADMIN_SUBDOMAIN}.localhost:3000`;

  // Check if path is the hidden admin path
  const isAdminPath = requestUrl.pathname.startsWith(ADMIN_PATH);

  // Development mode check
  const isDev = process.env.NODE_ENV === 'development';

  // ── Coming soon redirect (bot-aware) ─────────────────────────────────────
  // Set COMING_SOON=true in Vercel env vars to enable.
  // Search engine bots bypass the redirect so real pages get crawled/indexed.
  // vercel.json cannot check user-agents, so this MUST live in middleware.
  if (process.env.COMING_SOON !== 'false' && !isAdminPath && !isAdminSubdomain) {
    const path = requestUrl.pathname;
    const isComingSoonPage = path === '/coming-soon' || path.startsWith('/coming-soon/');
    // API routes must never redirect — SSR/ISR server-side fetches use them internally
    const isApiRoute = path.startsWith('/api/');
    // Vercel-internal paths (_vercel/insights/view etc.) must pass through.
    // Redirecting them sends the Analytics beacon to /coming-soon on every page
    // load, creating a cascade of serverless invocations that triggers 429s.
    const isVercelInternal = path.startsWith('/_vercel/');
    // Next.js runtime paths (_next/webpack-hmr, RSC flight data, etc.) must
    // also pass through; they are not user-navigable pages.
    const isNextInternal = path.startsWith('/_next/');
    // SEO files must always be served as-is so crawlers and validators get valid
    // content — redirecting them causes robots.txt to return HTML.
    const isStaticSeo = path === '/robots.txt' || path === '/sitemap.xml';
    if (!isComingSoonPage && !isApiRoute && !isVercelInternal && !isNextInternal && !isStaticSeo) {
      const ua = req.headers.get('user-agent') || '';
      const isBot = /googlebot|google-inspectiontool|google-extended|bingbot|baiduspider|yandexbot|duckduckbot|slurp|applebot|facebookexternalhit|twitterbot|linkedinbot|perplexitybot|anthropic-ai|claudebot/i.test(ua);
      if (!isBot) {
        return NextResponse.redirect(new URL('/coming-soon', req.url));
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // If accessing admin subdomain, rewrite to admin path
  // API routes pass through unchanged — they handle their own auth
  if (isAdminSubdomain && !isAdminPath && !requestUrl.pathname.startsWith('/api/')) {
    const newPath = requestUrl.pathname === '/'
      ? ADMIN_PATH
      : `${ADMIN_PATH}${requestUrl.pathname}`;

    const rewriteUrl = new URL(newPath, req.url);
    rewriteUrl.search = requestUrl.search;

    // Generate nonce and pass it in request headers for downstream components
    const nonce = generateNonce();
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('x-pathname', newPath);
    requestHeaders.set('x-admin-subdomain', 'true'); // Flag for client-side detection

    const response = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });
    return addSecurityHeaders(req, response, nonce, origin, true);
  }

  // If accessing admin path from main domain (not subdomain), redirect to admin subdomain
  // Skip this in development for easier testing
  if (isAdminPath && !isAdminSubdomain && !isDev) {
    const adminUrl = new URL(req.url);
    adminUrl.hostname = `${ADMIN_SUBDOMAIN}.${MAIN_DOMAIN}`;
    // Remove the admin path prefix from path
    adminUrl.pathname = requestUrl.pathname.replace(ADMIN_PATH, '') || '/';

    return NextResponse.redirect(adminUrl);
  }
  
  // Generate nonce for this request
  const nonce = generateNonce();

  // ==========================================
  // CORS CONFIGURATION
  // ==========================================
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    `https://${MAIN_DOMAIN}`,
    `https://${ADMIN_SUBDOMAIN}.${MAIN_DOMAIN}`,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://admin.localhost:3000',
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
  // Note: isDev is already declared above for subdomain routing

  // Script sources
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'", // Allows scripts loaded by trusted scripts
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://www.liqpay.ua",
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
    "https://ik.imagekit.io", // ImageKit for admin product images
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

  // Cross-Origin-Opener-Policy — isolates the browsing context from cross-origin
  // documents while still allowing popups (needed for LiqPay payment windows).
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // ==========================================
  // ADMIN PANEL SECURITY
  // ==========================================
  const isCurrentAdminPath = requestUrl.pathname.startsWith(ADMIN_PATH);

  if (isCurrentAdminPath) {
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
  const sensitivePatterns = ['/api/orders', '/api/webhooks', '/api/payments', '/api/gdpr', ADMIN_PATH];
  const isSensitivePath = sensitivePatterns.some(pattern =>
    requestUrl.pathname.startsWith(pattern)
  );

  if (isSensitivePath && !isCurrentAdminPath) {
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
 * Helper function to add security headers to a response
 * Used for subdomain rewrite responses
 */
function addSecurityHeaders(
  req: NextRequest,
  response: NextResponse,
  nonce: string,
  origin: string | null,
  isAdmin: boolean
): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';
  const requestUrl = new URL(req.url);

  // CORS
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    `https://${MAIN_DOMAIN}`,
    `https://${ADMIN_SUBDOMAIN}.${MAIN_DOMAIN}`,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://admin.localhost:3000',
  ].filter(Boolean) as string[];

  const isAllowedOrigin = origin && allowedOrigins.some(allowed => {
    if (isDev && allowed.includes('localhost')) {
      return origin.includes('localhost');
    }
    return origin === allowed;
  });

  if (isAllowedOrigin && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // CSP
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://www.liqpay.ua",
    "https://pay.google.com",
    "https://va.vercel-scripts.com",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];

  const cspDirectives = [
    `default-src 'self'`,
    `script-src ${scriptSources.join(' ')}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com`,
    `img-src 'self' data: blob: https: https://ik.imagekit.io`,
    `font-src 'self' data: https://fonts.gstatic.com https://unpkg.com`,
    `connect-src 'self' https://api.liqpay.ua https://www.liqpay.ua https://pay.google.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com https://*.tile.openstreetmap.org`,
    `frame-src 'self' https://www.liqpay.ua https://pay.google.com`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://www.liqpay.ua`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    ...(!isDev ? ['upgrade-insecure-requests'] : []),
  ];

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // Security headers
  if (!isDev) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // Admin-specific headers
  if (isAdmin) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    console.log('[ADMIN ACCESS]', JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: requestUrl.pathname,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent')?.substring(0, 100) || 'unknown',
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
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - _vercel       (Vercel Analytics & Speed Insights beacons — must NOT be
     *                  redirected or they loop back and trigger 429s)
     * - favicon.ico
     * - Static assets (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot)$).*)',
  ],
};
