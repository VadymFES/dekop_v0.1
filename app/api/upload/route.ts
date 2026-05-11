/**
 * Vercel Blob Storage - Server Upload Handler
 *
 * Uses server uploads for reliable image handling:
 * - Supports files up to 4.5MB (sufficient for product images)
 * - Simpler implementation without client token exchange
 *
 * @see https://vercel.com/docs/vercel-blob/server-upload
 */

import { put, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/app/lib/admin-auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 4 * 1024 * 1024;

const CORS_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://admin.localhost:3000',
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_BASE_URL,
  'https://dekop.com.ua',
  'https://admin.dekop.com.ua',
].filter(Boolean) as string[];

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const isAllowed = CORS_ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const corsHeaders = getCorsHeaders(request);

  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не надано' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Непідтримуваний формат файлу. Дозволені: JPEG, PNG, WebP, GIF' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Файл занадто великий. Максимальний розмір: 4MB' },
        { status: 400, headers: corsHeaders }
      );
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `products/${timestamp}-${randomSuffix}.${extension}`;

    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Помилка завантаження';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    message: 'Upload API is working',
    timestamp: new Date().toISOString()
  });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const corsHeaders = getCorsHeaders(request);

  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL не надано' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Only delete if it's a Vercel Blob URL
    if (!url.includes('blob.vercel-storage.com')) {
      // External URL - just return success (don't try to delete)
      return NextResponse.json({ success: true, external: true }, { headers: corsHeaders });
    }

    await del(url);

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Помилка видалення файлу' },
      { status: 500, headers: corsHeaders }
    );
  }
}
