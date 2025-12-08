/**
 * Admin Products API Route
 * GET - List products with filters
 * POST - Create new product with images, colors, and specs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAdminAction } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import {
  productFiltersSchema,
  productSchema,
  safeValidateInput,
  formatValidationErrors,
} from '@/app/lib/admin-validation';
import slugify from 'slugify';

// Spec table names for each category
const SPEC_TABLES: Record<string, string> = {
  sofas: 'sofa_specs',
  corner_sofas: 'corner_sofa_specs',
  sofa_beds: 'sofa_bed_specs',
  beds: 'bed_specs',
  tables: 'table_specs',
  chairs: 'chair_specs',
  mattresses: 'mattress_specs',
  wardrobes: 'wardrobe_specs',
  accessories: 'accessory_specs',
};

// Map English category to Ukrainian for database storage
const CATEGORY_TO_UKRAINIAN: Record<string, string> = {
  sofas: 'Диван',
  corner_sofas: 'Кутовий Диван',
  sofa_beds: 'Диван-Ліжко',
  beds: 'Ліжко',
  tables: 'Стіл',
  chairs: 'Стілець',
  mattresses: 'Матрац',
  wardrobes: 'Шафа',
  accessories: 'Аксесуар',
};

function getCategoryUkrainian(englishCategory: string): string {
  return CATEGORY_TO_UKRAINIAN[englishCategory] || englishCategory;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validation = safeValidateInput(productFiltersSchema, params);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid parameters',
        errors: formatValidationErrors(validation.error),
      }, { status: 400 });
    }

    const { page, limit, category, search, sort, order, low_stock } = validation.data;
    const offset = (page - 1) * limit;

    // Build query conditions
    let whereClause = 'WHERE 1=1';
    const values: unknown[] = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND category = $${paramIndex++}`;
      values.push(category);
    }

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR slug ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (low_stock) {
      whereClause += ` AND stock < 10`;
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = Number(countResult.rows[0]?.total) || 0;

    // Get products
    const allowedSortColumns = ['name', 'price', 'stock', 'category', 'updated_at', 'created_at', 'is_on_sale', 'is_new', 'is_bestseller'];
    const sortColumn = allowedSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const productsQuery = `
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller, created_at, updated_at
      FROM products
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const productsResult = await db.query(productsQuery, [...values, limit, offset]);

    return NextResponse.json({
      success: true,
      products: productsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!admin.permissions.includes('products.create')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();

    // Auto-generate slug if not provided
    if (!body.slug && body.name) {
      body.slug = slugify(body.name, { lower: true, strict: true });
    }

    const validation = safeValidateInput(productSchema, body);
    if (!validation.success) {
      console.error('Product validation errors:', JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({
        error: 'Validation failed',
        errors: formatValidationErrors(validation.error),
        details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      }, { status: 400 });
    }

    const data = validation.data;

    // Check for duplicate slug
    const existingResult = await db.query`
      SELECT id FROM products WHERE slug = ${data.slug}
    `;

    if (existingResult.rows.length > 0) {
      return NextResponse.json({
        error: 'A product with this slug already exists',
      }, { status: 400 });
    }

    // Insert product (save category in Ukrainian)
    const categoryUkr = getCategoryUkrainian(data.category);
    const result = await db.query`
      INSERT INTO products (name, slug, description, category, price, sale_price, stock, is_on_sale, is_new, is_bestseller)
      VALUES (${data.name}, ${data.slug}, ${data.description}, ${categoryUkr}, ${data.price}, ${data.sale_price || null}, ${data.stock}, ${data.is_on_sale}, ${data.is_new}, ${data.is_bestseller})
      RETURNING id, name, slug, category, price, stock
    `;

    const newProduct = result.rows[0];
    const productId = newProduct.id;

    // Insert images
    if (data.images && data.images.length > 0) {
      for (const image of data.images) {
        if (image.image_url) {
          await db.query`
            INSERT INTO product_images (product_id, image_url, alt, is_primary, color)
            VALUES (${productId}, ${image.image_url}, ${image.alt || ''}, ${image.is_primary}, ${image.color || null})
          `;
        }
      }
    }

    // Insert colors
    if (data.colors && data.colors.length > 0) {
      for (const color of data.colors) {
        if (color.color && color.image_url) {
          await db.query`
            INSERT INTO product_spec_colors (product_id, color, image_url)
            VALUES (${productId}, ${color.color}, ${color.image_url})
          `;
        }
      }
    }

    // Insert category-specific specs
    if (data.specs) {
      await insertProductSpecs(productId, data.category, data.specs);
    }

    // Log action
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    await logAdminAction(
      admin.id,
      admin.email,
      'product_created',
      'products',
      String(newProduct.id),
      { name: newProduct.name, slug: newProduct.slug },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      product: newProduct,
    }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

// Helper function to insert category-specific specs
async function insertProductSpecs(productId: number, category: string, specs: Record<string, unknown>) {
  const specTable = SPEC_TABLES[category];
  if (!specTable) return;

  const dimensions = specs.dimensions as Record<string, unknown> | undefined;
  const material = specs.material;
  const innerMaterial = specs.inner_material as Record<string, unknown> | undefined;
  const types = specs.types as string[] | undefined;

  // Build spec data based on category
  switch (category) {
    case 'sofas':
    case 'corner_sofas':
    case 'sofa_beds': {
      await db.query(`
        INSERT INTO ${specTable} (
          product_id, construction, dimensions, material, inner_material,
          additional_features, has_shelves, leg_height, has_lift_mechanism, types,
          armrest_type, seat_height
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        productId,
        specs.construction || null,
        dimensions ? JSON.stringify(dimensions) : null,
        typeof material === 'object' ? JSON.stringify(material) : null,
        innerMaterial ? JSON.stringify(innerMaterial) : null,
        specs.additional_features || null,
        specs.has_shelves || false,
        specs.leg_height || null,
        specs.has_lift_mechanism || false,
        types ? JSON.stringify(types) : null,
        specs.armrest_type || null,
        specs.seat_height || null
      ]);
      break;
    }

    case 'beds': {
      await db.query`
        INSERT INTO bed_specs (
          product_id, construction, dimensions, material, headboard_type,
          storage_options, types
        )
        VALUES (
          ${productId},
          ${specs.construction || null},
          ${dimensions ? JSON.stringify(dimensions) : null},
          ${typeof material === 'string' ? material : null},
          ${specs.headboard_type || null},
          ${specs.storage_options || null},
          ${types ? JSON.stringify(types) : null}
        )
      `;
      break;
    }

    case 'mattresses': {
      await db.query`
        INSERT INTO mattress_specs (
          product_id, type, firmness, thickness, core_type, hardness,
          dimensions, types
        )
        VALUES (
          ${productId},
          ${specs.type || null},
          ${specs.firmness || null},
          ${specs.thickness || null},
          ${specs.core_type || null},
          ${specs.hardness || null},
          ${dimensions ? JSON.stringify(dimensions) : null},
          ${types ? JSON.stringify(types) : null}
        )
      `;
      break;
    }

    case 'tables': {
      await db.query`
        INSERT INTO table_specs (
          product_id, shape, extendable, material, dimensions, types
        )
        VALUES (
          ${productId},
          ${specs.shape || null},
          ${specs.extendable || false},
          ${typeof material === 'string' ? material : null},
          ${dimensions ? JSON.stringify(dimensions) : null},
          ${types ? JSON.stringify(types) : null}
        )
      `;
      break;
    }

    case 'chairs': {
      await db.query`
        INSERT INTO chair_specs (
          product_id, upholstery, seat_height, weight_capacity, material,
          dimensions, types
        )
        VALUES (
          ${productId},
          ${specs.upholstery || null},
          ${specs.seat_height || null},
          ${specs.weight_capacity || null},
          ${typeof material === 'string' ? material : null},
          ${dimensions ? JSON.stringify(dimensions) : null},
          ${types ? JSON.stringify(types) : null}
        )
      `;
      break;
    }

    case 'wardrobes': {
      await db.query`
        INSERT INTO wardrobe_specs (
          product_id, door_count, door_type, internal_layout, material,
          dimensions, types
        )
        VALUES (
          ${productId},
          ${specs.door_count || null},
          ${specs.door_type || null},
          ${specs.internal_layout || null},
          ${typeof material === 'string' ? material : null},
          ${dimensions ? JSON.stringify(dimensions) : null},
          ${types ? JSON.stringify(types) : null}
        )
      `;
      break;
    }

    case 'accessories': {
      await db.query`
        INSERT INTO accessory_specs (
          product_id, mounting_type, shelf_count, material, dimensions, types
        )
        VALUES (
          ${productId},
          ${specs.mounting_type || null},
          ${specs.shelf_count || null},
          ${typeof material === 'string' ? material : null},
          ${dimensions ? JSON.stringify(dimensions) : null},
          ${types ? JSON.stringify(types) : null}
        )
      `;
      break;
    }
  }
}
