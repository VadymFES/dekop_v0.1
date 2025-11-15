// app/api/orders/[orderId]/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import type { OrderWithItems } from '@/app/lib/definitions';

/**
 * GET /api/orders/[orderId]
 * Fetches a specific order with all its items
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Fetch order with items
    const result = await sql`
      SELECT
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'order_id', oi.order_id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'product_slug', oi.product_slug,
            'product_article', oi.product_article,
            'quantity', oi.quantity,
            'color', oi.color,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'product_image_url', oi.product_image_url,
            'product_category', oi.product_category,
            'created_at', oi.created_at,
            'updated_at', oi.updated_at
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ${orderId}
      GROUP BY o.id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Замовлення не знайдено' },
        { status: 404 }
      );
    }

    const order: OrderWithItems = {
      ...result.rows[0],
      items: result.rows[0].items || []
    };

    return NextResponse.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      {
        error: 'Помилка при отриманні замовлення',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[orderId]
 * Updates order status, payment status, or other fields
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (body.order_status !== undefined) {
      updates.push(`order_status = $${paramCount++}`);
      values.push(body.order_status);
    }

    if (body.payment_status !== undefined) {
      updates.push(`payment_status = $${paramCount++}`);
      values.push(body.payment_status);
    }

    if (body.payment_intent_id !== undefined) {
      updates.push(`payment_intent_id = $${paramCount++}`);
      values.push(body.payment_intent_id);
    }

    if (body.admin_notes !== undefined) {
      updates.push(`admin_notes = $${paramCount++}`);
      values.push(body.admin_notes);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Немає полів для оновлення' },
        { status: 400 }
      );
    }

    // Execute update
    values.push(orderId);
    const updateQuery = `
      UPDATE orders
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await sql.query(updateQuery, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Замовлення не знайдено' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: result.rows[0],
      message: 'Замовлення успішно оновлено'
    });

  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      {
        error: 'Помилка при оновленні замовлення',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
