import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import { ensureKitchenTables } from '@/app/lib/kitchen-db';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureKitchenTables();

  const [cardsRes, galleryRes] = await Promise.all([
    db.query`SELECT * FROM kitchen_cards ORDER BY sort_order ASC, created_at ASC`,
    db.query`SELECT * FROM kitchen_gallery ORDER BY sort_order ASC, created_at ASC`,
  ]);

  return NextResponse.json({ cards: cardsRes.rows, gallery: galleryRes.rows });
}
