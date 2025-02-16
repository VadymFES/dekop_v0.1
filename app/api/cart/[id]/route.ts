import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { cookies } from "next/headers";

/**
 * PATCH /api/cart/[id]
 * Update the quantity of a cart item.
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { quantity } = await request.json();

    if (!id || !quantity || isNaN(Number(quantity))) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Update quantity in the cart_items table
    await sql`
      UPDATE cart_items
      SET quantity = ${quantity}
      WHERE id = ${id}
    `;

    // Fetch updated cart
    const cookieStore = await cookies();
    const cartId = cookieStore.get("cartId")?.value;
    const { rows: updatedCart } = await sql`
      SELECT * FROM cart_items WHERE cart_id = ${cartId}
    `;

    return NextResponse.json({ items: updatedCart }, { status: 200 });
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
  }
}

/**
 * DELETE /api/cart/[id]
 * Remove a specific item from the cart.
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    await sql`
      DELETE FROM cart_items WHERE id = ${id}
    `;

    // Fetch updated cart
    const cookieStore = await cookies();
    const cartId = cookieStore.get("cartId")?.value;
    const { rows: updatedCart } = await sql`
      SELECT * FROM cart_items WHERE cart_id = ${cartId}
    `;

    return NextResponse.json({ items: updatedCart }, { status: 200 });
  } catch (error) {
    console.error("Error deleting cart item:", error);
    return NextResponse.json({ error: "Failed to remove item" }, { status: 500 });
  }
}
