import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { movementFiltersSchema } from '@/app/lib/admin-validation';

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = movementFiltersSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { productId, type, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let n = 1;

  if (productId) {
    conditions.push(`sm.product_id = $${n++}`);
    params.push(productId);
  }
  if (type) {
    conditions.push(`sm.type = $${n++}`);
    params.push(type);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await sql.query(
    `SELECT COUNT(*) FROM stock_movements sm ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const dataResult = await sql.query(
    `SELECT sm.id, sm.product_id, sm.warehouse_id, sm.type, sm.quantity,
            sm.reference_type, sm.reference_id, sm.notes, sm.created_by, sm.created_at,
            p.name AS product_name
     FROM stock_movements sm
     JOIN products p ON sm.product_id = p.id
     ${where}
     ORDER BY sm.created_at DESC
     LIMIT $${n++} OFFSET $${n++}`,
    params,
  );

  return NextResponse.json({ movements: dataResult.rows, total, page, limit });
}
