/**
 * Admin Orders API Route
 * GET - List orders with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import {
  orderFiltersSchema,
  safeValidateInput,
  formatValidationErrors,
} from '@/app/lib/admin-validation';

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!admin.permissions.includes('orders.read')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validation = safeValidateInput(orderFiltersSchema, params);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid parameters',
        errors: formatValidationErrors(validation.error),
      }, { status: 400 });
    }

    const { page, limit, status, payment_status, search, date_from, date_to, sort, order } = validation.data;
    const offset = (page - 1) * limit;

    // Build query conditions
    let whereClause = 'WHERE 1=1';
    const values: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND order_status = $${paramIndex++}`;
      values.push(status);
    }

    if (payment_status) {
      whereClause += ` AND payment_status = $${paramIndex++}`;
      values.push(payment_status);
    }

    if (search) {
      whereClause += ` AND (order_number ILIKE $${paramIndex} OR user_email ILIKE $${paramIndex} OR user_phone ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (date_from) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      values.push(date_from);
    }

    if (date_to) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      values.push(date_to + 'T23:59:59');
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM orders ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = Number(countResult.rows[0]?.total) || 0;

    // Get orders
    const sortColumn = ['created_at', 'total_amount', 'order_number'].includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const ordersQuery = `
      SELECT id, order_number, user_name, user_surname, user_email, user_phone,
             total_amount, order_status, payment_status, payment_method, delivery_method,
             created_at
      FROM orders
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const ordersResult = await db.query(ordersQuery, [...values, limit, offset]);

    return NextResponse.json({
      success: true,
      orders: ordersResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
