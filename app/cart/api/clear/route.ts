// app/cart/api/clear/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import { logger } from '@/app/lib/logger';

/**
 * POST /cart/api/clear
 * Clears all items from the user's cart
 */
export async function POST() {
  try {
    logger.info('Cart clear request received');
    const cookieStore = await cookies();
    const cartId = cookieStore.get('cartId')?.value;

    logger.info('Retrieved cart ID from cookie', { cartId });

    // If there's no cart, it's already cleared - return success (idempotent operation)
    if (!cartId) {
      logger.info('No cart ID found, cart already cleared');
      return NextResponse.json({
        success: true,
        message: 'Кошик вже очищено'
      });
    }

    logger.info('Deleting cart items', { cartId });
    // Delete all items from cart
    await sql`
      DELETE FROM cart_items
      WHERE cart_id = ${cartId}
    `;

    logger.info('Deleting cart', { cartId });
    // Delete the cart itself
    await sql`
      DELETE FROM carts
      WHERE id = ${cartId}
    `;

    logger.info('Cart cleared successfully', { cartId });
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Кошик успішно очищено'
    });

    // Clear the cookie by setting it with expired date
    response.cookies.set('cartId', '', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
    });

    logger.info('Returning cart clear success response', { cartId });
    return response;

  } catch (error) {
    logger.error('Error clearing cart', {
      cartId: typeof cartId !== 'undefined' ? cartId : undefined,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    });
    return NextResponse.json(
      {
        error: 'Помилка при очищенні кошика',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
