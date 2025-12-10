/**
 * Admin Single Product API Route
 * GET - Get single product with all details (images, colors, specs)
 * PUT - Update product with all related data
 * DELETE - Delete product with all related data
 * POST - Handle form-based delete (for DeleteButton component)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAdminAction } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import {
  productSchema,
  safeValidateInput,
  formatValidationErrors,
} from '@/app/lib/admin-validation';
import { invalidateCategoriesCache } from '@/app/lib/category-utils';
import { validateCsrfRequest } from '@/app/lib/csrf-protection';
import slugify from 'slugify';

// Mapping from Ukrainian category names to English enum values
const CATEGORY_MAP: Record<string, string> = {
  'диван': 'sofas',
  'кутовий диван': 'corner_sofas',
  'диван-ліжко': 'sofa_beds',
  'ліжко': 'beds',
  'стіл': 'tables',
  'стілець': 'chairs',
  'матрац': 'mattresses',
  'шафа': 'wardrobes',
  'аксесуар': 'accessories',
  'дивани': 'sofas',
  'кутові дивани': 'corner_sofas',
  'дивани-ліжка': 'sofa_beds',
  'ліжка': 'beds',
  'столи': 'tables',
  'стільці': 'chairs',
  'матраци': 'mattresses',
  'шафи': 'wardrobes',
  'аксесуари': 'accessories',
  'sofas': 'sofas',
  'corner_sofas': 'corner_sofas',
  'sofa_beds': 'sofa_beds',
  'beds': 'beds',
  'tables': 'tables',
  'chairs': 'chairs',
  'mattresses': 'mattresses',
  'wardrobes': 'wardrobes',
  'accessories': 'accessories',
};

function normalizeCategory(category: string): string {
  const normalized = category?.toLowerCase().trim();
  return CATEGORY_MAP[normalized] || category;
}

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

interface RouteParams {
  params: Promise<{ productId: string }>;
}

// GET - Fetch single product with all details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Необхідна авторизація' }, { status: 401 });
    }

    const { productId } = await params;
    const id = parseInt(productId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Невірний ID товару' }, { status: 400 });
    }

    // Get product
    const productResult = await db.query`
      SELECT * FROM products WHERE id = ${id}
    `;

    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: 'Товар не знайдено' }, { status: 404 });
    }

    const product = productResult.rows[0];

    // Get images
    const imagesResult = await db.query`
      SELECT id, image_url, alt, is_primary
      FROM product_images
      WHERE product_id = ${id}
      ORDER BY is_primary DESC, id ASC
    `;

    // Get colors
    const colorsResult = await db.query`
      SELECT color, image_url
      FROM product_spec_colors
      WHERE product_id = ${id}
    `;

    // Normalize category and get specs
    const normalizedCategory = normalizeCategory(product.category);
    const specs = await getProductSpecs(id, normalizedCategory);

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        category: normalizedCategory,
        images: imagesResult.rows,
        colors: colorsResult.rows,
        specs,
      },
    });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'Не вдалося завантажити товар' }, { status: 500 });
  }
}

// PUT - Update product with all related data
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate CSRF token (Task 6)
    const csrfValid = await validateCsrfRequest(request);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF validation failed', code: 'CSRF_INVALID' }, { status: 403 });
    }

    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Необхідна авторизація' }, { status: 401 });
    }

    if (!admin.permissions.includes('products.update')) {
      return NextResponse.json({ error: 'Недостатньо прав для оновлення товарів' }, { status: 403 });
    }

    const { productId } = await params;
    const id = parseInt(productId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Невірний ID товару' }, { status: 400 });
    }

    // Check if product exists - fetch all fields we want to track for changelog
    const existingProduct = await db.query`
      SELECT id, category, name, slug, description, price, sale_price,
             stock, is_on_sale, is_new, is_bestseller
      FROM products WHERE id = ${id}
    `;

    if (existingProduct.rows.length === 0) {
      return NextResponse.json({ error: 'Товар не знайдено' }, { status: 404 });
    }

    const body = await request.json();

    // Auto-generate slug if not provided
    if (!body.slug && body.name) {
      body.slug = slugify(body.name, { lower: true, strict: true });
    }

    // Debug: log the incoming category value
    console.log('Incoming product data - category:', body.category, 'type:', typeof body.category);

    const validation = safeValidateInput(productSchema, body);
    if (!validation.success) {
      console.error('Product validation errors:', JSON.stringify(validation.error.issues, null, 2));
      console.error('Received body.category:', body.category);
      return NextResponse.json({
        error: 'Помилка валідації',
        errors: formatValidationErrors(validation.error),
        details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      }, { status: 400 });
    }

    const data = validation.data;

    // Check for duplicate name within the same category (excluding current product)
    const categoryUkr = getCategoryUkrainian(data.category);
    const duplicateNameResult = await db.query`
      SELECT id FROM products WHERE LOWER(name) = LOWER(${data.name}) AND category = ${categoryUkr} AND id != ${id}
    `;

    if (duplicateNameResult.rows.length > 0) {
      return NextResponse.json({
        error: 'Товар з такою назвою вже існує в цій категорії',
        errors: { name: 'Товар з такою назвою вже існує в цій категорії' },
      }, { status: 400 });
    }

    // Auto-generate slug - only append category if base slug already exists (excluding current product)
    const baseSlug = body.slug || slugify(data.name, { lower: true, strict: true });

    // Check if base slug already exists in database (exclude current product)
    const existingSlugResult = await db.query`
      SELECT id FROM products WHERE slug = ${baseSlug} AND id != ${id}
    `;

    let slug = baseSlug;
    if (existingSlugResult.rows.length > 0) {
      // Base slug exists, append category for uniqueness
      const categorySlug = data.category.replace(/_/g, '-'); // corner_sofas -> corner-sofas
      slug = `${baseSlug}-${categorySlug}`;
    }

    // Update data with the slug
    data.slug = slug;

    const oldCategory = existingProduct.rows[0].category;
    const oldProduct = existingProduct.rows[0];

    // Fetch old images for changelog comparison
    const oldImagesResult = await db.query`
      SELECT image_url, alt, is_primary FROM product_images WHERE product_id = ${id}
    `;
    const oldImages = oldImagesResult.rows;

    // Update product (category already converted to Ukrainian above)
    await db.query`
      UPDATE products SET
        name = ${data.name},
        slug = ${data.slug},
        description = ${data.description},
        category = ${categoryUkr},
        price = ${data.price},
        sale_price = ${data.sale_price || null},
        stock = ${data.stock},
        is_on_sale = ${data.is_on_sale},
        is_new = ${data.is_new},
        is_bestseller = ${data.is_bestseller},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    // Update images - delete old and insert new
    await db.query`DELETE FROM product_images WHERE product_id = ${id}`;
    if (data.images && data.images.length > 0) {
      for (const image of data.images) {
        if (image.image_url) {
          await db.query`
            INSERT INTO product_images (product_id, image_url, alt, is_primary, color)
            VALUES (${id}, ${image.image_url}, ${image.alt || ''}, ${image.is_primary}, ${image.color || null})
          `;
        }
      }
    }

    // Update colors - delete old and insert new
    await db.query`DELETE FROM product_spec_colors WHERE product_id = ${id}`;
    if (data.colors && data.colors.length > 0) {
      for (const color of data.colors) {
        if (color.color && color.image_url) {
          await db.query`
            INSERT INTO product_spec_colors (product_id, color, image_url)
            VALUES (${id}, ${color.color}, ${color.image_url})
          `;
        }
      }
    }

    // Update specs - delete old specs if category changed
    if (oldCategory !== data.category) {
      await deleteSpecsByCategory(id, oldCategory);
    }

    // Delete existing specs for current category and insert new
    await deleteSpecsByCategory(id, data.category);

    if (data.specs) {
      console.log('Inserting specs for category:', data.category);
      console.log('Specs data received:', JSON.stringify(data.specs, null, 2));
      await insertProductSpecs(id, data.category, data.specs);
    } else {
      console.log('No specs data provided for product update');
    }

    // Calculate and log changes to changelog
    const changes = calculateChanges(oldProduct, data);

    // Calculate image changes
    const imageChanges = calculateImageChanges(oldImages, data.images || []);
    if (imageChanges) {
      changes.images = imageChanges;
    }

    if (Object.keys(changes).length > 0) {
      await db.query`
        INSERT INTO product_changelog (product_id, admin_id, admin_email, action, changes)
        VALUES (${id}, ${admin.id}, ${admin.email}, 'updated', ${JSON.stringify(changes)})
      `;
    }

    // Invalidate categories cache (Task 3)
    invalidateCategoriesCache();

    // Log action
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    await logAdminAction(
      admin.id,
      admin.email,
      'product_updated',
      'products',
      String(id),
      {
        old: { name: oldProduct.name, slug: oldProduct.slug },
        new: { name: data.name, slug: data.slug }
      },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'Товар успішно оновлено',
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Не вдалося оновити товар. Спробуйте ще раз.' }, { status: 500 });
  }
}

// DELETE - Delete product with all related data
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate CSRF token (Task 6)
    const csrfValid = await validateCsrfRequest(request);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF validation failed', code: 'CSRF_INVALID' }, { status: 403 });
    }

    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Необхідна авторизація' }, { status: 401 });
    }

    if (!admin.permissions.includes('products.delete')) {
      return NextResponse.json({ error: 'Недостатньо прав для видалення товарів' }, { status: 403 });
    }

    const { productId } = await params;
    const id = parseInt(productId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Невірний ID товару' }, { status: 400 });
    }

    // Get product info before deletion
    const productResult = await db.query`
      SELECT id, name, slug, category FROM products WHERE id = ${id}
    `;

    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: 'Товар не знайдено' }, { status: 404 });
    }

    const product = productResult.rows[0];

    // Normalize category from Ukrainian to English for specs deletion
    const normalizedCategory = normalizeCategory(product.category);

    // Delete related data first
    await db.query`DELETE FROM product_images WHERE product_id = ${id}`;
    await db.query`DELETE FROM product_spec_colors WHERE product_id = ${id}`;

    // Delete specs (using normalized English category name)
    await deleteSpecsByCategory(id, normalizedCategory);

    // Delete product
    await db.query`DELETE FROM products WHERE id = ${id}`;

    // Invalidate categories cache (Task 3)
    invalidateCategoriesCache();

    // Log action
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    await logAdminAction(
      admin.id,
      admin.email,
      'product_deleted',
      'products',
      String(id),
      { name: product.name, slug: product.slug },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'Товар успішно видалено',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Не вдалося видалити товар. Спробуйте ще раз.' }, { status: 500 });
  }
}

// POST - Handle form-based delete (used by DeleteButton component)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const formData = await request.formData();
  const method = formData.get('_method');

  if (method === 'DELETE') {
    return DELETE(request, { params });
  }

  return NextResponse.json({ error: 'Метод не дозволено' }, { status: 405 });
}

// Helper function to delete specs by category using template literals
async function deleteSpecsByCategory(productId: number, category: string) {
  switch (category) {
    case 'sofas':
      await db.query`DELETE FROM sofa_specs WHERE product_id = ${productId}`;
      break;
    case 'corner_sofas':
      await db.query`DELETE FROM corner_sofa_specs WHERE product_id = ${productId}`;
      break;
    case 'sofa_beds':
      await db.query`DELETE FROM sofa_bed_specs WHERE product_id = ${productId}`;
      break;
    case 'beds':
      await db.query`DELETE FROM bed_specs WHERE product_id = ${productId}`;
      break;
    case 'tables':
      await db.query`DELETE FROM table_specs WHERE product_id = ${productId}`;
      break;
    case 'chairs':
      await db.query`DELETE FROM chair_specs WHERE product_id = ${productId}`;
      break;
    case 'mattresses':
      await db.query`DELETE FROM mattress_specs WHERE product_id = ${productId}`;
      break;
    case 'wardrobes':
      await db.query`DELETE FROM wardrobe_specs WHERE product_id = ${productId}`;
      break;
    case 'accessories':
      await db.query`DELETE FROM accessory_specs WHERE product_id = ${productId}`;
      break;
  }
}

// Helper function to get category-specific specs
async function getProductSpecs(productId: number, category: string) {
  let result;

  switch (category) {
    case 'sofas':
      result = await db.query`SELECT * FROM sofa_specs WHERE product_id = ${productId}`;
      break;
    case 'corner_sofas':
      result = await db.query`SELECT * FROM corner_sofa_specs WHERE product_id = ${productId}`;
      break;
    case 'sofa_beds':
      result = await db.query`SELECT * FROM sofa_bed_specs WHERE product_id = ${productId}`;
      break;
    case 'beds':
      result = await db.query`SELECT * FROM bed_specs WHERE product_id = ${productId}`;
      break;
    case 'tables':
      result = await db.query`SELECT * FROM table_specs WHERE product_id = ${productId}`;
      break;
    case 'chairs':
      result = await db.query`SELECT * FROM chair_specs WHERE product_id = ${productId}`;
      break;
    case 'mattresses':
      result = await db.query`SELECT * FROM mattress_specs WHERE product_id = ${productId}`;
      break;
    case 'wardrobes':
      result = await db.query`SELECT * FROM wardrobe_specs WHERE product_id = ${productId}`;
      break;
    case 'accessories':
      result = await db.query`SELECT * FROM accessory_specs WHERE product_id = ${productId}`;
      break;
    default:
      return null;
  }

  if (!result || result.rows.length === 0) return null;

  const row = result.rows[0];

  // Parse JSON fields
  const specs: Record<string, unknown> = { ...row };
  delete specs.id;
  delete specs.product_id;

  if (typeof specs.dimensions === 'string') {
    try {
      specs.dimensions = JSON.parse(specs.dimensions);
    } catch { /* ignore parse errors */ }
  }

  if (typeof specs.material === 'string' && specs.material.startsWith('{')) {
    try {
      specs.material = JSON.parse(specs.material);
    } catch { /* ignore parse errors */ }
  }

  if (typeof specs.inner_material === 'string') {
    try {
      specs.inner_material = JSON.parse(specs.inner_material);
    } catch { /* ignore parse errors */ }
  }

  if (typeof specs.types === 'string') {
    try {
      specs.types = JSON.parse(specs.types);
    } catch { /* ignore parse errors */ }
  }

  return specs;
}

