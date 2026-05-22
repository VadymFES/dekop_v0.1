import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

export const revalidate = 60;

export async function GET() {
  try {
    const [cardsRes, galleryRes] = await Promise.all([
      db.query`SELECT id, name, description, price, image_url, sort_order FROM kitchen_cards ORDER BY sort_order ASC, created_at ASC`,
      db.query`SELECT id, image_url, alt, sort_order FROM kitchen_gallery ORDER BY sort_order ASC, created_at ASC`,
    ]);
    return NextResponse.json({ cards: cardsRes.rows, gallery: galleryRes.rows });
  } catch {
    return NextResponse.json({ cards: [], gallery: [] });
  }
}
