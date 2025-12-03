/**
 * Bulk delete products API
 */

import { NextResponse } from 'next/server';
import { getCurrentAdmin, logAdminAction } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';

export async function DELETE(request: Request) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!admin.permissions.includes('products.delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No products selected' }, { status: 400 });
    }

    // Validate all IDs are numbers
    if (!ids.every(id => typeof id === 'number' && Number.isInteger(id))) {
      return NextResponse.json({ error: 'Invalid product IDs' }, { status: 400 });
    }

    // Get product names for logging
    const productsResult = await db.query`
      SELECT id, name FROM products WHERE id = ANY(${ids})
    `;

    const productNames = productsResult.rows.map((p: { id: number; name: string }) => ({
      id: p.id,
      name: p.name,
    }));

    // Delete products
    const deleteResult = await db.query`
      DELETE FROM products WHERE id = ANY(${ids})
      RETURNING id
    `;

    const deletedCount = deleteResult.rows.length;

    // Log action
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    await logAdminAction(
      admin.id,
      admin.email,
      'products_bulk_deleted',
      'products',
      null,
      {
        deleted_count: deletedCount,
        products: productNames,
      },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      deleted_count: deletedCount,
    });
  } catch (error) {
    console.error('Bulk delete products error:', error);
    return NextResponse.json(
      { error: 'Failed to delete products' },
      { status: 500 }
    );
  }
}
