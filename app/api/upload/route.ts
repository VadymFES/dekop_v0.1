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

// Allowed file types for product images
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

// Log that this route is loaded
console.log('[Upload API] Route loaded successfully');

// CORS headers for admin subdomain
function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  // Allow requests from admin subdomain and main domain
  const allowedOrigins = [
    'http://localhost:3000',
    'http://admin.localhost:3000',
    /^https?:\/\/(admin\.)?[^/]+$/,  // Production domains
  ];

  const isAllowed = allowedOrigins.some(allowed =>
    typeof allowed === 'string' ? origin === allowed : allowed.test(origin)
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const corsHeaders = getCorsHeaders(request);
  console.log('[Upload API] POST request received');
  console.log('[Upload API] URL:', request.url);
  console.log('[Upload API] Method:', request.method);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не надано' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Непідтримуваний формат файлу. Дозволені: JPEG, PNG, WebP, GIF' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Файл занадто великий. Максимальний розмір: 4MB' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `products/${timestamp}-${randomSuffix}.${extension}`;

    // Upload to Vercel Blob
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

// GET endpoint for testing if route is accessible
export async function GET(): Promise<NextResponse> {
  console.log('[Upload API] GET request received - route is working');
  return NextResponse.json({
    status: 'ok',
    message: 'Upload API is working',
    timestamp: new Date().toISOString()
  });
}

// DELETE endpoint for removing images from Blob storage
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const corsHeaders = getCorsHeaders(request);
  console.log('[Upload API] DELETE request received');
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
