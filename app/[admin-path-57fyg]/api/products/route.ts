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
      return NextResponse.json({ error: 'Необхідна авторизація' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validation = safeValidateInput(productFiltersSchema, params);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Невірні параметри',
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
    return NextResponse.json({ error: 'Не вдалося завантажити товари' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Необхідна авторизація' }, { status: 401 });
    }

    if (!admin.permissions.includes('products.create')) {
      return NextResponse.json({ error: 'Недостатньо прав для створення товарів' }, { status: 403 });
    }

    const body = await request.json();

    const validation = safeValidateInput(productSchema, body);
    if (!validation.success) {
      console.error('Product validation errors:', JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({
        error: 'Помилка валідації',
        errors: formatValidationErrors(validation.error),
        details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      }, { status: 400 });
    }

    const data = validation.data;

    // Check for duplicate name within the same category
    const categoryUkr = getCategoryUkrainian(data.category);
    const existingNameResult = await db.query`
      SELECT id FROM products WHERE LOWER(name) = LOWER(${data.name}) AND category = ${categoryUkr}
    `;

    if (existingNameResult.rows.length > 0) {
      return NextResponse.json({
        error: 'Товар з такою назвою вже існує в цій категорії',
        errors: { name: 'Товар з такою назвою вже існує в цій категорії' },
      }, { status: 400 });
    }

    // Auto-generate slug with category name for uniqueness
    const baseSlug = body.slug || slugify(data.name, { lower: true, strict: true });
    const categorySlug = data.category.replace(/_/g, '-'); // corner_sofas -> corner-sofas

    // Always include category in slug for unique URLs across categories
    let slug = baseSlug.endsWith(`-${categorySlug}`) ? baseSlug : `${baseSlug}-${categorySlug}`;

    // Update data with the slug
    data.slug = slug;

    // Insert product (category already converted to Ukrainian above)
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
    return NextResponse.json({ error: 'Не вдалося створити товар. Спробуйте ще раз.' }, { status: 500 });
  }
}

// Helper function to insert category-specific specs
// Uses the actual database column structure: individual columns for dimensions/materials, not JSON
async function insertProductSpecs(productId: number, category: string, specs: Record<string, unknown>) {
  // Skip if category not in our known list
  if (!SPEC_TABLES[category]) return;

  // Extract dimensions (could be object or individual fields) - use 0 as default for NOT NULL columns
  const dimensions = specs.dimensions as Record<string, unknown> | undefined;
  const dimLength = Number(dimensions?.length ?? specs.dimensions_length ?? 0);
  const dimWidth = Number(dimensions?.width ?? specs.dimensions_width ?? 0);
  const dimDepth = Number(dimensions?.depth ?? specs.dimensions_depth ?? 0);
  const dimHeight = Number(dimensions?.height ?? specs.dimensions_height ?? 0);
  const sleepingArea = dimensions?.sleeping_area as Record<string, unknown> | undefined;
  const sleepingWidth = Number(sleepingArea?.width ?? specs.dimensions_sleeping_area_width ?? 0);
  const sleepingLength = Number(sleepingArea?.length ?? specs.dimensions_sleeping_area_length ?? 0);

  // Extract material (could be object or individual fields) - use empty string for NOT NULL columns
  const material = specs.material as Record<string, unknown> | string | undefined;
  const materialType = (typeof material === 'object' ? material?.type : material) ?? specs.material_type ?? '';
  const materialComposition = (typeof material === 'object' ? material?.composition : null) ?? specs.material_composition ?? '';
  const materialCovers = (typeof material === 'object' ? material?.covers : null) ?? specs.material_covers ?? '';
  const materialBackrestFilling = (typeof material === 'object' ? material?.backrest_filling : null) ?? specs.material_backrest_filling ?? '';

  // Extract inner_material (could be object or individual fields) - use empty string for NOT NULL columns
  const innerMaterial = specs.inner_material as Record<string, unknown> | undefined;
  const innerMaterialStructure = innerMaterial?.structure ?? specs.inner_material_structure ?? '';
  const innerMaterialCushionFilling = innerMaterial?.cushion_filling ?? specs.inner_material_cushion_filling ?? '';

  // Other common fields - use empty string for NOT NULL columns
  const constructionVal = (specs.construction as string) || '';
  const additionalFeaturesVal = (specs.additional_features as string) || '';
  const hasShelvesVal = Boolean(specs.has_shelves);
  const legHeightVal = (specs.leg_height as string) || null;
  const hasLiftMechanismVal = Boolean(specs.has_lift_mechanism);
  const types = specs.types as string[] | undefined;
  const typesVal = types && types.length > 0 ? `{${types.join(',')}}` : null;
  const armrestTypeVal = (specs.armrest_type as string) || null;
  const seatHeightVal = specs.seat_height ? Number(specs.seat_height) : null;

  switch (category) {
    case 'sofas': {
      await db.query`
        INSERT INTO sofa_specs (
          product_id, construction, dimensions_length, dimensions_depth, dimensions_height,
          dimensions_sleeping_area_width, dimensions_sleeping_area_length,
          material_type, material_composition, material_covers, material_backrest_filling,
          inner_material_structure, inner_material_cushion_filling,
          additional_features, has_shelves, leg_height, has_lift_mechanism, types,
          armrest_type, seat_height
        )
        VALUES (
          ${productId}, ${constructionVal}, ${dimLength}, ${dimDepth}, ${dimHeight},
          ${sleepingWidth}, ${sleepingLength},
          ${materialType}, ${materialComposition}, ${materialCovers}, ${materialBackrestFilling},
          ${innerMaterialStructure}, ${innerMaterialCushionFilling},
          ${additionalFeaturesVal}, ${hasShelvesVal}, ${legHeightVal}, ${hasLiftMechanismVal}, ${typesVal},
          ${armrestTypeVal}, ${seatHeightVal}
        )
      `;
      break;
    }

    case 'corner_sofas': {
      await db.query`
        INSERT INTO corner_sofa_specs (
          product_id, construction, dimensions_length, dimensions_width, dimensions_depth, dimensions_height,
          dimensions_sleeping_area_width, dimensions_sleeping_area_length,
          material_type, material_composition, material_covers, material_backrest_filling,
          inner_material_structure, inner_material_cushion_filling,
          additional_features, has_shelves, leg_height, has_lift_mechanism, types,
          armrest_type, seat_height
        )
        VALUES (
          ${productId}, ${constructionVal}, ${dimLength}, ${dimWidth}, ${dimDepth}, ${dimHeight},
          ${sleepingWidth}, ${sleepingLength},
          ${materialType}, ${materialComposition}, ${materialCovers}, ${materialBackrestFilling},
          ${innerMaterialStructure}, ${innerMaterialCushionFilling},
          ${additionalFeaturesVal}, ${hasShelvesVal}, ${legHeightVal}, ${hasLiftMechanismVal}, ${typesVal},
          ${armrestTypeVal}, ${seatHeightVal}
        )
      `;
      break;
    }

    case 'sofa_beds': {
      await db.query`
        INSERT INTO sofa_bed_specs (
          product_id, construction, dimensions_length, dimensions_depth, dimensions_height,
          dimensions_sleeping_area_width, dimensions_sleeping_area_length,
          material_type, material_composition, material_covers, material_backrest_filling,
          inner_material_structure, inner_material_cushion_filling,
          additional_features, has_shelves, leg_height, has_lift_mechanism, types,
          armrest_type, seat_height
        )
        VALUES (
          ${productId}, ${constructionVal}, ${dimLength}, ${dimDepth}, ${dimHeight},
          ${sleepingWidth}, ${sleepingLength},
          ${materialType}, ${materialComposition}, ${materialCovers}, ${materialBackrestFilling},
          ${innerMaterialStructure}, ${innerMaterialCushionFilling},
          ${additionalFeaturesVal}, ${hasShelvesVal}, ${legHeightVal}, ${hasLiftMechanismVal}, ${typesVal},
          ${armrestTypeVal}, ${seatHeightVal}
        )
      `;
      break;
    }

    case 'beds': {
      const headboardType = (specs.headboard_type as string) || null;
      const storageOptions = (specs.storage_options as string) || null;
      await db.query`
        INSERT INTO bed_specs (
          product_id, construction, dimensions_length, dimensions_depth, dimensions_height,
          dimensions_sleeping_area_width, dimensions_sleeping_area_length,
          material, headboard_type, storage_options, types
        )
        VALUES (
          ${productId}, ${constructionVal}, ${dimLength}, ${dimDepth}, ${dimHeight},
          ${sleepingWidth}, ${sleepingLength},
          ${materialType}, ${headboardType}, ${storageOptions}, ${typesVal}
        )
      `;
      break;
    }

    case 'mattresses': {
      const coreType = (specs.core_type as string) || (specs.type as string) || null;
      const hardness = (specs.hardness as string) || (specs.firmness as string) || null;
      await db.query`
        INSERT INTO mattress_specs (
          product_id, dimensions_length, dimensions_width, dimensions_height,
          dimensions_sleeping_area_width, dimensions_sleeping_area_length,
          material, core_type, hardness, types
        )
        VALUES (
          ${productId}, ${dimLength}, ${dimWidth}, ${dimHeight},
          ${sleepingWidth}, ${sleepingLength},
          ${materialType}, ${coreType}, ${hardness}, ${typesVal}
        )
      `;
      break;
    }

    case 'tables': {
      const shape = (specs.shape as string) || null;
      const extendable = Boolean(specs.extendable);
      await db.query`
        INSERT INTO table_specs (
          product_id, dimensions_length, dimensions_width, dimensions_depth, dimensions_height,
          material, shape, extendable, types
        )
        VALUES (
          ${productId}, ${dimLength}, ${dimWidth}, ${dimDepth}, ${dimHeight},
          ${materialType}, ${shape}, ${extendable}, ${typesVal}
        )
      `;
      break;
    }

    case 'chairs': {
      const upholstery = (specs.upholstery as string) || null;
      const weightCapacity = specs.weight_capacity ? Number(specs.weight_capacity) : null;
      await db.query`
        INSERT INTO chair_specs (
          product_id, dimensions_length, dimensions_width, dimensions_depth, dimensions_height,
          material, upholstery, seat_height, weight_capacity, types
        )
        VALUES (
          ${productId}, ${dimLength}, ${dimWidth}, ${dimDepth}, ${dimHeight},
          ${materialType}, ${upholstery}, ${seatHeightVal}, ${weightCapacity}, ${typesVal}
        )
      `;
      break;
    }

    case 'wardrobes': {
      const doorCount = specs.door_count ? Number(specs.door_count) : null;
      const doorType = (specs.door_type as string) || null;
      const internalLayout = (specs.internal_layout as string) || null;
      await db.query`
        INSERT INTO wardrobe_specs (
          product_id, dimensions_length, dimensions_width, dimensions_depth, dimensions_height,
          material, door_count, door_type, internal_layout, types
        )
        VALUES (
          ${productId}, ${dimLength}, ${dimWidth}, ${dimDepth}, ${dimHeight},
          ${materialType}, ${doorCount}, ${doorType}, ${internalLayout}, ${typesVal}
        )
      `;
      break;
    }

    case 'accessories': {
      const mountingType = (specs.mounting_type as string) || null;
      const shelfCount = specs.shelf_count ? Number(specs.shelf_count) : null;
      await db.query`
        INSERT INTO accessory_specs (
          product_id, dimensions_length, dimensions_width, dimensions_depth, dimensions_height,
          material, mounting_type, shelf_count, types
        )
        VALUES (
          ${productId}, ${dimLength}, ${dimWidth}, ${dimDepth}, ${dimHeight},
          ${materialType}, ${mountingType}, ${shelfCount}, ${typesVal}
        )
      `;
      break;
    }
  }
}
