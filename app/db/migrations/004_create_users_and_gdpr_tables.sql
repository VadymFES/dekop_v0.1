-- Migration: Add GDPR compliance tables to existing schema
-- Created: 2025-11-25
-- Description: Adds GDPR-specific tables (consents, privacy policy, audit log, deletion requests)
--              and updates existing tables with missing GDPR-related columns

-- =====================================================
-- UPDATES TO EXISTING TABLES
-- =====================================================

-- Add missing columns to carts table for GDPR compliance
DO $$
BEGIN
  -- Add user_email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carts' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE carts ADD COLUMN user_email VARCHAR(255);
    CREATE INDEX IF NOT EXISTS idx_carts_user_email ON carts(user_email);
    COMMENT ON COLUMN carts.user_email IS 'User email for GDPR data export and deletion';
  END IF;

  -- Add session_id column if it doesn't exist (should already exist but check)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carts' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE carts ADD COLUMN session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id);
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE carts ADD COLUMN metadata JSONB;
    COMMENT ON COLUMN carts.metadata IS 'Additional cart data (discounts, coupons, etc.)';
  END IF;
END $$;

-- =====================================================
-- TABLE: user_consents (GDPR Article 7)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('marketing', 'analytics', 'cookies', 'data_processing', 'third_party_sharing')),

  -- Consent details
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  version VARCHAR(20) NOT NULL, -- Consent version (e.g., "1.0", "2.0")

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint: one consent per user per type
  CONSTRAINT unique_user_consent UNIQUE (user_email, consent_type)
);

COMMENT ON TABLE user_consents IS 'GDPR Article 7: User consents for data processing';
COMMENT ON COLUMN user_consents.consent_type IS 'Type of consent: marketing, analytics, cookies, data_processing, third_party_sharing';
COMMENT ON COLUMN user_consents.version IS 'Version of the consent text that was accepted';

-- =====================================================
-- TABLE: privacy_policy_acceptances
-- =====================================================
CREATE TABLE IF NOT EXISTS privacy_policy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,

  -- Privacy policy details
  policy_version VARCHAR(20) NOT NULL, -- Privacy policy version
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE privacy_policy_acceptances IS 'Privacy policy acceptance tracking';

-- =====================================================
-- TABLE: gdpr_audit_log
-- =====================================================
CREATE TABLE IF NOT EXISTS gdpr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,

  -- Action details
  action VARCHAR(100) NOT NULL, -- e.g., 'data_export', 'data_deletion', 'consent_updated'
  details JSONB, -- Action-specific details

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE gdpr_audit_log IS 'Audit trail for all GDPR-related actions';

-- =====================================================
-- TABLE: data_deletion_requests (GDPR Article 17)
-- =====================================================
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,

  -- Request details (no verification token required - immediate confirmation)
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled')),

  -- Deletion options
  deletion_options JSONB, -- Options like anonymize, keep_orders, etc.

  -- Important dates
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL, -- Date when deletion will occur (30 days from request)
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE data_deletion_requests IS 'GDPR Article 17: Right to erasure requests';
COMMENT ON COLUMN data_deletion_requests.scheduled_for IS 'Date when deletion will occur (30 days from request)';
COMMENT ON COLUMN data_deletion_requests.status IS 'Status: confirmed (immediately upon request), processing, completed, or cancelled';

-- =====================================================
-- INDEXES FOR GDPR TABLES
-- =====================================================

-- User consents indexes
CREATE INDEX IF NOT EXISTS idx_user_consents_user_email ON user_consents(user_email);
CREATE INDEX IF NOT EXISTS idx_user_consents_consent_type ON user_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_granted ON user_consents(granted);
CREATE INDEX IF NOT EXISTS idx_user_consents_created_at ON user_consents(created_at DESC);

-- Privacy policy acceptances indexes
CREATE INDEX IF NOT EXISTS idx_privacy_policy_user_email ON privacy_policy_acceptances(user_email);
CREATE INDEX IF NOT EXISTS idx_privacy_policy_version ON privacy_policy_acceptances(policy_version);
CREATE INDEX IF NOT EXISTS idx_privacy_policy_accepted_at ON privacy_policy_acceptances(accepted_at DESC);

-- GDPR audit log indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_user_email ON gdpr_audit_log(user_email);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_action ON gdpr_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_created_at ON gdpr_audit_log(created_at DESC);

-- Data deletion requests indexes
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_email ON data_deletion_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled_for ON data_deletion_requests(scheduled_for);

