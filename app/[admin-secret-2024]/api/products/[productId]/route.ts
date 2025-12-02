/**
 * Admin Single Product API Route
 * GET - Get product details
 * PUT - Update product
 * DELETE - Delete product
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAdminAction } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import {
  productSchema,
  safeValidateInput,
  formatValidationErrors,
} from '@/app/lib/admin-validation';

interface RouteParams {
  params: Promise<{ productId: string }>;
}

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

    const result = await db.query`
      SELECT p.*,
             json_agg(DISTINCT jsonb_build_object('id', pi.id, 'image_url', pi.image_url, 'alt', pi.alt, 'is_primary', pi.is_primary)) FILTER (WHERE pi.id IS NOT NULL) as images,
             json_agg(DISTINCT jsonb_build_object('color', pc.color, 'image_url', pc.image_url)) FILTER (WHERE pc.color IS NOT NULL) as colors
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      LEFT JOIN product_colors pc ON p.id = pc.product_id
      WHERE p.id = ${id}
      GROUP BY p.id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: result.rows[0],
    });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

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
    const existingResult = await db.query`
      SELECT id, name, slug, price, stock FROM products WHERE id = ${id}
    `;

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const oldProduct = existingResult.rows[0];

    const body = await request.json();
    const validation = safeValidateInput(productSchema, body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        errors: formatValidationErrors(validation.error),
      }, { status: 400 });
    }

    const data = validation.data;

    // Check for duplicate slug (if changed)
    if (data.slug !== oldProduct.slug) {
      const slugCheckResult = await db.query`
        SELECT id FROM products WHERE slug = ${data.slug} AND id != ${id}
      `;

      if (slugCheckResult.rows.length > 0) {
        return NextResponse.json({
          error: 'A product with this slug already exists',
        }, { status: 400 });
      }
    }

    // Update product
    const result = await db.query`
      UPDATE products
      SET name = ${data.name},
          slug = ${data.slug},
          description = ${data.description},
          category = ${data.category},
          price = ${data.price},
          stock = ${data.stock},
          is_on_sale = ${data.is_on_sale},
          is_new = ${data.is_new},
          is_bestseller = ${data.is_bestseller},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, slug, category, price, stock
    `;

    const updatedProduct = result.rows[0];

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
        old: { name: oldProduct.name, price: oldProduct.price, stock: oldProduct.stock },
        new: { name: data.name, price: data.price, stock: data.stock },
      },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

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

    // Get product info before deleting
    const existingResult = await db.query`
      SELECT id, name, slug FROM products WHERE id = ${id}
    `;

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = existingResult.rows[0];

    // Delete product (cascades to images, colors, etc.)
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
