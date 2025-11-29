import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ProductWithImages } from '@/app/lib/definitions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        results: [],
        count: 0,
        message: 'Query must be at least 2 characters'
      });
    }

    const searchTerm = `%${query.trim()}%`;

    // Search products by name, description, or category
    const result = await sql`
      SELECT DISTINCT
        p.id,
        p.name,
        p.slug,
        p.description,
        p.category,
        p.price,
        p.stock,
        p.rating,
        p.reviews,
        p.is_on_sale,
        p.is_new,
        p.is_bestseller,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pi.id,
              'url', pi.image_url,
              'alt', pi.alt_text,
              'is_primary', pi.is_primary
            )
            ORDER BY pi.is_primary DESC, pi.id
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', psc.id,
              'name', psc.color_name,
              'hex', psc.color_hex
            )
            ORDER BY psc.id
          ) FILTER (WHERE psc.id IS NOT NULL),
          '[]'
        ) as colors
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      LEFT JOIN product_spec_colors psc ON p.id = psc.product_id
      WHERE
        (p.name ILIKE ${searchTerm} OR
         p.description ILIKE ${searchTerm} OR
         p.category ILIKE ${searchTerm})
        AND p.stock > 0
      GROUP BY p.id, p.name, p.slug, p.description, p.category,
               p.price, p.stock, p.rating, p.reviews,
               p.is_on_sale, p.is_new, p.is_bestseller,
               p.created_at, p.updated_at
      ORDER BY
        -- Prioritize exact matches
        CASE
          WHEN p.name ILIKE ${query.trim()} THEN 1
          WHEN p.name ILIKE ${searchTerm} THEN 2
          ELSE 3
        END,
        -- Then by relevance indicators
        p.is_bestseller DESC,
        p.is_new DESC,
        p.rating DESC,
        p.name ASC
      LIMIT ${limit}
    `;

    const products: ProductWithImages[] = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      category: row.category,
      price: parseFloat(row.price),
      stock: row.stock,
      rating: parseFloat(row.rating || '0'),
      reviews: row.reviews,
      is_on_sale: row.is_on_sale,
      is_new: row.is_new,
      is_bestseller: row.is_bestseller,
      created_at: row.created_at,
      updated_at: row.updated_at,
      images: Array.isArray(row.images) ? row.images : [],
      colors: Array.isArray(row.colors) ? row.colors : [],
      specs: null,
    }));

    return NextResponse.json({
      results: products,
      count: products.length,
      query: query.trim()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform search',
        results: [],
        count: 0
      },
      { status: 500 }
    );
  }
}
