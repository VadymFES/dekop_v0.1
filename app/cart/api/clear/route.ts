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
    const cookieStore = await cookies();
    const cartId = cookieStore.get('cartId')?.value;

    if (!cartId) {
      return NextResponse.json(
        { error: 'Кошик не знайдено' },
        { status: 404 }
      );
    }

    // Delete all items from cart
    await sql`
      DELETE FROM cart_items
      WHERE cart_id = ${cartId}
    `;

    // Delete the cart itself
    await sql`
      DELETE FROM carts
      WHERE id = ${cartId}
    `;

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

    return response;

  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json(
      {
        error: 'Помилка при очищенні кошика',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
