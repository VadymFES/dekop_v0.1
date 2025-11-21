// app/api/orders/create/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql, db } from '@vercel/postgres';
import type { CreateOrderRequest, OrderWithItems, CartItem } from '@/app/lib/definitions';
import {
  generateOrderNumber,
  calculateOrderTotals,
  calculatePaymentDeadline,
  generateProductArticle
} from '@/app/lib/order-utils';
import { createOrderSchema, safeValidateInput } from '@/app/lib/validation-schemas';

/**
 * POST /api/orders/create
 * Creates a new order from cart data
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // SECURITY: Validate and sanitize all input data
    const validationResult = safeValidateInput(createOrderSchema, body);

    if (!validationResult.success) {
      // Return detailed validation errors
      const errorMessages = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      // Log validation errors for debugging
      console.error('Order validation failed:', {
        errors: errorMessages,
        receivedData: {
          user_name: body.user_name,
          user_surname: body.user_surname,
          user_phone: body.user_phone,
          user_email: body.user_email,
          delivery_method: body.delivery_method,
          payment_method: body.payment_method,
        }
      });

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errorMessages
        },
        { status: 400 }
      );
    }

    // Use validated and sanitized data
    const validatedData = validationResult.data;

    // Get cart ID from cookies (server-side) or from validated request body
    const cookieStore = await cookies();
    const cartId = cookieStore.get('cartId')?.value || validatedData.cart_id;

    // Validate cart ID exists
    if (!cartId) {
      return NextResponse.json(
        { error: 'Кошик не знайдено' },
        { status: 404 }
      );
    }

    // Fetch cart items
    const cartResult = await sql`
      SELECT
        ci.id,
        ci.product_id,
        ci.quantity,
        ci.color,
        p.name,
        p.slug,
        p.price,
        p.category,
        pi.image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      WHERE ci.cart_id = ${cartId}
    `;

    if (cartResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Кошик порожній або не знайдено' },
        { status: 404 }
      );
    }

    // Calculate subtotal from cart items
    const subtotal = cartResult.rows.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Calculate order totals using validated data
    const totals = calculateOrderTotals({
      subtotal,
      discountPercent: validatedData.discount_percent || 0,
      deliveryCost: validatedData.delivery_cost || 0,
      prepaymentPercentage: validatedData.prepayment_amount
        ? validatedData.prepayment_amount / (subtotal + (validatedData.delivery_cost || 0))
        : undefined
    });

    // Generate unique order number
    const orderNumber = generateOrderNumber();

    // Calculate payment deadline
    const paymentDeadline = calculatePaymentDeadline();

    // TRANSACTION: Wrap order creation in a transaction to ensure data consistency
    // If any operation fails, all changes will be rolled back to prevent orphaned records
    let order: OrderWithItems;

    // Get a connection from the pool for transaction support
    const client = await db.connect();

    try {
      // Begin transaction
      await client.query('BEGIN');

      // Create order using validated and sanitized data
      const orderResult = await client.query(`
        INSERT INTO orders (
          order_number,
          user_name,
          user_surname,
          user_phone,
          user_email,
          delivery_method,
          delivery_address,
          delivery_city,
          delivery_street,
          delivery_building,
          delivery_apartment,
          delivery_postal_code,
          store_location,
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
          payment_deadline
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )
        RETURNING id, order_number, total_amount, prepayment_amount, created_at
      `, [
        orderNumber,
        validatedData.user_name,
        validatedData.user_surname,
        validatedData.user_phone,
        validatedData.user_email,
        validatedData.delivery_method,
        validatedData.delivery_address || null,
        validatedData.delivery_city || null,
        validatedData.delivery_street || null,
        validatedData.delivery_building || null,
        validatedData.delivery_apartment || null,
        validatedData.delivery_postal_code || null,
        validatedData.store_location || null,
        totals.subtotal,
        totals.discountPercent,
        totals.discountAmount,
        totals.deliveryCost,
        totals.totalAmount,
        totals.prepaymentAmount,
        validatedData.payment_method,
        'pending',
        'processing',
        validatedData.customer_notes || null,
        paymentDeadline.toISOString()
      ]);

      const orderId = orderResult.rows[0].id;

      // Create order items from cart
      for (const cartItem of cartResult.rows) {
        const article = generateProductArticle(cartItem.product_id);
        const unitPrice = cartItem.price;
        const totalPrice = unitPrice * cartItem.quantity;

        await client.query(`
          INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            product_slug,
            product_article,
            quantity,
            color,
            unit_price,
            total_price,
            product_image_url,
            product_category
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          )
        `, [
          orderId,
          cartItem.product_id,
          cartItem.name,
          cartItem.slug,
          article,
          cartItem.quantity,
          cartItem.color || null,
          unitPrice,
          totalPrice,
          cartItem.image_url || null,
          cartItem.category
        ]);
      }

      // Fetch complete order with items within the same transaction
      const completeOrderResult = await client.query(`
        SELECT
          o.*,
          json_agg(
            json_build_object(
              'id', oi.id,
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
        WHERE o.id = $1
        GROUP BY o.id
      `, [orderId]);

      // Commit transaction
      await client.query('COMMIT');

      // Transaction completed successfully
      order = {
        ...completeOrderResult.rows[0],
        items: completeOrderResult.rows[0].items || []
      } as OrderWithItems;

    } catch (transactionError) {
      // Rollback transaction on error
      await client.query('ROLLBACK');

      // Transaction failed and was rolled back
      console.error('Transaction failed during order creation:', transactionError);
      throw new Error(
        `Failed to create order: ${transactionError instanceof Error ? transactionError.message : 'Transaction rolled back'}`
      );
    } finally {
      // Always release the client back to the pool
      client.release();
    }

    return NextResponse.json({
      success: true,
      order,
      message: 'Замовлення успішно створено'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      {
        error: 'Помилка при створенні замовлення',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
