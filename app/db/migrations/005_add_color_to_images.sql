-- Add Color to Product Images
-- Migration 005: Link product images with colors
-- This allows displaying specific images when a user selects a product color
-- Created: 2025-12-06

-- ============================================================================
-- ADD COLOR COLUMN TO PRODUCT_IMAGES
-- ============================================================================

-- Add color column to product_images table
-- NULL means the image is a "general" image shown for all colors
-- Non-NULL value links the image to a specific color
ALTER TABLE product_images
ADD COLUMN IF NOT EXISTS color VARCHAR(100) DEFAULT NULL;

-- Add index for color-based image filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_color
  ON product_images(product_id, color);

-- ============================================================================
-- NOTES
-- ============================================================================

-- Images with NULL color are "general" images shown for all color variants
-- Images with a specific color value are shown when that color is selected
--
-- Example usage:
-- - Image with color=NULL: Always shown (e.g., detail shots, dimensions)
-- - Image with color='Сірий': Only shown when 'Сірий' color is selected
-- - Image with color='Бежевий': Only shown when 'Бежевий' color is selected
--
-- Frontend logic:
-- 1. If user hasn't selected a color: Show all images (or first color's images)
-- 2. If user selected a color: Show images where color=selectedColor OR color IS NULL
