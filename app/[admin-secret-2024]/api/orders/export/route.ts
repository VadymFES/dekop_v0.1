/**
 * Admin Orders Export API Route
 * GET - Export orders to CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAdminAction } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';

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
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('payment_status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Build query
    let whereClause = 'WHERE 1=1';
    const values: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND order_status = $${paramIndex++}`;
      values.push(status);
    }

    if (paymentStatus) {
      whereClause += ` AND payment_status = $${paramIndex++}`;
      values.push(paymentStatus);
    }

    if (dateFrom) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      values.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      values.push(dateTo + 'T23:59:59');
    }

    // Get orders
    const ordersQuery = `
      SELECT
        order_number,
        user_name,
        user_surname,
        user_email,
        user_phone,
        delivery_method,
        delivery_city,
        delivery_address,
        delivery_street,
        delivery_building,
        delivery_apartment,
        subtotal,
        discount_percent,
        discount_amount,
        delivery_cost,
        total_amount,
        prepayment_amount,
        payment_method,
        payment_status,
        order_status,
        customer_notes,
        admin_notes,
        created_at,
        shipped_at,
        delivered_at
      FROM orders
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const ordersResult = await db.query(ordersQuery, values);

    // Build CSV
    const headers = [
      'Order Number',
      'Customer Name',
      'Email',
      'Phone',
      'Delivery Method',
      'City',
      'Address',
      'Street',
      'Building',
      'Apartment',
      'Subtotal',
      'Discount %',
      'Discount Amount',
      'Delivery Cost',
      'Total',
      'Prepayment',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Customer Notes',
      'Admin Notes',
      'Created At',
      'Shipped At',
      'Delivered At',
    ];

    const rows = ordersResult.rows.map(order => [
      order.order_number,
      `${order.user_name} ${order.user_surname}`,
      order.user_email,
      order.user_phone,
      order.delivery_method,
      order.delivery_city || '',
      order.delivery_address || '',
      order.delivery_street || '',
      order.delivery_building || '',
      order.delivery_apartment || '',
      order.subtotal,
      order.discount_percent,
      order.discount_amount,
      order.delivery_cost,
      order.total_amount,
      order.prepayment_amount,
      order.payment_method,
      order.payment_status,
      order.order_status,
      (order.customer_notes || '').replace(/"/g, '""'),
      (order.admin_notes || '').replace(/"/g, '""'),
      order.created_at ? new Date(order.created_at).toISOString() : '',
      order.shipped_at ? new Date(order.shipped_at).toISOString() : '',
      order.delivered_at ? new Date(order.delivered_at).toISOString() : '',
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => {
          const str = String(cell);
          // Escape quotes and wrap in quotes if contains comma or newline
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ),
    ].join('\n');

    // Add BOM for Excel UTF-8 support
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    // Log export action
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    await logAdminAction(
      admin.id,
      admin.email,
      'orders_exported',
      'orders',
      null,
      { count: ordersResult.rows.length, filters: { status, paymentStatus, dateFrom, dateTo } },
      ipAddress,
      userAgent
    );

    // Return CSV file
    const filename = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export orders error:', error);
    return NextResponse.json({ error: 'Failed to export orders' }, { status: 500 });
  }
}
