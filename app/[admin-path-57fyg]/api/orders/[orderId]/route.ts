/**
 * Admin Single Order API Route
 * GET - Get order details
 * PUT - Update order status/payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAdminAction } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import {
  orderStatusUpdateSchema,
  orderPaymentUpdateSchema,
  orderTrackingSchema,
  safeValidateInput,
  formatValidationErrors,
} from '@/app/lib/admin-validation';

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!admin.permissions.includes('orders.read')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { orderId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // Get order
    const orderResult = await db.query`
      SELECT * FROM orders WHERE id = ${orderId}
    `;

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get order items
    const itemsResult = await db.query`
      SELECT * FROM order_items WHERE order_id = ${orderId}
    `;

    return NextResponse.json({
      success: true,
      order: {
        ...orderResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!admin.permissions.includes('orders.update')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { orderId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // Check if order exists
    const existingResult = await db.query`
      SELECT id, order_number, order_status, payment_status, admin_notes
      FROM orders WHERE id = ${orderId}
    `;

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const oldOrder = existingResult.rows[0];

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    // Validate and collect updates
    if (body.order_status !== undefined) {
      const validation = safeValidateInput(orderStatusUpdateSchema, { order_status: body.order_status });
      if (!validation.success) {
        return NextResponse.json({
          error: 'Validation failed',
          errors: formatValidationErrors(validation.error),
        }, { status: 400 });
      }
      updateData.order_status = validation.data.order_status;
      changes.order_status = { old: oldOrder.order_status, new: validation.data.order_status };

      // Update timestamp based on status
      if (validation.data.order_status === 'shipped') {
        updateData.shipped_at = new Date().toISOString();
      } else if (validation.data.order_status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      } else if (validation.data.order_status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }
    }

    if (body.payment_status !== undefined) {
      const validation = safeValidateInput(orderPaymentUpdateSchema, { payment_status: body.payment_status });
      if (!validation.success) {
        return NextResponse.json({
          error: 'Validation failed',
          errors: formatValidationErrors(validation.error),
        }, { status: 400 });
      }
      updateData.payment_status = validation.data.payment_status;
      changes.payment_status = { old: oldOrder.payment_status, new: validation.data.payment_status };
    }

    if (body.admin_notes !== undefined) {
      const validation = safeValidateInput(orderTrackingSchema, { admin_notes: body.admin_notes });
      if (!validation.success) {
        return NextResponse.json({
          error: 'Validation failed',
          errors: formatValidationErrors(validation.error),
        }, { status: 400 });
      }
      updateData.admin_notes = validation.data.admin_notes;
      changes.admin_notes = { old: oldOrder.admin_notes, new: validation.data.admin_notes };
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    // Build update query
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      setClauses.push(`${key} = $${paramIndex++}`);
      values.push(value);
    });

    setClauses.push(`updated_at = NOW()`);

    const updateQuery = `
      UPDATE orders
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, [...values, orderId]);

    // Log action
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    await logAdminAction(
      admin.id,
      admin.email,
      'order_updated',
      'orders',
      orderId,
      { order_number: oldOrder.order_number, changes },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      order: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
