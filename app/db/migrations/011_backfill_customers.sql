-- Migration 011: Backfill the customer master from existing data (CRM Phase 1)
-- Creates one customer per distinct normalized phone across orders, kitchen_orders
-- and individual_orders, links every historical row, and computes spend aggregates
-- from real purchases (the `orders` table). Idempotent / safe to re-run.

-- =====================================================
-- 1. Create customers from `orders` (most authoritative — real purchases first)
--    Latest order per phone wins for name/email.
-- =====================================================
INSERT INTO customers (phone, email, first_name, last_name)
SELECT phone, email, first_name, last_name
FROM (
  SELECT
    normalize_ua_phone(user_phone) AS phone,
    LOWER(NULLIF(user_email, '')) AS email,
    NULLIF(user_name, '') AS first_name,
    NULLIF(user_surname, '') AS last_name,
    ROW_NUMBER() OVER (
      PARTITION BY normalize_ua_phone(user_phone)
      ORDER BY created_at DESC
    ) AS rn
  FROM orders
  WHERE normalize_ua_phone(user_phone) IS NOT NULL
) t
WHERE rn = 1
ON CONFLICT (phone) DO NOTHING;

-- =====================================================
-- 2. Create customers from kitchen_orders (leads — only if phone not seen yet)
-- =====================================================
INSERT INTO customers (phone, email, first_name, last_name)
SELECT phone, email, first_name, last_name
FROM (
  SELECT
    normalize_ua_phone(phone) AS phone,
    LOWER(NULLIF(email, '')) AS email,
    NULLIF(first_name, '') AS first_name,
    NULLIF(last_name, '') AS last_name,
    ROW_NUMBER() OVER (
      PARTITION BY normalize_ua_phone(phone)
      ORDER BY created_at DESC
    ) AS rn
  FROM kitchen_orders
  WHERE normalize_ua_phone(phone) IS NOT NULL
) t
WHERE rn = 1
ON CONFLICT (phone) DO NOTHING;

-- =====================================================
-- 3. Create customers from individual_orders (leads — only if phone not seen yet)
-- =====================================================
INSERT INTO customers (phone, email, first_name, last_name)
SELECT phone, email, first_name, last_name
FROM (
  SELECT
    normalize_ua_phone(phone) AS phone,
    LOWER(NULLIF(email, '')) AS email,
    NULLIF(first_name, '') AS first_name,
    NULLIF(last_name, '') AS last_name,
    ROW_NUMBER() OVER (
      PARTITION BY normalize_ua_phone(phone)
      ORDER BY created_at DESC
    ) AS rn
  FROM individual_orders
  WHERE normalize_ua_phone(phone) IS NOT NULL
) t
WHERE rn = 1
ON CONFLICT (phone) DO NOTHING;

-- =====================================================
-- 4. Link historical rows to their customer (only where not yet linked)
-- =====================================================
UPDATE orders o
SET customer_id = c.id
FROM customers c
WHERE c.phone = normalize_ua_phone(o.user_phone)
  AND o.customer_id IS NULL;

UPDATE kitchen_orders k
SET customer_id = c.id
FROM customers c
WHERE c.phone = normalize_ua_phone(k.phone)
  AND k.customer_id IS NULL;

UPDATE individual_orders i
SET customer_id = c.id
FROM customers c
WHERE c.phone = normalize_ua_phone(i.phone)
  AND i.customer_id IS NULL;

-- =====================================================
-- 5. Recompute spend aggregates from real purchases (orders only)
-- =====================================================
UPDATE customers c
SET total_orders = agg.cnt,
    total_spent = agg.spent,
    last_order_at = agg.last_at
FROM (
  SELECT customer_id,
         COUNT(*) AS cnt,
         COALESCE(SUM(total_amount), 0) AS spent,
         MAX(created_at) AS last_at
  FROM orders
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) agg
WHERE c.id = agg.customer_id;
