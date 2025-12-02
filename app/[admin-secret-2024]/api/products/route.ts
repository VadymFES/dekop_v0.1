/**
 * Admin Products API Route
 * GET - List products with filters
 * POST - Create new product
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
    const sortColumn = ['name', 'price', 'stock', 'created_at'].includes(sort) ? sort : 'created_at';
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
      return NextResponse.json({
        error: 'Validation failed',
        errors: formatValidationErrors(validation.error),
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

    // Insert product
    const result = await db.query`
      INSERT INTO products (name, slug, description, category, price, stock, is_on_sale, is_new, is_bestseller)
      VALUES (${data.name}, ${data.slug}, ${data.description}, ${data.category}, ${data.price}, ${data.stock}, ${data.is_on_sale}, ${data.is_new}, ${data.is_bestseller})
      RETURNING id, name, slug, category, price, stock
    `;

    const newProduct = result.rows[0];

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
