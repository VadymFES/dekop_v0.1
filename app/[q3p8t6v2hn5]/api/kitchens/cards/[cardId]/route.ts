import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import { validateCsrfRequest } from '@/app/lib/csrf-protection';

const updateSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  price:       z.number().int().min(0).default(0),
  image_url:   z.string().max(500).default(''),
  sort_order:  z.number().int().min(0).default(0),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csrfValid = await validateCsrfRequest(request);
  if (!csrfValid) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

  const { cardId } = await params;
  const id = parseInt(cardId, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { name, description, price, image_url, sort_order } = parsed.data;
  const { rows } = await db.query`
    UPDATE kitchen_cards
    SET name = ${name}, description = ${description}, price = ${price},
        image_url = ${image_url}, sort_order = ${sort_order}
    WHERE id = ${id}
    RETURNING *
  `;

  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ card: rows[0] });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csrfValid = await validateCsrfRequest(request);
  if (!csrfValid) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

  const { cardId } = await params;
  const id = parseInt(cardId, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  await db.query`DELETE FROM kitchen_cards WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
