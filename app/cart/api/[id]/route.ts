// app/api/cart/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { cookies } from "next/headers";
import { CartItem, ProductWithImages, ProductSpecs, ProductImage, ProductColor } from "@/app/lib/definitions";
import { handleApiError } from "@/app/lib/error";

// Interface to represent the raw cart item data from the database
interface CartItemWithProductData {
  id: string;
  cart_id: string;
  product_id: number;
  quantity: number;
  color: string;
  product_name: string;
  slug: string;
  description: string;
  category: string;
  product_price: number;
  stock: number;
  rating: number;
  reviews: number; 
  is_on_sale: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  product_created_at: string;
  product_updated_at: string;
  specs: ProductSpecs | null;
  images: ProductImage[];
  colors: ProductColor[];
}

/**
 * Transforms raw cart item data into the format defined in the app's type definitions
 */
function transformCartItems(items: CartItemWithProductData[]): CartItem[] {
  return items.map((item) => {
    const productDetails: ProductWithImages = {
      id: item.product_id,
      name: item.product_name,
      slug: item.slug,
      description: item.description,
      category: item.category,
      price: item.product_price,
      stock: item.stock,
      rating: item.rating,
      reviews: 0, // Set default value since the column doesn't exist in DB
      is_on_sale: item.is_on_sale,
      is_new: item.is_new,
      is_bestseller: item.is_bestseller,
      created_at: item.product_created_at,
      updated_at: item.product_updated_at,
      specs: item.specs,
      images: item.images || [],
      colors: item.colors || []
    };

    const cartItem: CartItem = {
      id: item.id,
      product_id: item.product_id,
      slug: item.slug,
      name: item.product_name,
      price: item.product_price,
      quantity: item.quantity,
      color: item.color,
      image_url: item.images?.[0]?.image_url || '',
      productDetails,
      colors: item.colors
    };

    return cartItem;
  });
}

/**
 * PATCH /api/cart/[id]
 * Update the quantity of a cart item.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = ((await params).id);
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
    const { rows: updatedCart } = await sql<CartItemWithProductData>`
      SELECT 
        ci.id,
        ci.cart_id,
        ci.product_id,
        ci.quantity,
        ci.color,
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

    const transformedItems = transformCartItems(updatedCart);

    return NextResponse.json({ items: transformedItems }, { status: 200 });
  } catch (error) {
    return handleApiError(error, "Failed to update cart item quantity");
  }
}

/**
 * DELETE /api/cart/[id]
 * Remove a specific item from the cart.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = ((await params).id);

    if (!id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await sql`
      DELETE FROM cart_items WHERE id = ${id}
    `;

    const cookieStore = await cookies();
    const cartId = cookieStore.get("cartId")?.value;
    const { rows: updatedCart } = await sql<CartItemWithProductData>`
      SELECT 
        ci.id,
        ci.cart_id,
        ci.product_id,
        ci.quantity,
        ci.color,
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

    const transformedItems = transformCartItems(updatedCart);

    return NextResponse.json({ items: transformedItems }, { status: 200 });
  } catch (error) {
    return handleApiError(error, "Failed to remove item from cart");
  }
}