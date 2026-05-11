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
      return NextResponse.json({
        success: true,
        message: 'Кошик вже очищено'
      });
    }

    await sql`
      DELETE FROM cart_items
      WHERE cart_id = ${cartId}
    `;

    await sql`
      DELETE FROM carts
      WHERE id = ${cartId}
    `;

    const response = NextResponse.json({
      success: true,
      message: 'Кошик успішно очищено'
    });

    response.cookies.delete('cartId');

    return response;

  } catch (error) {
    console.error('[Cart Clear API] Error clearing cart:', error);
    return NextResponse.json(
      {
        error: 'Помилка при очищенні кошика',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
