import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { getCurrentAdmin } from '@/app/lib/admin-auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const productId = Number((await params).productId);

  try {
    const result = await db.query`
      SELECT
        id,
        product_id,
        admin_email,
        action,
        changes,
        created_at
      FROM product_changelog
      WHERE product_id = ${productId}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      changelog: result.rows
    });
  } catch (error) {
    console.error('Error fetching product changelog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch changelog' },
      { status: 500 }
    );
  }
}
