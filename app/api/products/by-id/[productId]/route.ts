// app/api/products/by-id/[productId]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const productIdNum = parseInt(productId);

    if (isNaN(productIdNum)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Get product with images
    const product = await db.query(
      `SELECT
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.sale_price,
        p.category,
        p.subcategory,
        p.stock_quantity,
        p.is_featured,
        p.is_on_sale,
        p.is_new,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'display_order', pi.display_order
            ) ORDER BY pi.display_order, pi.is_primary DESC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.id = $1
      GROUP BY p.id`,
      [productIdNum]
    );

    if (product.rows.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product.rows[0]);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
