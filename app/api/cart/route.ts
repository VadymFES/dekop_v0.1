import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { randomUUID } from "crypto";

/**
 * GET /api/cart
 * Fetch the user's cart items based on cartId in a cookie.
 */
export async function GET(request: NextRequest) {
  try {
    // Retrieve the cartId from cookies
    const storedCookie = await cookies();
    const cartCookie = storedCookie.get("cartId");
    const cartId = cartCookie?.value;

    // If no cartId exists, return an empty cart
    if (!cartId) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    // Fetch cart items from the database using the cartId
    const { rows: cartItems } = await sql`
      SELECT * 
      FROM cart_items 
      WHERE cart_id = ${cartId}
    `;

    return NextResponse.json({ items: cartItems }, { status: 200 });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 });
  }
}

/**
 * POST /api/cart
 * Add or update an item in the cart.
 * Expects JSON { productId, quantity, color } in the request body.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse the request body
    const body = await request.json();
    let { productId, quantity = 1, color = "" } = body;

    // Validate inputs (in real apps, add more robust validation)
    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const numericProductId = Number(productId);
    if (isNaN(numericProductId)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }

    // 2. Retrieve the cartId from cookies (if it exists)
    const storedCookie = await cookies();
    let cartCookie = storedCookie.get("cartId");
    let cartId = cartCookie?.value;

    // Define the expiration time (7 days from now)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 3. If no cartId exists, create a new cart with a UUID and an expiration timestamp
    if (!cartId) {
      cartId = randomUUID(); // Generate a new UUID for the cart
      await sql`
        INSERT INTO carts (id, expires_at)
        VALUES (${cartId}, ${expiresAt.toISOString()})
      `;
    } else {
      // Optionally, update the expiration time on each request (to extend the lifetime)
      await sql`
        UPDATE carts
        SET expires_at = ${expiresAt.toISOString()}
        WHERE id = ${cartId}
      `;
    }

    // 4. Upsert the cart item into the database
    const response = await upsertCartItem(cartId, numericProductId, quantity, color);

    // 5. Set the cartId cookie on the response with a maxAge of 7 days
    response.cookies.set("cartId", cartId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
  }
}

/**
 * Helper function to upsert a cart item and return the updated cart.
 */
async function upsertCartItem(
  cartId: string,
  productId: number,
  quantity: number,
  color: string
): Promise<NextResponse> {
  try {
    // Assume a unique constraint exists on (cart_id, product_id, color)
    // so that if the same product/color is added, we increment the quantity.
    await sql`
      INSERT INTO cart_items (cart_id, product_id, quantity, color)
      VALUES (${cartId}, ${productId}, ${quantity}, ${color})
      ON CONFLICT (cart_id, product_id, color)
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
    `;

    // Fetch the updated cart items
    const { rows: updatedCartItems } = await sql`
      SELECT * 
      FROM cart_items 
      WHERE cart_id = ${cartId}
    `;

    return NextResponse.json({ items: updatedCartItems }, { status: 200 });
  } catch (error) {
    console.error("Upsert cart item error:", error);
    return NextResponse.json({ error: "Failed to upsert cart item" }, { status: 500 });
  }
}
