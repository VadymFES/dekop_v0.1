import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that should bypass bot protection
const PROTECTED_ROUTES = [
  '/api/webhooks/liqpay',
  '/api/webhooks/monobank',
  '/api/orders/send-confirmation',
  '/api/test/email',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if this is a protected route (webhook or email endpoint)
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Clone the response and add headers to bypass bot protection
    const response = NextResponse.next()

    // Add headers that help identify this as a legitimate API request
    response.headers.set('X-Robots-Tag', 'noindex')
    response.headers.set('X-Content-Type-Options', 'nosniff')

    return response
  }

  return NextResponse.next()
}

// Configure which routes this middleware applies to
export const config = {
  matcher: [
    '/api/webhooks/:path*',
    '/api/orders/send-confirmation',
    '/api/test/email',
  ],
}