// Helper function to insert category-specific specs
// Uses the actual database column structure: individual columns for dimensions/materials, not JSON
async function insertProductSpecs(productId: number, category: string, specs: Record<string, unknown>) {
  // Skip if category not in our known list
  if (!SPEC_TABLES[category]) return;

  // Log incoming specs for debugging
  console.log('insertProductSpecs called with:', { productId, category, specsKeys: Object.keys(specs) });

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

// Helper function to normalize values for comparison
function normalizeValue(value: unknown, field: string): unknown {
  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Numeric fields - convert to number for comparison
  const numericFields = ['price', 'sale_price', 'stock'];
  if (numericFields.includes(field)) {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  // Boolean fields
  const booleanFields = ['is_on_sale', 'is_new', 'is_bestseller'];
  if (booleanFields.includes(field)) {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 0 || value === '0') return false;
    return Boolean(value);
  }

  // String fields - trim whitespace
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
}

// Helper function to calculate changes between old and new product data
function calculateChanges(
  oldProduct: Record<string, unknown>,
  newData: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  // Fields to track for changes (excluding category which needs special handling)
  const fieldsToTrack = [
    'name', 'slug', 'description', 'price', 'sale_price',
    'stock', 'is_on_sale', 'is_new', 'is_bestseller'
  ];

  for (const field of fieldsToTrack) {
    const oldValue = oldProduct[field];
    const newValue = newData[field];

    // Normalize values for proper comparison
    const oldNormalized = normalizeValue(oldValue, field);
    const newNormalized = normalizeValue(newValue, field);

    // Only add to changes if values are actually different
    if (oldNormalized !== newNormalized) {
      // For objects/arrays, use JSON comparison
      if (typeof oldNormalized === 'object' || typeof newNormalized === 'object') {
        if (JSON.stringify(oldNormalized) !== JSON.stringify(newNormalized)) {
          changes[field] = {
            old: oldNormalized,
            new: newNormalized
          };
        }
      } else {
        changes[field] = {
          old: oldNormalized,
          new: newNormalized
        };
      }
    }
  }

  // Special handling for category - compare normalized versions
  // to avoid logging changes that are just normalization (e.g., "Диван" -> "sofas")
  const oldCategoryNormalized = normalizeCategory(String(oldProduct.category || ''));
  const newCategoryNormalized = normalizeCategory(String(newData.category || ''));
  if (oldCategoryNormalized !== newCategoryNormalized) {
    changes.category = {
      old: oldProduct.category,
      new: newData.category
    };
  }

  return changes;
}

// Helper function to calculate image changes
interface ImageData {
  image_url: string;
  alt?: string;
  is_primary?: boolean;
}

function calculateImageChanges(
  oldImages: ImageData[],
  newImages: ImageData[]
): { old: string[]; new: string[] } | null {
  // Extract just the URLs for comparison
  const oldUrls = oldImages.map(img => img.image_url).sort();
  const newUrls = newImages.filter(img => img.image_url).map(img => img.image_url).sort();

  // Check if images changed
  if (JSON.stringify(oldUrls) !== JSON.stringify(newUrls)) {
    return {
      old: oldUrls,
      new: newUrls
    };
  }

  return null;
}
