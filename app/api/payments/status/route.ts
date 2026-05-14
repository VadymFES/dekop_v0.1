// app/api/payments/check-status/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { checkLiqPayPaymentStatus, mapLiqPayStatus } from '@/app/lib/services/liqpay-service';
import type { OrderWithItems } from '@/app/lib/definitions';

/**
 * POST /api/payments/check-status
 * Directly queries payment provider API and updates order status
 *
 * This is a fallback for when webhooks don't arrive (network issues, IP blocking, etc.)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, email } = body;

    if (!orderId || !email) {
      return NextResponse.json(
        { error: 'Missing orderId or email' },
        { status: 400 }
      );
    }

    // Get order from database with email verification
    const orderResult = await sql`
      SELECT id, payment_method, payment_status, order_number
      FROM orders
      WHERE id = ${orderId}
        AND LOWER(user_email) = LOWER(${email})
    `;

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Order not found or email mismatch' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    // If already paid, no need to check again
    if (order.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        status: 'paid',
        message: 'Payment already confirmed'
      });
    }

    // Check payment status based on payment method
    if (order.payment_method === 'liqpay') {
      return await checkLiqPayStatus(orderId, order.order_number);
    } else {
      return NextResponse.json({
        success: true,
        status: order.payment_status,
        message: 'Payment method does not support direct status check'
      });
    }

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}

/**
 * Check LiqPay payment status directly via their API
 */
async function checkLiqPayStatus(orderId: string, orderNumber: string) {
  try {
    const liqpayResponse = await checkLiqPayPaymentStatus(orderId);

    if (!liqpayResponse || !liqpayResponse.status) {
      return NextResponse.json({
        success: true,
        status: 'pending',
        message: 'Could not get status from LiqPay'
      });
    }

    const paymentStatus = mapLiqPayStatus(liqpayResponse.status);

    if (paymentStatus !== 'pending') {
      if (paymentStatus === 'paid') {
        await sql`
          UPDATE orders
          SET
            payment_status = 'paid',
            payment_intent_id = ${liqpayResponse.transaction_id || liqpayResponse.payment_id || null},
            order_status = 'confirmed',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${orderId}
        `;

        try {
          await sendConfirmationEmail(orderId);
        } catch (emailError) {
          console.error(`[Payment Check] Failed to send confirmation email:`, emailError);
        }
      } else if (paymentStatus === 'failed') {
        await sql`
          UPDATE orders
          SET
            payment_status = 'failed',
            payment_intent_id = ${liqpayResponse.transaction_id || liqpayResponse.payment_id || null},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${orderId}
        `;
      }
    }

    return NextResponse.json({
      success: true,
      status: paymentStatus,
      liqpayStatus: liqpayResponse.status,
      message: paymentStatus === 'paid' ? 'Payment confirmed' :
               paymentStatus === 'failed' ? 'Payment failed' : 'Payment pending'
    });

  } catch (error) {
    console.error('[Payment Check] LiqPay status check error:', error);
    return NextResponse.json({
      success: false,
      status: 'pending',
      error: 'Failed to check LiqPay status'
    });
  }
}

/**
 * Send confirmation email after payment is confirmed
 */
async function sendConfirmationEmail(orderId: string) {
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

  if (orderResult.rows.length > 0) {
    const orderRow = orderResult.rows[0];
    const order: OrderWithItems = {
      ...orderRow,
      items: orderRow.items || []
    } as OrderWithItems;

    const { sendOrderConfirmationEmail } = await import('@/app/lib/services/email-service');
    await sendOrderConfirmationEmail({
      order,
      to: order.user_email,
      customerName: `${order.user_surname} ${order.user_name}`
    });

  }
}
