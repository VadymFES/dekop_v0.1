-- Migration 017: Store LiqPay error code on failed orders
-- Stores the raw err_code from LiqPay webhook callbacks so the order-success
-- page can display a localized Ukrainian error message without exposing the
-- raw code to the user.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_err_code VARCHAR(100);
