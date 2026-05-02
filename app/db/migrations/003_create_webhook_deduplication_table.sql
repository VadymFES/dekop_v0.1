-- Migration: Create webhook_events table for deduplication
-- Created: 2025-11-21
-- Description: Creates a table to track processed webhooks for replay attack prevention in distributed/serverless environments

-- =====================================================
-- TABLE: webhook_events
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Webhook Identification
  webhook_id VARCHAR(255) NOT NULL UNIQUE, -- Unique identifier from payment provider (transaction ID, invoice ID, etc.)
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('liqpay', 'monobank', 'other')),

  -- Event Details
  event_type VARCHAR(100), -- Type of webhook event (payment_success, payment_failed, etc.)
  event_data JSONB, -- Store the full webhook payload for debugging

  -- Tracking
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- TTL for automatic cleanup

  -- Request Details (for debugging)
  source_ip VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,

  -- Result
  processing_status VARCHAR(20) DEFAULT 'processed' CHECK (processing_status IN ('processed', 'failed', 'duplicate')),
  error_message TEXT
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_id ON webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_expires_at ON webhook_events(expires_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON webhook_events(processed_at DESC);

-- =====================================================
-- CLEANUP FUNCTION
-- =====================================================
-- Function to clean up expired webhook events
CREATE OR REPLACE FUNCTION cleanup_expired_webhooks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_events
  WHERE expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE webhook_events IS 'Tracks processed webhooks for replay attack prevention in distributed environments';
COMMENT ON COLUMN webhook_events.webhook_id IS 'Unique identifier from payment provider (e.g., transaction ID, invoice ID)';
COMMENT ON COLUMN webhook_events.expires_at IS 'Expiration time for automatic cleanup (TTL)';
COMMENT ON COLUMN webhook_events.processing_status IS 'Result of webhook processing';

-- =====================================================
-- OPTIONAL: Create a scheduled job to clean up expired webhooks
-- =====================================================
-- Note: This requires pg_cron extension or external cron job
-- If using Vercel Postgres, you can set up a separate API endpoint
-- that calls cleanup_expired_webhooks() on a schedule (e.g., via Vercel Cron)
--
-- Example with pg_cron (if available):
-- SELECT cron.schedule('cleanup-expired-webhooks', '0 * * * *', 'SELECT cleanup_expired_webhooks()');
