import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { inventoryFiltersSchema } from '@/app/lib/admin-validation';

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = inventoryFiltersSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { low_stock, out_of_stock, category, search, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let n = 1;

  if (low_stock === 'true') {
    conditions.push(`p.reorder_level > 0 AND p.stock <= p.reorder_level`);
  }
  if (out_of_stock === 'true') {
    conditions.push(`p.stock <= 0`);
  }
  if (category) {
    conditions.push(`p.category = $${n++}`);
    params.push(category);
  }
  if (search) {
    conditions.push(`p.name ILIKE $${n++}`);
    params.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await sql.query(
    `SELECT COUNT(*) FROM products p ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const dataResult = await sql.query(
    `SELECT p.id, p.name, p.slug, p.category, p.stock, p.reorder_level, p.reorder_qty
     FROM products p
     ${where}
     ORDER BY p.stock ASC, p.name ASC
     LIMIT $${n++} OFFSET $${n++}`,
    params,
  );

  return NextResponse.json({ products: dataResult.rows, total, page, limit });
}
