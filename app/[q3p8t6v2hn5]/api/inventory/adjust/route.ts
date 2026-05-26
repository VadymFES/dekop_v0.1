import { NextResponse } from 'next/server';
import { db } from '@vercel/postgres';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { validateCsrfRequest } from '@/app/lib/session-security';
import { stockAdjustmentSchema } from '@/app/lib/admin-validation';
import { recordStockMovement } from '@/app/lib/inventory/movements';
import { getDefaultWarehouseId } from '@/app/lib/inventory/warehouses';

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csrfValid = await validateCsrfRequest(request);
  if (!csrfValid) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = stockAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { productId, quantity, notes } = parsed.data;

  const warehouseId = await getDefaultWarehouseId();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const productCheck = await client.query(
      'SELECT id, name, stock FROM products WHERE id = $1',
      [productId],
    );
    if (!productCheck.rows[0]) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Товар не знайдено' }, { status: 404 });
    }

    await recordStockMovement(client, {
      productId,
      warehouseId,
      type: 'adjustment',
      quantity,
      notes: notes ?? undefined,
      createdBy: admin.email,
    });

    const updated = await client.query(
      'SELECT stock FROM products WHERE id = $1',
      [productId],
    );
    await client.query('COMMIT');

    return NextResponse.json({ stock: updated.rows[0].stock });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Stock adjustment failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  } finally {
    client.release();
  }
}
