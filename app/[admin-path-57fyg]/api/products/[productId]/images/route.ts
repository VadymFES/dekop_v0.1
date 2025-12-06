/**
 * API Route: Update product images and colors only
 * PUT /admin-path-57fyg/api/products/[productId]/images
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { z } from 'zod';

// Validation schema for images and colors
const updateImagesSchema = z.object({
  images: z.array(z.object({
    id: z.number().optional(),
    image_url: z.string().max(500),
    alt: z.string().max(255).default(''),
    is_primary: z.boolean().default(false),
    color: z.string().max(100).nullable().optional(),
  })),
  colors: z.array(z.object({
    color: z.string().max(100),
    image_url: z.string().max(500),
  })),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const id = parseInt(productId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateImagesSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation error',
        details: validationResult.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      }, { status: 400 });
    }

    const { images, colors } = validationResult.data;

    // Check if product exists
    const { rows: existingProduct } = await db.query`
      SELECT id FROM products WHERE id = ${id}
    `;

    if (existingProduct.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete existing images
    await db.query`DELETE FROM product_images WHERE product_id = ${id}`;

    // Insert new images
    const validImages = images.filter(img => img.image_url && img.image_url.trim() !== '');
    for (const image of validImages) {
      await db.query`
        INSERT INTO product_images (product_id, image_url, alt, is_primary, color)
        VALUES (${id}, ${image.image_url}, ${image.alt || ''}, ${image.is_primary}, ${image.color || null})
      `;
    }

    // Delete existing colors
    await db.query`DELETE FROM product_spec_colors WHERE product_id = ${id}`;

    // Insert new colors
    const validColors = colors.filter(c => c.color && c.color.trim() !== '');
    for (const color of validColors) {
      await db.query`
        INSERT INTO product_spec_colors (product_id, color, image_url)
        VALUES (${id}, ${color.color}, ${color.image_url || ''})
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Images and colors updated successfully',
      imagesCount: validImages.length,
      colorsCount: validColors.length,
    });

  } catch (error) {
    console.error('Error updating images:', error);
    return NextResponse.json({
      error: 'Failed to update images and colors',
    }, { status: 500 });
  }
}
