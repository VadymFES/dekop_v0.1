// app/api/orders/create/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import type { CreateOrderRequest, OrderWithItems, CartItem } from '@/app/lib/definitions';
import {
  generateOrderNumber,
  calculateOrderTotals,
  calculatePaymentDeadline,
  generateProductArticle
} from '@/app/lib/order-utils';

/**
 * POST /api/orders/create
 * Creates a new order from cart data
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Get cart ID from cookies (server-side) or from request body
    const cookieStore = await cookies();
    const cartId = cookieStore.get('cartId')?.value || body.cart_id;

    // Validate required fields
    if (!cartId) {
      return NextResponse.json(
        { error: 'Кошик не знайдено' },
        { status: 404 }
      );
    }

    if (!body.user_name || !body.user_surname || !body.user_phone || !body.user_email) {
      return NextResponse.json(
        { error: 'Відсутні обов\'язкові поля' },
        { status: 400 }
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

    // Calculate order totals
    const totals = calculateOrderTotals({
      subtotal,
      discountPercent: body.discount_percent || 0,
      deliveryCost: body.delivery_cost || 0,
      prepaymentPercentage: body.prepayment_amount
        ? body.prepayment_amount / (subtotal + (body.delivery_cost || 0))
        : undefined
    });

    // Generate unique order number
    const orderNumber = generateOrderNumber();

    // Calculate payment deadline
    const paymentDeadline = calculatePaymentDeadline();

    // Create order
    const orderResult = await sql`
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
        ${orderNumber},
        ${body.user_name},
        ${body.user_surname},
        ${body.user_phone},
        ${body.user_email},
        ${body.delivery_method},
        ${body.delivery_address || null},
        ${body.delivery_city || null},
        ${body.delivery_street || null},
        ${body.delivery_building || null},
        ${body.delivery_apartment || null},
        ${body.delivery_postal_code || null},
        ${body.store_location || null},
        ${totals.subtotal},
        ${totals.discountPercent},
        ${totals.discountAmount},
        ${totals.deliveryCost},
        ${totals.totalAmount},
        ${totals.prepaymentAmount},
        ${body.payment_method},
        'pending',
        'processing',
        ${body.customer_notes || null},
        ${paymentDeadline.toISOString()}
      )
      RETURNING id, order_number, total_amount, prepayment_amount, created_at
    `;

    const orderId = orderResult.rows[0].id;

    // Create order items from cart
    for (const cartItem of cartResult.rows) {
      const article = generateProductArticle(cartItem.product_id);
      const unitPrice = cartItem.price;
      const totalPrice = unitPrice * cartItem.quantity;

      await sql`
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
          ${orderId},
          ${cartItem.product_id},
          ${cartItem.name},
          ${cartItem.slug},
          ${article},
          ${cartItem.quantity},
          ${cartItem.color || null},
          ${unitPrice},
          ${totalPrice},
          ${cartItem.image_url || null},
          ${cartItem.category}
        )
      `;
    }

    // Fetch complete order with items
    const completeOrderResult = await sql`
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
      WHERE o.id = ${orderId}
      GROUP BY o.id
    `;

    const order: OrderWithItems = {
      ...completeOrderResult.rows[0],
      items: completeOrderResult.rows[0].items || []
    };

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
