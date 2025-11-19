-- Performance Optimization Indexes for Dekop E-commerce
-- Migration 002: Add critical indexes to improve query performance
-- Expected Impact: 50% reduction in query execution time
-- Created: 2025-11-18

-- ============================================================================
-- PRODUCTS TABLE INDEXES
-- ============================================================================

-- Index for category filtering (most common query)
-- Used in: /api/products?category=...
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category
  ON products(category);

-- Index for featured products (homepage query)
-- Used in: Homepage to fetch featured/new/on-sale products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_featured
  ON products(is_on_sale, is_new, is_bestseller)
  WHERE is_on_sale = true OR is_new = true OR is_bestseller = true;

-- Index for price filtering (catalog queries)
-- Used in: /api/products?maxPrice=...
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price
  ON products(price);

-- Index for slug lookups (product detail pages)
-- Used in: /api/products/[slug]
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_slug
  ON products(slug);

-- Index for newest products sorting
-- Used in: Product listings sorted by created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_desc
  ON products(created_at DESC);

-- Note: Removed idx_products_active - 'active' column does not exist in schema
-- Note: Removed idx_products_category_active - 'active' column does not exist

-- ============================================================================
-- PRODUCT IMAGES TABLE INDEXES
-- ============================================================================

-- Index for fetching product images (most common JOIN)
-- Used in: Every product query joins product_images
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_product_id
  ON product_images(product_id);

-- Index for primary image lookup
-- Used in: Fetching primary product image for cards
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_primary
  ON product_images(product_id, is_primary)
  WHERE is_primary = true;

-- ============================================================================
-- PRODUCT SPEC COLORS TABLE INDEXES
-- ============================================================================

-- Index for color variants lookup
-- Used in: Product detail pages to show available colors
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_colors_product_id
  ON product_spec_colors(product_id);

-- ============================================================================
-- REVIEWS TABLE INDEXES
-- ============================================================================

-- Index for product reviews lookup
-- Used in: /api/products/reviews/[productId]
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_product_id
  ON reviews(product_id);

-- Index for review count and average rating calculation
-- Used in: Aggregating review stats
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_product_rating
  ON reviews(product_id, rating);

-- ============================================================================
-- CATEGORY-SPECIFIC SPECS TABLES INDEXES
-- ============================================================================

-- Corner Sofa Specs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_corner_sofa_specs_product
  ON corner_sofa_specs(product_id);

-- Sofa Specs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sofa_specs_product
  ON sofa_specs(product_id);

-- Sofa Bed Specs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sofa_bed_specs_product
  ON sofa_bed_specs(product_id);

-- Chair Specs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chair_specs_product
  ON chair_specs(product_id);

-- Table Specs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_table_specs_product
  ON table_specs(product_id);

-- Bed Specs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bed_specs_product
  ON bed_specs(product_id);

-- Mattress Specs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mattress_specs_product
  ON mattress_specs(product_id);

-- Wardrobe Specs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wardrobe_specs_product
  ON wardrobe_specs(product_id);

-- Accessory Specs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accessory_specs_product
  ON accessory_specs(product_id);

-- ============================================================================
-- CART TABLE INDEXES
-- ============================================================================

-- Index for cart items by cart_id
-- Used in: Fetching all items in a cart
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_cart_id
  ON cart_items(cart_id);

-- Index for cart items by product_id
-- Used in: Checking if product is in cart
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_product_id
  ON cart_items(product_id);

-- Composite index for cart operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_cart_product
  ON cart_items(cart_id, product_id);

-- ============================================================================
-- ORDERS TABLE INDEXES
-- ============================================================================

-- Index for customer order lookup
-- Used in: Fetching orders by email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_email
  ON orders(customer_email);

-- Index for recent orders
-- Used in: Admin dashboard, order history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_desc
  ON orders(created_at DESC);

-- Index for order status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status
  ON orders(status);

-- Index for order payment status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_payment_status
  ON orders(payment_status);

-- ============================================================================
-- ORDER ITEMS TABLE INDEXES
-- ============================================================================

-- Index for order items by order_id
-- Used in: Fetching all items in an order
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id
  ON order_items(order_id);

-- Index for order items by product_id
-- Used in: Analytics, product popularity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product_id
  ON order_items(product_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- To verify indexes were created successfully, run:
-- SELECT tablename, indexname, indexdef FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- To check index usage statistics:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- To analyze query performance with indexes:
-- EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'Диван';

-- ============================================================================
-- NOTES
-- ============================================================================

-- CONCURRENTLY keyword allows index creation without locking the table
-- This is safe for production databases with active traffic
-- Index creation time: ~1-5 seconds per index depending on table size
-- Total migration time: ~2-5 minutes for all indexes

-- Expected performance improvements:
-- - Product category queries: 50-70% faster
-- - Product detail pages: 40-60% faster
-- - Cart operations: 30-50% faster
-- - Order queries: 40-60% faster
-- - Review aggregations: 60-80% faster

-- Monitor index usage after deployment to ensure they're being used
-- Drop unused indexes after 30 days if idx_scan = 0
