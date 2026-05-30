import { NextRequest, NextResponse } from 'next/server';
import { db } from '@vercel/postgres';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { validateCsrfRequest } from '@/app/lib/csrf-protection';
import { z } from 'zod';
import { recordStockMovement } from '@/app/lib/inventory/movements';

const stockAdjustSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().refine((n) => n !== 0, 'Кількість не може бути 0'),
  type: z.enum(['produced_in', 'return_in', 'adjustment', 'write_off']),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csrfValid = await validateCsrfRequest(request);
  if (!csrfValid) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = stockAdjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { productId, quantity, type, notes } = parsed.data;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const check = await client.query(
      'SELECT id, stock FROM products WHERE id = $1',
      [productId],
    );
    if (!check.rows[0]) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Товар не знайдено' }, { status: 404 });
    }

    await recordStockMovement(client, {
      productId,
      type,
      quantity,
      notes,
      createdBy: admin.email,
    });

    const updated = await client.query(
      'SELECT stock FROM products WHERE id = $1',
      [productId],
    );

    const oldStock = check.rows[0].stock as number;
    const newStock = updated.rows[0].stock as number;
    await client.query(
      `INSERT INTO product_changelog (product_id, admin_id, admin_email, action, changes)
       VALUES ($1, $2, $3, 'updated', $4)`,
      [
        productId,
        admin.id,
        admin.email,
        JSON.stringify({
          stock: { old: oldStock, new: newStock, reason: type, note: notes ?? null },
        }),
      ],
    );

    await client.query('COMMIT');

    return NextResponse.json({ stock: newStock });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Stock adjust failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  } finally {
    client.release();
  }
}
