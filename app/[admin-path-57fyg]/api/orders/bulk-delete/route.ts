/**
 * Bulk delete orders API
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

    if (!admin.permissions.includes('orders.delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No orders selected' }, { status: 400 });
    }

    // Validate all IDs are UUID strings
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!ids.every(id => typeof id === 'string' && uuidRegex.test(id))) {
      return NextResponse.json({ error: 'Invalid order IDs' }, { status: 400 });
    }

    // Get order numbers for logging
    const ordersResult = await db.query`
      SELECT id, order_number FROM orders WHERE id = ANY(${ids}::uuid[])
    `;

    const orderNumbers = ordersResult.rows.map((o: { id: string; order_number: string }) => ({
      id: o.id,
      order_number: o.order_number,
    }));

    // Delete order items first (foreign key constraint)
    await db.query`
      DELETE FROM order_items WHERE order_id = ANY(${ids}::uuid[])
    `;

    // Delete orders
    const deleteResult = await db.query`
      DELETE FROM orders WHERE id = ANY(${ids}::uuid[])
      RETURNING id
    `;

    const deletedCount = deleteResult.rows.length;

    // Log action
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    await logAdminAction(
      admin.id,
      admin.email,
      'orders_bulk_deleted',
      'orders',
      null,
      {
        deleted_count: deletedCount,
        orders: orderNumbers,
      },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      deleted_count: deletedCount,
    });
  } catch (error) {
    console.error('Bulk delete orders error:', error);
    return NextResponse.json(
      { error: 'Failed to delete orders' },
      { status: 500 }
    );
  }
}
