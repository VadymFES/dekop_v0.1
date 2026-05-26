-- Migration 010: Customer master (CRM Phase 1)
-- Creates the `customers` table — a single mutable record per buyer, deduplicated
-- by normalized Ukrainian phone — and links orders, kitchen_orders and
-- individual_orders to it via a nullable customer_id FK.
-- The per-order inline customer fields (orders.user_name/user_phone/...) are kept
-- as the immutable snapshot at order time - customer_id points to the live master.
-- B2B columns (company_name/tax_id/is_vat_payer) are nullable now and exist to
-- support the planned transition from ФОП to ТОВ without a later reshape.

-- =====================================================
-- FUNCTION: normalize_ua_phone — canonical +380XXXXXXXXX form
-- Mirrors app/lib/crm/phone.ts so SQL backfill and app code agree on dedup keys.
-- =====================================================
CREATE OR REPLACE FUNCTION normalize_ua_phone(raw TEXT)
RETURNS TEXT AS $$
DECLARE
  digits TEXT;
BEGIN
  IF raw IS NULL THEN
    RETURN NULL;
  END IF;

  digits := regexp_replace(raw, '\D', '', 'g');

  IF digits = '' THEN
    RETURN NULL;
  END IF;

  -- 380XXXXXXXXX (12 digits, full country code)
  IF length(digits) = 12 AND left(digits, 3) = '380' THEN
    RETURN '+' || digits;
  END IF;

  -- 0XXXXXXXXX (10 digits, national leading zero)
  IF length(digits) = 10 AND left(digits, 1) = '0' THEN
    RETURN '+38' || digits;
  END IF;

  -- XXXXXXXXX (9 significant digits)
  IF length(digits) = 9 THEN
    RETURN '+380' || digits;
  END IF;

  -- Fallback: best-effort, keep digits with a leading '+'
  RETURN '+' || digits;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- TABLE: customers
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (phone is the primary dedup key in Ukraine)
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),

  -- Classification + B2B / ТОВ-readiness (nullable now)
  customer_type VARCHAR(20) NOT NULL DEFAULT 'individual'
    CHECK (customer_type IN ('individual', 'business')),
  company_name VARCHAR(255),
  tax_id VARCHAR(20),                       -- ЄДРПОУ / ІПН
  is_vat_payer BOOLEAN NOT NULL DEFAULT false,

  -- CRM / segmentation
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,

  -- Denormalized aggregates (maintained by app + backfill)
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
  last_order_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_customers_last_order_at ON customers(last_order_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent DESC);
CREATE INDEX IF NOT EXISTS idx_customers_tags ON customers USING GIN(tags);

-- =====================================================
-- LINK EXISTING TABLES TO THE CUSTOMER MASTER
-- ON DELETE SET NULL: deleting a customer never destroys order history.
-- =====================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE kitchen_orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE individual_orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_customer_id ON kitchen_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_individual_orders_customer_id ON individual_orders(customer_id);

-- =====================================================
-- TRIGGER: keep customers.updated_at fresh
-- =====================================================
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at_trigger ON customers;
CREATE TRIGGER customers_updated_at_trigger
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE customers IS 'Customer master (CRM). One mutable record per buyer, deduplicated by normalized phone.';
COMMENT ON COLUMN customers.phone IS 'Canonical +380XXXXXXXXX form - unique dedup key';
COMMENT ON COLUMN customers.tax_id IS 'ЄДРПОУ/ІПН - for B2B / ТОВ invoicing';
COMMENT ON COLUMN customers.total_spent IS 'Denormalized sum of orders.total_amount for this customer';
COMMENT ON COLUMN orders.customer_id IS 'Link to customer master - inline user_* fields remain the order-time snapshot';
