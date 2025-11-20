import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";

// Routes that should bypass bot protection (webhooks and email endpoints)
const PROTECTED_ROUTES = [
  '/api/webhooks/liqpay',
  '/api/webhooks/monobank',
  '/api/orders/send-confirmation',
  '/api/test/email',
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if this is a protected route (webhook or email endpoint)
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    // Clone the response and add headers to bypass bot protection
    const response = NextResponse.next();

    // Add headers that help identify this as a legitimate API request
    response.headers.set('X-Robots-Tag', 'noindex');
    response.headers.set('X-Content-Type-Options', 'nosniff');

    return response;
  }

  // Cart management logic
  let storedCookie = await cookies();
  let cartCookie = storedCookie.get("cartId");

  if (!cartCookie) {
    const { rows } = await sql`INSERT INTO carts DEFAULT VALUES RETURNING id`;
    const newCartId = rows[0].id;

    const response = NextResponse.next();
    response.cookies.set("cartId", newCartId, {
      path: "/",
      httpOnly: true,
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/cart/:path*",
    "/api/webhooks/:path*",
    "/api/orders/send-confirmation",
    "/api/test/email",
  ],
};
