// middleware.ts
// Custom protection that allows webhooks while maintaining security for other routes
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow payment webhooks - these must be accessible for LiqPay & Monobank
  if (pathname.startsWith('/api/webhooks/')) {
    // No additional checks - payment providers need direct access
    return NextResponse.next();
  }

  // Allow order confirmation API (used after successful payments)
  if (pathname.startsWith('/api/orders/send-confirmation')) {
    return NextResponse.next();
  }

  // Optional: Remove or protect test endpoint in production
  if (pathname.startsWith('/api/test/email')) {
    // For development/testing only
    // In production, you might want to:
    // - Remove this endpoint
    // - Add authentication
    // - Check for specific IPs

    if (process.env.NODE_ENV === 'production') {
      // Optionally block in production or add auth check here
      // return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    return NextResponse.next();
  }

  // All other routes continue normally (with Vercel's bot protection)
  return NextResponse.next();
}

// Specify which routes this middleware applies to
export const config = {
  matcher: [
    '/api/webhooks/:path*',
    '/api/orders/send-confirmation',
    '/api/test/email',
  ],
};
