-- Migration 012: Inventory module
-- Adds warehouses table and stock_movements ledger (append-only).
-- A trigger keeps products.stock in sync with the ledger sum.
-- Phase 4 procurement will add purchase_in movements on goods receipt.

-- TABLE: warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_default
  ON warehouses (is_default) WHERE is_default = true;

INSERT INTO warehouses (name, is_default)
SELECT 'Головний склад', true
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE is_default = true);

-- TABLE: stock_movements (append-only ledger)
-- quantity is signed: negative for order_out, positive for purchase_in/return_in/adjustment
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('purchase_in', 'order_out', 'adjustment', 'return_in')),
  quantity INTEGER NOT NULL,
  reference_type VARCHAR(30),
  reference_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_id ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- REORDER LEVEL columns on products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS reorder_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS reorder_qty INTEGER NOT NULL DEFAULT 0;

-- FUNCTION: recompute products.stock from ledger on every insert
CREATE OR REPLACE FUNCTION sync_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM stock_movements
    WHERE product_id = NEW.product_id
  )
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stock_movements_sync_stock ON stock_movements;
CREATE TRIGGER stock_movements_sync_stock
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_stock();

-- SEED: convert existing products.stock values into initial adjustment movements.
-- Runs only for products with stock > 0 that have no movements yet.
-- All semicolons are safe here because the body is inside a dollar-quoted block.
DO $$
DECLARE
  wh_id UUID;
BEGIN
  SELECT id INTO wh_id FROM warehouses WHERE is_default = true LIMIT 1;
  IF wh_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO stock_movements (product_id, warehouse_id, type, quantity, notes)
  SELECT
    p.id,
    wh_id,
    'adjustment',
    p.stock,
    'Initial balance'
  FROM products p
  WHERE p.stock > 0
    AND NOT EXISTS (
      SELECT 1 FROM stock_movements sm WHERE sm.product_id = p.id
    );
END;
$$;
