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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не надано' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Непідтримуваний формат файлу. Дозволені: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Файл занадто великий. Максимальний розмір: 4MB' },
        { status: 400 }
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
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Помилка завантаження';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE endpoint for removing images from Blob storage
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL не надано' },
        { status: 400 }
      );
    }

    // Only delete if it's a Vercel Blob URL
    if (!url.includes('blob.vercel-storage.com')) {
      // External URL - just return success (don't try to delete)
      return NextResponse.json({ success: true, external: true });
    }

    await del(url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Помилка видалення файлу' },
      { status: 500 }
    );
  }
}
