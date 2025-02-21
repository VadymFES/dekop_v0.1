// app/api/cart/route.ts

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { CartItem, ProductWithDetails } from "@/app/lib/definitions";

/**
 * GET /api/cart
 * Fetch the user's cart items along with full product details.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const cartCookie = cookieStore.get("cartId");
    const cartId = cartCookie?.value;

    if (!cartId) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const { rows: cartItems }: { rows: ProductWithDetails[] } = await sql`
      SELECT 
        ci.*,
        p.id as product_id,
        p.name as product_name,
        p.slug,
        p.description,
        p.category,
        p.price as product_price,
        p.stock,
        p.rating,
        p.is_on_sale,
        p.is_new,
        p.is_bestseller,
        p.created_at as product_created_at,
        p.updated_at as product_updated_at,
        row_to_json(s) as specs,
        (
          SELECT json_agg(row_to_json(pi))
          FROM product_images pi
          WHERE pi.product_id = p.id
        ) as images,
        (
          SELECT json_agg(row_to_json(psc))
          FROM product_spec_colors psc
          WHERE psc.product_id = p.id
        ) as colors
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_specs s ON p.id = s.product_id
      WHERE ci.cart_id = ${cartId}
    `;

    const transformedItems = cartItems.map((item: ProductWithDetails) => ({
      ...item,
      productDetails: {
        id: item.product_id,
        name: item.product_name,
        slug: item.slug,
        description: item.description,
        category: item.category,
        price: item.product_price,
        stock: item.stock,
        rating: item.rating,
        is_on_sale: item.is_on_sale,
        is_new: item.is_new,
        is_bestseller: item.is_bestseller,
        created_at: item.product_created_at,
        updated_at: item.product_updated_at,
        specs: item.specs,
        images: item.images || [],
        colors: item.colors || [],
      },
    }));

    return NextResponse.json({ items: transformedItems }, { status: 200 });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 });
  }
}

/**
 * POST /api/cart
 * Add an item to the cart or increase quantity if already present.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity = 1, color = "" } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const numericProductId = Number(productId);
    if (isNaN(numericProductId)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }

    const cookieStore = await cookies();
    let cartId = cookieStore.get("cartId")?.value;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day expiration

    if (cartId) {
      // Verify if the cart exists in the DB
      const result = await sql`SELECT id FROM carts WHERE id = ${cartId}`;
      if (result.rowCount === 0) {
        // The cartId in the cookie is stale, create a new cart record.
        cartId = randomUUID();
        await sql`INSERT INTO carts (id, expires_at) VALUES (${cartId}, ${expiresAt.toISOString()})`;
      } else {
        // Update the cart expiration.
        await sql`UPDATE carts SET expires_at = ${expiresAt.toISOString()} WHERE id = ${cartId}`;
      }
    } else {
      // No cart exists, so create a new cart.
      cartId = randomUUID();
      await sql`INSERT INTO carts (id, expires_at) VALUES (${cartId}, ${expiresAt.toISOString()})`;
    }

    // Upsert cart item (increase quantity if exists)
    await sql`
      INSERT INTO cart_items (cart_id, product_id, quantity, color)
      VALUES (${cartId}, ${numericProductId}, ${quantity}, ${color})
      ON CONFLICT (cart_id, product_id, color)
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
    `;

    // Fetch updated cart items with full product details.
    const { rows: updatedCartItems }: { rows: ProductWithDetails[] } = await sql`
      SELECT 
        ci.*,
        p.id as product_id,
        p.name as product_name,
        p.slug,
        p.description,
        p.category,
        p.price as product_price,
        p.stock,
        p.rating,
        p.is_on_sale,
        p.is_new,
        p.is_bestseller,
        p.created_at as product_created_at,
        p.updated_at as product_updated_at,
        row_to_json(s) as specs,
        (
          SELECT json_agg(row_to_json(pi))
          FROM product_images pi
          WHERE pi.product_id = p.id
        ) as images,
        (
          SELECT json_agg(row_to_json(psc))
          FROM product_spec_colors psc
          WHERE psc.product_id = p.id
        ) as colors
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_specs s ON p.id = s.product_id
      WHERE ci.cart_id = ${cartId}
    `;

    const transformedItems = updatedCartItems.map((item: ProductWithDetails) => ({
      ...item,
      productDetails: {
        id: item.product_id,
        name: item.product_name,
        slug: item.slug,
        description: item.description,
        category: item.category,
        price: item.product_price,
        stock: item.stock,
        rating: item.rating,
        is_on_sale: item.is_on_sale,
        is_new: item.is_new,
        is_bestseller: item.is_bestseller,
        created_at: item.product_created_at,
        updated_at: item.product_updated_at,
        specs: item.specs,
        images: item.images || [],
        colors: item.colors || [],
      },
    }));

    const response = NextResponse.json({ items: transformedItems }, { status: 200 });
    response.cookies.set("cartId", cartId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json({ error: "Failed to add item to cart" }, { status: 500 });
  }
}

/**
 * PATCH /api/cart/[id]
 * Update the quantity of a cart item.
 */
