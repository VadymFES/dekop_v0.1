// app/api/orders/send-confirmation/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { sendOrderConfirmationEmail } from '@/app/lib/services/email-service';
import type { OrderWithItems } from '@/app/lib/definitions';

/**
 * POST /api/orders/send-confirmation
 * Sends order confirmation email for a given order ID
 */
export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Fetch complete order with items
    const orderResult = await sql`
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
            'product_category', oi.product_category
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ${orderId}
      GROUP BY o.id
    `;

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const orderRow = orderResult.rows[0];
    const order = {
      ...orderRow,
      items: orderRow.items || []
    } as OrderWithItems;

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail({
        order,
        to: order.user_email,
        customerName: `${order.user_surname} ${order.user_name}`
      });

      console.log(`Confirmation email sent for order ${orderId}`);

      return NextResponse.json({
        success: true,
        message: 'Confirmation email sent successfully'
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      return NextResponse.json(
        {
          error: 'Failed to send confirmation email',
          details: emailError instanceof Error ? emailError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in send-confirmation:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
