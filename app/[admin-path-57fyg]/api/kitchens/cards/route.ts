import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import { validateCsrfRequest } from '@/app/lib/csrf-protection';

const cardSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  price:       z.number().int().min(0).default(0),
  image_url:   z.string().max(500).default(''),
  sort_order:  z.number().int().min(0).default(0),
});

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csrfValid = await validateCsrfRequest(request);
  if (!csrfValid) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

  const body = await request.json();
  const parsed = cardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { name, description, price, image_url, sort_order } = parsed.data;
  const { rows } = await db.query`
    INSERT INTO kitchen_cards (name, description, price, image_url, sort_order)
    VALUES (${name}, ${description}, ${price}, ${image_url}, ${sort_order})
    RETURNING *
  `;

  return NextResponse.json({ card: rows[0] }, { status: 201 });
}
