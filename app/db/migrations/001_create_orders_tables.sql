-- Migration: Create orders and order_items tables
-- Created: 2025-11-15
-- Description: Creates tables for order management, payment tracking, and order items

-- =====================================================
-- TABLE: orders
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(15) NOT NULL UNIQUE, -- Format: #1234567890

  -- Customer Information
  user_name VARCHAR(100) NOT NULL,
  user_surname VARCHAR(100) NOT NULL,
  user_phone VARCHAR(20) NOT NULL,
  user_email VARCHAR(255) NOT NULL,

  -- Delivery Information
  delivery_method VARCHAR(50) NOT NULL CHECK (delivery_method IN ('nova_poshta', 'store_delivery', 'pickup')),
  delivery_address TEXT,
  delivery_city VARCHAR(100),
  delivery_street VARCHAR(255),
  delivery_building VARCHAR(20),
  delivery_apartment VARCHAR(20),
  delivery_postal_code VARCHAR(10),
  store_location VARCHAR(255), -- For store pickup

  -- Pricing
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5, 2) DEFAULT 0,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  delivery_cost NUMERIC(10, 2) DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  prepayment_amount NUMERIC(10, 2) DEFAULT 0, -- Передплата

  -- Payment Information
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('stripe', 'monobank', 'cash_on_delivery')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_intent_id VARCHAR(255), -- Stripe/Monobank transaction ID

  -- Order Status
  order_status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (order_status IN ('processing', 'confirmed', 'shipped', 'delivered', 'cancelled')),

  -- Additional Information
  customer_notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  payment_deadline TIMESTAMP WITH TIME ZONE, -- Deadline for prepayment
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- TABLE: order_items
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Product Information (snapshot at time of order)
  product_id INTEGER NOT NULL, -- Reference to products.id (not FK to allow product changes)
  product_name VARCHAR(255) NOT NULL,
  product_slug VARCHAR(255),
  product_article VARCHAR(50), -- Article number (e.g., "97695454-875676")

  -- Order Details
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  color VARCHAR(100),

  -- Pricing (snapshot at time of order)
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL, -- quantity * unit_price

  -- Product Snapshot
  product_image_url TEXT,
  product_category VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(user_email);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id ON orders(payment_intent_id);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp on orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Trigger to update updated_at timestamp on order_items
CREATE OR REPLACE FUNCTION update_order_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_items_updated_at_trigger
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_items_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE orders IS 'Stores customer orders with payment and delivery information';
COMMENT ON TABLE order_items IS 'Stores individual items within orders (product snapshot)';

COMMENT ON COLUMN orders.order_number IS 'Unique order number in format #1234567890';
COMMENT ON COLUMN orders.delivery_method IS 'nova_poshta: Nova Poshta delivery, store_delivery: Courier delivery, pickup: Store pickup';
COMMENT ON COLUMN orders.payment_method IS 'stripe: International card payment, monobank: Ukrainian bank payment, cash_on_delivery: Pay on delivery';
COMMENT ON COLUMN orders.payment_status IS 'pending: Awaiting payment, paid: Payment completed, failed: Payment failed, refunded: Payment refunded';
COMMENT ON COLUMN orders.order_status IS 'processing: Order received, confirmed: Order confirmed, shipped: Order shipped, delivered: Order delivered, cancelled: Order cancelled';
COMMENT ON COLUMN orders.prepayment_amount IS 'Amount to be paid upfront (передплата)';
COMMENT ON COLUMN order_items.product_article IS 'Product article/SKU number for reference';
