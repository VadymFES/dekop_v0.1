import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await db.query`
    SELECT * FROM kitchen_orders ORDER BY created_at DESC
  `;

  return NextResponse.json({ orders: rows });
}
