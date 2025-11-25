-- Migration: Create users, sessions, carts, and GDPR compliance tables
-- Created: 2025-11-25
-- Description: Creates tables for user management, session security, cart functionality, and GDPR compliance

-- =====================================================
-- TABLE: users (Optional - for future authentication)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100),
  surname VARCHAR(100),
  phone VARCHAR(20),

  -- Account status
  email_verified BOOLEAN DEFAULT FALSE,
  account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- TABLE: sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) NOT NULL UNIQUE,
  session_token_hash VARCHAR(255) NOT NULL, -- SHA-256 hash of session token
  user_id VARCHAR(255), -- Can be email or UUID

  -- Session metadata
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,
  metadata JSONB, -- Additional session data

  -- Session status
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: csrf_tokens
-- =====================================================
CREATE TABLE IF NOT EXISTS csrf_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) NOT NULL UNIQUE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,

  -- Token status
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- =====================================================
-- TABLE: carts
-- =====================================================
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL, -- User identifier (can be temporary)
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

  -- Cart metadata
  metadata JSONB, -- Additional cart data (discounts, coupons, etc.)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- =====================================================
-- TABLE: cart_items
-- =====================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,

  -- Product information
  product_id INTEGER NOT NULL,
  product_slug VARCHAR(255),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  color VARCHAR(100),

  -- Pricing (cached for performance)
  unit_price NUMERIC(10, 2),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- =====================================================
-- INDEXES
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_session_token_hash ON sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- CSRF tokens indexes
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_token ON csrf_tokens(token);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_session_id ON csrf_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires_at ON csrf_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_used ON csrf_tokens(used);

-- Carts indexes
CREATE INDEX IF NOT EXISTS idx_carts_user_email ON carts(user_email);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_carts_expires_at ON carts(expires_at);
CREATE INDEX IF NOT EXISTS idx_carts_updated_at ON carts(updated_at DESC);

-- Cart items indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

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
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp on users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- Trigger to update updated_at timestamp on sessions
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at_trigger
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_updated_at();

-- Trigger to update updated_at timestamp on carts
CREATE OR REPLACE FUNCTION update_carts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER carts_updated_at_trigger
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_carts_updated_at();

-- Trigger to update updated_at timestamp on cart_items
CREATE OR REPLACE FUNCTION update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cart_items_updated_at_trigger
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_items_updated_at();

-- Trigger to update updated_at timestamp on user_consents
CREATE OR REPLACE FUNCTION update_user_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER deletion_requests_updated_at_trigger
  BEFORE UPDATE ON data_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_deletion_requests_updated_at();

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up expired sessions
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

-- Function to clean up expired CSRF tokens
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

-- Function to clean up expired carts
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
-- COMMENTS
-- =====================================================

COMMENT ON TABLE users IS 'User accounts (optional - for future authentication)';
COMMENT ON TABLE sessions IS 'User sessions for security and session management';
COMMENT ON TABLE csrf_tokens IS 'CSRF tokens for protecting state-changing operations';
COMMENT ON TABLE carts IS 'Shopping carts for users';
COMMENT ON TABLE cart_items IS 'Items within shopping carts';
COMMENT ON TABLE user_consents IS 'GDPR Article 7: User consents for data processing';
COMMENT ON TABLE privacy_policy_acceptances IS 'Privacy policy acceptance tracking';
COMMENT ON TABLE gdpr_audit_log IS 'Audit trail for all GDPR-related actions';
COMMENT ON TABLE data_deletion_requests IS 'GDPR Article 17: Right to erasure requests';

COMMENT ON COLUMN sessions.session_token_hash IS 'SHA-256 hash of session token for secure storage';
COMMENT ON COLUMN sessions.revoked IS 'Whether the session has been manually revoked';
COMMENT ON COLUMN csrf_tokens.used IS 'Whether the token has been used (one-time use)';
COMMENT ON COLUMN user_consents.consent_type IS 'Type of consent: marketing, analytics, cookies, data_processing, third_party_sharing';
COMMENT ON COLUMN user_consents.version IS 'Version of the consent text that was accepted';
COMMENT ON COLUMN data_deletion_requests.scheduled_for IS 'Date when deletion will occur (30 days from request)';
COMMENT ON COLUMN data_deletion_requests.status IS 'Status: confirmed (immediately upon request), processing, completed, or cancelled';

-- =====================================================
-- INITIAL DATA (Optional)
-- =====================================================

-- You can add initial privacy policy version or default consents here if needed
-- Example:
-- INSERT INTO privacy_policy_acceptances (user_email, policy_version, accepted_at)
-- VALUES ('system@example.com', '1.0', CURRENT_TIMESTAMP);
