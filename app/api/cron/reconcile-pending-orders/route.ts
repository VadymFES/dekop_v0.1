// app/api/cron/reconcile-pending-orders/route.ts
import { sql } from '@vercel/postgres';
import { checkLiqPayPaymentStatus, mapLiqPayStatus } from '@/app/lib/services/liqpay-service';
import type { OrderWithItems } from '@/app/lib/definitions';

/**
 * GET /api/cron/reconcile-pending-orders
 * Runs every 15 minutes via vercel.json crons.
 *
 * Recovery path for webhook delivery failures: queries LiqPay orders pending
 * for >15 minutes and reconciles their status directly via the LiqPay status
 * API. A buyer who has been charged must never have their order stay pending
 * because the server_url webhook failed to arrive.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const pendingOrders = await sql`
    SELECT id, order_number, user_email, user_name, user_surname
    FROM orders
    WHERE payment_method = 'liqpay'
      AND payment_status = 'pending'
      AND created_at < ${cutoff}
    LIMIT 50
  `;

  const results: Array<{ orderId: string; result: string }> = [];

  for (const row of pendingOrders.rows) {
    try {
      const liqpayResponse = await checkLiqPayPaymentStatus(row.id);

      if (!liqpayResponse?.status) {
        results.push({ orderId: row.id, result: 'no_status' });
        continue;
      }

      const paymentStatus = mapLiqPayStatus(liqpayResponse.status);

      if (paymentStatus === 'paid') {
        await sql`
          UPDATE orders
          SET
            payment_status = 'paid',
            payment_intent_id = ${liqpayResponse.transaction_id || liqpayResponse.payment_id || null},
            order_status = 'confirmed',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${row.id}
            AND payment_status = 'pending'
        `;
        await sendConfirmationEmail(row.id);
        results.push({ orderId: row.id, result: 'confirmed' });

      } else if (paymentStatus === 'failed') {
        await sql`
          UPDATE orders
          SET
            payment_status = 'failed',
            payment_intent_id = ${liqpayResponse.transaction_id || liqpayResponse.payment_id || null},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${row.id}
            AND payment_status = 'pending'
        `;
        results.push({ orderId: row.id, result: 'failed' });

      } else {
        results.push({ orderId: row.id, result: 'still_pending' });
      }
    } catch (err) {
      console.error(`[Reconcile] Error for order ${row.id}:`, err);
      results.push({ orderId: row.id, result: 'error' });
    }
  }

  console.log(`[Reconcile] Checked ${pendingOrders.rows.length} orders:`, results);
  return Response.json({ success: true, checked: pendingOrders.rows.length, results });
}

async function sendConfirmationEmail(orderId: string) {
  try {
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
      const row = orderResult.rows[0];
      const order = { ...row, items: row.items || [] } as OrderWithItems;
      const { sendOrderConfirmationEmail } = await import('@/app/lib/services/email-service');
      await sendOrderConfirmationEmail({
        order,
        to: order.user_email,
        customerName: `${order.user_surname} ${order.user_name}`
      });
    }
  } catch (err) {
    console.error(`[Reconcile] Email failed for order ${orderId}:`, err);
  }
}
