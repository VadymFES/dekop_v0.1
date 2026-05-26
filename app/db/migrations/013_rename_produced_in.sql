-- Migration 013: Rename stock movement type purchase_in to produced_in
-- dekop.com.ua is a furniture producer, not a reseller.
-- Uses a DO block to find and drop the CHECK constraint by content
-- so the name does not need to be hard-coded.

DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'stock_movements'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%purchase_in%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE stock_movements DROP CONSTRAINT %I', cname);
  END IF;
END;
$$;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_type_check
  CHECK (type IN ('produced_in', 'order_out', 'adjustment', 'return_in'));

UPDATE stock_movements SET type = 'produced_in' WHERE type = 'purchase_in';
