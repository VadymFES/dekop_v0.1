DO $block$
DECLARE cname TEXT;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'stock_movements'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%produced_in%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE stock_movements DROP CONSTRAINT %I', cname);
  END IF;
END;
$block$;

ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_type_check
  CHECK (type IN ('produced_in', 'order_out', 'adjustment', 'return_in', 'write_off'));
