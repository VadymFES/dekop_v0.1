/**
 * Check if a product slug already exists
 * GET /admin-path-57fyg/api/products/check-slug?slug=some-slug&excludeId=123
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Необхідна авторизація' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const excludeId = searchParams.get('excludeId');

    if (!slug) {
      return NextResponse.json({ error: 'Параметр slug обов\'язковий' }, { status: 400 });
    }

    let result;
    if (excludeId) {
      result = await db.query`
        SELECT id FROM products WHERE slug = ${slug} AND id != ${parseInt(excludeId, 10)}
      `;
    } else {
      result = await db.query`
        SELECT id FROM products WHERE slug = ${slug}
      `;
    }

    return NextResponse.json({
      exists: result.rows.length > 0,
    });
  } catch (error) {
    console.error('Check slug error:', error);
    return NextResponse.json({ error: 'Помилка перевірки URL' }, { status: 500 });
  }
}