export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const { quantity } = await request.json();

    if (!id || !quantity || isNaN(Number(quantity))) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await sql`
      UPDATE cart_items
      SET quantity = ${quantity}
      WHERE id = ${id}
    `;

    const cookieStore = await cookies();
    const cartId = cookieStore.get("cartId")?.value;
    const { rows: updatedCart }: { rows: ProductWithDetails[] } = await sql`
      SELECT 
        ci.*,
        p.id as product_id,
        p.name as product_name,
        p.slug,
        p.description,
        p.category,
        p.price as product_price,
        p.stock,
        p.rating,
        p.is_on_sale,
        p.is_new,
        p.is_bestseller,
        p.created_at as product_created_at,
        p.updated_at as product_updated_at,
        row_to_json(s) as specs,
        (
          SELECT json_agg(row_to_json(pi))
          FROM product_images pi
          WHERE pi.product_id = p.id
        ) as images,
        (
          SELECT json_agg(row_to_json(psc))
          FROM product_spec_colors psc
          WHERE psc.product_id = p.id
        ) as colors
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_specs s ON p.id = s.product_id
      WHERE ci.cart_id = ${cartId}
    `;

    const transformedItems = updatedCart.map((item: ProductWithDetails) => ({
      ...item,
      productDetails: {
        id: item.product_id,
        name: item.product_name,
        slug: item.slug,
        description: item.description,
        category: item.category,
        price: item.product_price,
        stock: item.stock,
        rating: item.rating,
        is_on_sale: item.is_on_sale,
        is_new: item.is_new,
        is_bestseller: item.is_bestseller,
        created_at: item.product_created_at,
        updated_at: item.product_updated_at,
        specs: item.specs,
        images: item.images || [],
        colors: item.colors || [],
      },
    }));

    return NextResponse.json({ items: transformedItems }, { status: 200 });
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
  }
}

/**
 * DELETE /api/cart/[id]
 * Remove a specific item from the cart.
 */
export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params;

    if (!id) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    await sql`
      DELETE FROM cart_items WHERE id = ${id}
    `;

    const cookieStore = await cookies();
    const cartId = cookieStore.get("cartId")?.value;
    const { rows: updatedCart } = await sql`
      SELECT 
        ci.*,
        p.id as product_id,
        p.name as product_name,
        p.slug,
        p.description,
        p.category,
        p.price as product_price,
        p.stock,
        p.rating,
        p.is_on_sale,
        p.is_new,
        p.is_bestseller,
        p.created_at as product_created_at,
        p.updated_at as product_updated_at,
        row_to_json(s) as specs,
        (
          SELECT json_agg(row_to_json(pi))
          FROM product_images pi
          WHERE pi.product_id = p.id
        ) as images,
        (
          SELECT json_agg(row_to_json(psc))
          FROM product_spec_colors psc
          WHERE psc.product_id = p.id
        ) as colors
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_specs s ON p.id = s.product_id
      WHERE ci.cart_id = ${cartId}
    `;

    const transformedItems = updatedCart.map((item: any) => ({
      ...item,
      productDetails: {
        id: item.product_id,
        name: item.product_name,
        slug: item.slug,
        description: item.description,
        category: item.category,
        price: item.product_price,
        stock: item.stock,
        rating: item.rating,
        is_on_sale: item.is_on_sale,
        is_new: item.is_new,
        is_bestseller: item.is_bestseller,
        created_at: item.product_created_at,
        updated_at: item.product_updated_at,
        specs: item.specs,
        images: item.images || [],
        colors: item.colors || [],
      },
    }));

    return NextResponse.json({ items: transformedItems }, { status: 200 });
  } catch (error) {
    console.error("Error deleting cart item:", error);
    return NextResponse.json({ error: "Failed to remove item" }, { status: 500 });
  }
}
