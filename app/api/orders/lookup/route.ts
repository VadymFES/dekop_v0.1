import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { rateLimit, rateLimitKey, tooManyRequests } from '@/app/lib/rate-limit';

const lookupSchema = z.object({
  email: z.string().email('Невірний формат email').max(255),
});

/**
 * POST /api/orders/lookup
 * Returns up to 5 most recent orders for a given email address.
 * Rate-limited to prevent enumeration.
 */
export async function POST(request: Request) {
  const rl = await rateLimit(rateLimitKey('orders:lookup', request), { limit: 10, windowSeconds: 3600 });
  if (!rl.success) return tooManyRequests(rl.reset);

  try {
    const body = await request.json();
    const parsed = lookupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Невірний формат email' },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    const result = await sql`
      SELECT
        id,
        order_number,
        payment_status,
        order_status,
        total_amount,
        payment_method,
        created_at
      FROM orders
      WHERE LOWER(user_email) = LOWER(${email})
      ORDER BY created_at DESC
      LIMIT 5
    `;

    return NextResponse.json({
      success: true,
      orders: result.rows,
    });

  } catch (error) {
    console.error('[orders/lookup] Error:', error);
    return NextResponse.json(
      { error: 'Помилка сервера. Спробуйте пізніше.' },
      { status: 500 }
    );
  }
}