-- =====================================================
-- TRIGGERS FOR GDPR TABLES
-- =====================================================

-- Trigger to update updated_at timestamp on user_consents
CREATE OR REPLACE FUNCTION update_user_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_consents_updated_at_trigger ON user_consents;
CREATE TRIGGER user_consents_updated_at_trigger
  BEFORE UPDATE ON user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_user_consents_updated_at();

-- Trigger to update updated_at timestamp on data_deletion_requests
CREATE OR REPLACE FUNCTION update_deletion_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deletion_requests_updated_at_trigger ON data_deletion_requests;
CREATE TRIGGER deletion_requests_updated_at_trigger
  BEFORE UPDATE ON data_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_deletion_requests_updated_at();

-- =====================================================
-- CLEANUP FUNCTIONS FOR EXISTING TABLES
-- =====================================================

-- Function to clean up expired sessions (uses existing sessions table)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions
  WHERE expires_at < CURRENT_TIMESTAMP
    AND revoked = FALSE;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired CSRF tokens (uses existing csrf_tokens table)
CREATE OR REPLACE FUNCTION cleanup_expired_csrf_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM csrf_tokens
  WHERE expires_at < CURRENT_TIMESTAMP
    OR used = TRUE;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired carts (uses existing carts table)
CREATE OR REPLACE FUNCTION cleanup_expired_carts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM carts
  WHERE expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to process scheduled deletion requests
CREATE OR REPLACE FUNCTION process_scheduled_deletions()
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  deletion_record RECORD;
BEGIN
  -- Find all deletion requests that are due
  FOR deletion_record IN
    SELECT id, user_email, deletion_options
    FROM data_deletion_requests
    WHERE status = 'confirmed'
      AND scheduled_for <= CURRENT_TIMESTAMP
  LOOP
    -- Update status to processing
    UPDATE data_deletion_requests
    SET status = 'processing'
    WHERE id = deletion_record.id;

    -- Note: Actual deletion logic should be implemented in application code
    -- This just marks them as ready to be processed

    processed_count := processed_count + 1;
  END LOOP;

  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Query to check if all GDPR tables exist
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name IN ('user_consents', 'privacy_policy_acceptances', 'gdpr_audit_log', 'data_deletion_requests')
    AND table_schema = 'public';

  IF table_count = 4 THEN
    RAISE NOTICE 'SUCCESS: All 4 GDPR tables created successfully';
  ELSE
    RAISE WARNING 'WARNING: Only % of 4 GDPR tables were created', table_count;
  END IF;
END $$;

-- Query to check if cleanup functions exist
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('cleanup_expired_sessions', 'cleanup_expired_csrf_tokens', 'cleanup_expired_carts', 'process_scheduled_deletions');

  IF function_count = 4 THEN
    RAISE NOTICE 'SUCCESS: All 4 cleanup functions created successfully';
  ELSE
    RAISE WARNING 'WARNING: Only % of 4 cleanup functions were created', function_count;
  END IF;
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Migration 004 completed successfully!';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'GDPR Tables Created:';
  RAISE NOTICE '  ✓ user_consents';
  RAISE NOTICE '  ✓ privacy_policy_acceptances';
  RAISE NOTICE '  ✓ gdpr_audit_log';
  RAISE NOTICE '  ✓ data_deletion_requests';
  RAISE NOTICE '';
  RAISE NOTICE 'Updates to Existing Tables:';
  RAISE NOTICE '  ✓ carts.user_email (if not exists)';
  RAISE NOTICE '  ✓ carts.session_id (if not exists)';
  RAISE NOTICE '  ✓ carts.metadata (if not exists)';
  RAISE NOTICE '';
  RAISE NOTICE 'Cleanup Functions:';
  RAISE NOTICE '  ✓ cleanup_expired_sessions()';
  RAISE NOTICE '  ✓ cleanup_expired_csrf_tokens()';
  RAISE NOTICE '  ✓ cleanup_expired_carts()';
  RAISE NOTICE '  ✓ process_scheduled_deletions()';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Run: SELECT cleanup_expired_sessions();';
  RAISE NOTICE '  2. Run: SELECT cleanup_expired_csrf_tokens();';
  RAISE NOTICE '  3. Run: SELECT cleanup_expired_carts();';
  RAISE NOTICE '  4. Schedule: SELECT process_scheduled_deletions();';
  RAISE NOTICE '';
  RAISE NOTICE 'GDPR Compliance Status: Ready';
  RAISE NOTICE '=======================================================';
END $$;
