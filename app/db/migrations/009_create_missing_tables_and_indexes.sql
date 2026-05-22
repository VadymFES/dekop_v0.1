-- Migration 009: Create missing tables and add kitchen table indexes
-- Promotes kitchen_orders and individual_orders from runtime DDL to proper migrations.
-- Adds sort indexes for kitchen_cards and kitchen_gallery to eliminate slow ORDER BY scans.

CREATE TABLE IF NOT EXISTS kitchen_orders (
  id          SERIAL PRIMARY KEY,
  last_name   VARCHAR(100) NOT NULL,
  first_name  VARCHAR(100) NOT NULL,
  patronymic  VARCHAR(100) NOT NULL DEFAULT '',
  phone       VARCHAR(20)  NOT NULL,
  email       VARCHAR(255) NOT NULL,
  region      VARCHAR(100) NOT NULL DEFAULT '',
  city        VARCHAR(100) NOT NULL DEFAULT '',
  corpus      VARCHAR(60)  NOT NULL DEFAULT '',
  worktop     VARCHAR(60)  NOT NULL DEFAULT '',
  fittings    VARCHAR(60)  NOT NULL DEFAULT '',
  colors      TEXT         NOT NULL DEFAULT '',
  appliances  TEXT         NOT NULL DEFAULT '',
  comment     TEXT         NOT NULL DEFAULT '',
  status      VARCHAR(30)  NOT NULL DEFAULT 'new',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS individual_orders (
  id            SERIAL PRIMARY KEY,
  last_name     VARCHAR(100) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  patronymic    VARCHAR(100),
  phone         VARCHAR(20)  NOT NULL,
  email         VARCHAR(200),
  region        VARCHAR(100) NOT NULL,
  city          VARCHAR(100) NOT NULL,
  product_types TEXT,
  colors        TEXT,
  construction  VARCHAR(60),
  image_url     TEXT,
  comment       TEXT,
  status        VARCHAR(30) DEFAULT 'new',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ORDER BY sort_order ASC, created_at ASC queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kitchen_cards_sort
  ON kitchen_cards(sort_order ASC, created_at ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kitchen_gallery_sort
  ON kitchen_gallery(sort_order ASC, created_at ASC);

-- Indexes for admin order listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kitchen_orders_created
  ON kitchen_orders(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_individual_orders_created
  ON individual_orders(created_at DESC);
