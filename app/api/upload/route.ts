/**
 * Vercel Blob Storage - Client Upload Handler
 *
 * Uses client uploads for better UX:
 * - Upload progress tracking
 * - No server data transfer charges
 * - Supports files up to 5TB (we limit to 4MB for images)
 *
 * @see https://vercel.com/docs/vercel-blob/client-upload
 */

import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

// Allowed file types for product images
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validate file extension from pathname
        const extension = pathname.split('.').pop()?.toLowerCase();
        const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

        if (!extension || !validExtensions.includes(extension)) {
          throw new Error('Непідтримуваний формат файлу. Дозволені: JPEG, PNG, WebP, GIF');
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          tokenPayload: JSON.stringify({
            uploadedAt: new Date().toISOString(),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Called after successful upload
        // You can save to database here if needed
        console.log('Upload completed:', blob.url);
        console.log('Token payload:', tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Помилка завантаження';
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
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
