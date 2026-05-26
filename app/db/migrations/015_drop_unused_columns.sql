ALTER TABLE IF EXISTS webhook_events
  DROP COLUMN IF EXISTS event_type,
  DROP COLUMN IF EXISTS source_ip,
  DROP COLUMN IF EXISTS user_agent;

ALTER TABLE IF EXISTS stock_movements
  DROP COLUMN IF EXISTS warehouse_id;

DROP TABLE IF EXISTS warehouses;
