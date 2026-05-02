// app/cart/api/clear/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';

/**
 * POST /cart/api/clear
 * Clears all items from the user's cart
 */
export async function POST() {
  try {
    console.log('[Cart Clear API] Request received');
    const cookieStore = await cookies();
    const cartId = cookieStore.get('cartId')?.value;

    console.log('[Cart Clear API] Cart ID from cookie:', cartId);

    // If there's no cart, it's already cleared - return success (idempotent operation)
    if (!cartId) {
      console.log('[Cart Clear API] No cart ID found, returning success (already cleared)');
      return NextResponse.json({
        success: true,
        message: 'Кошик вже очищено'
      });
    }

    console.log('[Cart Clear API] Deleting cart items for cart:', cartId);
    // Delete all items from cart
    await sql`
      DELETE FROM cart_items
      WHERE cart_id = ${cartId}
    `;

    console.log('[Cart Clear API] Deleting cart:', cartId);
    // Delete the cart itself
    await sql`
      DELETE FROM carts
      WHERE id = ${cartId}
    `;

    console.log('[Cart Clear API] Cart cleared successfully, preparing response');
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Кошик успішно очищено'
    });

    // Clear the cookie after successful order creation
    response.cookies.delete('cartId');

    console.log('[Cart Clear API] Returning success response');
    return response;

  } catch (error) {
    console.error('[Cart Clear API] Error clearing cart:', error);
    console.error('[Cart Clear API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
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
