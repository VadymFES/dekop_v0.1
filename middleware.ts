import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";

export async function middleware(req: NextRequest) {
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
  matcher: "/api/cart/:path*",
};
