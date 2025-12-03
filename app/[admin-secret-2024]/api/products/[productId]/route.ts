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

interface RouteParams {
  params: Promise<{ productId: string }>;
}

// GET - Fetch single product with all details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await params;
    const id = parseInt(productId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    // Get product
    const productResult = await db.query`
      SELECT * FROM products WHERE id = ${id}
    `;

    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
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

    // Get specs based on category
    const specs = await getProductSpecs(id, product.category);

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        images: imagesResult.rows,
        colors: colorsResult.rows,
        specs,
      },
    });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT - Update product with all related data
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!admin.permissions.includes('products.update')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { productId } = await params;
    const id = parseInt(productId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    // Check if product exists
    const existingProduct = await db.query`
      SELECT id, category, name, slug FROM products WHERE id = ${id}
    `;

    if (existingProduct.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
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

    // Check for duplicate slug (excluding current product)
    const duplicateResult = await db.query`
      SELECT id FROM products WHERE slug = ${data.slug} AND id != ${id}
    `;

    if (duplicateResult.rows.length > 0) {
      return NextResponse.json({
        error: 'A product with this slug already exists',
      }, { status: 400 });
    }

    const oldCategory = existingProduct.rows[0].category;
    const oldProduct = existingProduct.rows[0];

    // Update product
    await db.query`
      UPDATE products SET
        name = ${data.name},
        slug = ${data.slug},
        description = ${data.description},
        category = ${data.category},
        price = ${data.price},
        sale_price = ${data.sale_price || null},
        stock = ${data.stock},
        is_on_sale = ${data.is_on_sale},
        is_new = ${data.is_new},
        is_bestseller = ${data.is_bestseller},
        is_featured = ${data.is_featured || false},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    // Update images - delete old and insert new
    await db.query`DELETE FROM product_images WHERE product_id = ${id}`;
    if (data.images && data.images.length > 0) {
      for (const image of data.images) {
        if (image.image_url) {
          await db.query`
            INSERT INTO product_images (product_id, image_url, alt, is_primary)
            VALUES (${id}, ${image.image_url}, ${image.alt || ''}, ${image.is_primary})
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
      const oldSpecTable = SPEC_TABLES[oldCategory];
      if (oldSpecTable) {
        await db.query(`DELETE FROM ${oldSpecTable} WHERE product_id = $1`, [id]);
      }
    }

    // Delete existing specs for current category and insert new
    const specTable = SPEC_TABLES[data.category];
    if (specTable) {
      await db.query(`DELETE FROM ${specTable} WHERE product_id = $1`, [id]);
    }

    if (data.specs) {
      await insertProductSpecs(id, data.category, data.specs);
    }

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
      message: 'Product updated successfully',
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE - Delete product with all related data
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!admin.permissions.includes('products.delete')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { productId } = await params;
    const id = parseInt(productId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    // Get product info before deletion
    const productResult = await db.query`
      SELECT id, name, slug, category FROM products WHERE id = ${id}
    `;

    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = productResult.rows[0];

    // Delete related data first
    await db.query`DELETE FROM product_images WHERE product_id = ${id}`;
    await db.query`DELETE FROM product_spec_colors WHERE product_id = ${id}`;

    // Delete specs
    const specTable = SPEC_TABLES[product.category];
    if (specTable) {
      await db.query(`DELETE FROM ${specTable} WHERE product_id = $1`, [id]);
    }

    // Delete product
    await db.query`DELETE FROM products WHERE id = ${id}`;

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
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

// POST - Handle form-based delete (used by DeleteButton component)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const formData = await request.formData();
  const method = formData.get('_method');

  if (method === 'DELETE') {
    return DELETE(request, { params });
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

// Helper function to get category-specific specs
async function getProductSpecs(productId: number, category: string) {
  const specTable = SPEC_TABLES[category];
  if (!specTable) return null;

  const result = await db.query(`
    SELECT * FROM ${specTable} WHERE product_id = $1
  `, [productId]);

  if (result.rows.length === 0) return null;

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
async function insertProductSpecs(productId: number, category: string, specs: Record<string, unknown>) {
  const specTable = SPEC_TABLES[category];
  if (!specTable) return;

  const dimensions = specs.dimensions as Record<string, unknown> | undefined;
  const material = specs.material;
  const innerMaterial = specs.inner_material as Record<string, unknown> | undefined;
  const types = specs.types as string[] | undefined;

  switch (category) {
    case 'sofas':
    case 'corner_sofas':
    case 'sofa_beds': {
      await db.query(`
        INSERT INTO ${specTable} (
          product_id, category, construction, dimensions, material, inner_material,
          additional_features, has_shelves, leg_height, has_lift_mechanism, types,
          armrest_type, seat_height
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        productId,
        category,
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
          product_id, category, construction, dimensions, material, headboard_type,
          storage_options, types
        )
        VALUES (
          ${productId},
          ${category},
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
          product_id, category, type, firmness, thickness, core_type, hardness,
          dimensions, types
        )
        VALUES (
          ${productId},
          ${category},
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
          product_id, category, shape, extendable, material, dimensions, types
        )
        VALUES (
          ${productId},
          ${category},
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
          product_id, category, upholstery, seat_height, weight_capacity, material,
          dimensions, types
        )
        VALUES (
          ${productId},
          ${category},
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
          product_id, category, door_count, door_type, internal_layout, material,
          dimensions, types
        )
        VALUES (
          ${productId},
          ${category},
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
          product_id, category, mounting_type, shelf_count, material, dimensions, types
        )
        VALUES (
          ${productId},
          ${category},
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
