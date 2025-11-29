import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ProductWithImages } from '@/app/lib/definitions';
import {
  findCategorySuggestions,
  findFilterSuggestions,
  CategorySuggestion,
  FilterSuggestion
} from '@/app/lib/search-keywords';

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
      SELECT
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
        json_agg(
          json_build_object(
            'id', pi.id,
            'image_url', pi.image_url,
            'alt', pi.alt,
            'is_primary', pi.is_primary
          )
        ) FILTER (WHERE pi.id IS NOT NULL) as images,
        json_agg(
          json_build_object(
            'product_id', pc.product_id,
            'color', pc.color,
            'image_url', pc.image_url
          )
        ) FILTER (WHERE pc.product_id IS NOT NULL) AS colors
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      LEFT JOIN product_spec_colors pc ON p.id = pc.product_id
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

    // Find category and filter suggestions based on search query
    const categorySuggestions = findCategorySuggestions(query.trim());
    const filterSuggestions = findFilterSuggestions(query.trim());

    return NextResponse.json({
      results: products,
      count: products.length,
      query: query.trim(),
      suggestions: {
        categories: categorySuggestions.slice(0, 3), // Limit to 3 category suggestions
        filters: filterSuggestions.slice(0, 5) // Limit to 5 filter suggestions
      }
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
