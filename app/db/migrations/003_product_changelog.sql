-- Product Changelog Table
-- Tracks all changes made to products in the admin panel

CREATE TABLE IF NOT EXISTS product_changelog (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  admin_id INTEGER NOT NULL,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted'
  changes JSONB, -- stores the old and new values for each changed field
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by product
CREATE INDEX IF NOT EXISTS idx_product_changelog_product_id ON product_changelog(product_id);

-- Index for filtering by admin
CREATE INDEX IF NOT EXISTS idx_product_changelog_admin_id ON product_changelog(admin_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_product_changelog_created_at ON product_changelog(created_at DESC);
