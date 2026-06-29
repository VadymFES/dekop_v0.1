-- Migration 016: Add cart_id to orders for multi-tab duplicate prevention
-- Adds cart_id column and unique constraint so two browser tabs cannot
-- create two separate orders from the same cart.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cart_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS orders_cart_id_unique
  ON orders (cart_id)
  WHERE cart_id IS NOT NULL;
