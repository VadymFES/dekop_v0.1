/**
 * Admin Customers API
 * GET - List/search customers with filters, segments and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import {
  customerFiltersSchema,
  safeValidateInput,
  formatValidationErrors,
} from '@/app/lib/admin-validation';
import { VIP_SPEND_THRESHOLD } from '@/app/lib/crm/segments';

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validation = safeValidateInput(customerFiltersSchema, params);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid parameters',
        errors: formatValidationErrors(validation.error),
      }, { status: 400 });
    }

    const { page, limit, search, segment, tag, customer_type, sort, order } = validation.data;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (search) {
      conditions.push(
        `(first_name ILIKE $${i} OR last_name ILIKE $${i} OR phone ILIKE $${i} OR email ILIKE $${i} OR company_name ILIKE $${i})`,
      );
      values.push(`%${search}%`);
      i++;
    }

    if (customer_type) {
      conditions.push(`customer_type = $${i++}`);
      values.push(customer_type);
    }

    if (tag) {
      conditions.push(`$${i++} = ANY(tags)`);
      values.push(tag);
    }

    if (segment === 'vip') {
      conditions.push(`total_spent >= $${i++}`);
      values.push(VIP_SPEND_THRESHOLD);
    } else if (segment === 'repeat') {
      conditions.push(`total_orders >= 2`);
    } else if (segment === 'new') {
      conditions.push(`total_orders <= 1`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortColumn = ['created_at', 'last_order_at', 'total_spent', 'total_orders'].includes(sort)
      ? sort
      : 'last_order_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM customers ${whereClause}`,
      values,
    );
    const total = Number(countResult.rows[0]?.total) || 0;

    const listResult = await db.query(
      `SELECT id, phone, email, first_name, last_name, customer_type, company_name,
              tags, total_orders, total_spent, last_order_at, created_at
       FROM customers
       ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder} NULLS LAST
       LIMIT $${i++} OFFSET $${i}`,
      [...values, limit, offset],
    );

    return NextResponse.json({
      success: true,
      customers: listResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
