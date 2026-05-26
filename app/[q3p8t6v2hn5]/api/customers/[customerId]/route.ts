/**
 * Admin Customer detail API
 * GET   - Single customer with linked order history
 * PATCH - Update admin-editable customer fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAdminAction } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import { validateCsrfRequest } from '@/app/lib/csrf-protection';
import {
  customerIdSchema,
  customerUpdateSchema,
  safeValidateInput,
  formatValidationErrors,
} from '@/app/lib/admin-validation';

type RouteContext = { params: Promise<{ customerId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId } = await context.params;
    const idCheck = safeValidateInput(customerIdSchema, { customerId });
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
    }

    const customerResult = await db.query(
      `SELECT * FROM customers WHERE id = $1`,
      [customerId],
    );
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const ordersResult = await db.query(
      `SELECT id, order_number, total_amount, order_status, payment_status, created_at
       FROM orders
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [customerId],
    );

    return NextResponse.json({
      success: true,
      customer: { ...customerResult.rows[0], orders: ordersResult.rows },
    });
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const csrfValid = await validateCsrfRequest(request);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF validation failed', code: 'CSRF_INVALID' }, { status: 403 });
    }

    const { customerId } = await context.params;
    const idCheck = safeValidateInput(customerIdSchema, { customerId });
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
    }

    const body = await request.json();
    const validation = safeValidateInput(customerUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        errors: formatValidationErrors(validation.error),
      }, { status: 400 });
    }

    // Build a dynamic UPDATE from only the provided fields
    const data = validation.data as Record<string, unknown>;
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const allowed = [
      'phone', 'email', 'first_name', 'last_name', 'customer_type',
      'company_name', 'tax_id', 'is_vat_payer', 'tags', 'notes', 'marketing_consent',
    ];
    for (const key of allowed) {
      if (key in data) {
        setClauses.push(`${key} = $${i++}`);
        values.push(data[key]);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(customerId);

    let updateResult;
    try {
      updateResult = await db.query(
        `UPDATE customers SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
        values,
      );
    } catch (err: unknown) {
      // Unique violation on phone (another customer already owns it)
      if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505') {
        return NextResponse.json(
          { error: 'Клієнт з таким номером телефону вже існує' },
          { status: 409 },
        );
      }
      throw err;
    }

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await logAdminAction(
      admin.id, admin.email, 'customer_updated', 'customer', customerId,
      { fields: setClauses.map((c) => c.split(' = ')[0]) }, null, null,
    );

    return NextResponse.json({ success: true, customer: updateResult.rows[0] });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}
