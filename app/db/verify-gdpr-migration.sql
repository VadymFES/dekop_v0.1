-- Verification Script for GDPR Migration 004
-- Run this to verify all GDPR components were created successfully
-- Usage: psql $POSTGRES_URL -f app/db/verify-gdpr-migration.sql

\echo '========================================='
\echo 'GDPR Migration Verification'
\echo '========================================='
\echo ''

-- 1. Check GDPR Tables
\echo '1. Checking GDPR Tables...'
SELECT
  CASE
    WHEN COUNT(*) = 4 THEN '✓ SUCCESS: All 4 GDPR tables exist'
    ELSE '✗ ERROR: Only ' || COUNT(*) || ' of 4 GDPR tables exist'
  END as result
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_consents', 'privacy_policy_acceptances', 'gdpr_audit_log', 'data_deletion_requests');

\echo ''

-- 2. List all GDPR tables with row counts
\echo '2. GDPR Tables with Row Counts:'
SELECT
  t.table_name,
  (SELECT COUNT(*) FROM user_consents) as rows
FROM information_schema.tables t
WHERE t.table_name = 'user_consents' AND t.table_schema = 'public'
UNION ALL
SELECT
  t.table_name,
  (SELECT COUNT(*) FROM privacy_policy_acceptances) as rows
FROM information_schema.tables t
WHERE t.table_name = 'privacy_policy_acceptances' AND t.table_schema = 'public'
UNION ALL
SELECT
  t.table_name,
  (SELECT COUNT(*) FROM gdpr_audit_log) as rows
FROM information_schema.tables t
WHERE t.table_name = 'gdpr_audit_log' AND t.table_schema = 'public'
UNION ALL
SELECT
  t.table_name,
  (SELECT COUNT(*) FROM data_deletion_requests) as rows
FROM information_schema.tables t
WHERE t.table_name = 'data_deletion_requests' AND t.table_schema = 'public';

\echo ''

-- 3. Check Carts Table Columns
\echo '3. Checking carts table GDPR columns...'
SELECT
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns
WHERE table_name = 'carts'
  AND column_name IN ('user_email', 'session_id', 'metadata')
ORDER BY column_name;

\echo ''

-- 4. Check Cleanup Functions
\echo '4. Checking cleanup functions...'
SELECT
  CASE
    WHEN COUNT(*) = 4 THEN '✓ SUCCESS: All 4 cleanup functions exist'
    ELSE '✗ ERROR: Only ' || COUNT(*) || ' of 4 cleanup functions exist'
  END as result
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'cleanup_expired_sessions',
    'cleanup_expired_csrf_tokens',
    'cleanup_expired_carts',
    'process_scheduled_deletions'
  );

\echo ''

-- 5. List cleanup functions
\echo '5. Cleanup Functions:'
SELECT
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'cleanup_expired_sessions',
    'cleanup_expired_csrf_tokens',
    'cleanup_expired_carts',
    'process_scheduled_deletions',
    'update_user_consents_updated_at',
    'update_deletion_requests_updated_at'
  )
ORDER BY p.proname;

\echo ''

-- 6. Check Triggers
\echo '6. Checking triggers...'
SELECT
  CASE
    WHEN COUNT(*) >= 2 THEN '✓ SUCCESS: Triggers exist'
    ELSE '✗ WARNING: Only ' || COUNT(*) || ' triggers found'
  END as result
FROM pg_trigger
WHERE tgname IN ('user_consents_updated_at_trigger', 'deletion_requests_updated_at_trigger');

\echo ''

-- 7. List triggers
\echo '7. GDPR Triggers:'
SELECT
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname IN ('user_consents_updated_at_trigger', 'deletion_requests_updated_at_trigger')
ORDER BY t.tgname;

\echo ''

-- 8. Check Indexes
\echo '8. Checking GDPR indexes...'
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename IN ('user_consents', 'privacy_policy_acceptances', 'gdpr_audit_log', 'data_deletion_requests')
    OR indexname LIKE 'idx_carts_user_email%'
    OR indexname LIKE 'idx_carts_session_id%'
  )
ORDER BY tablename, indexname;

\echo ''

-- 9. Test Cleanup Functions
\echo '9. Testing cleanup functions...'
SELECT
  'cleanup_expired_sessions' as function_name,
  cleanup_expired_sessions() as records_cleaned
UNION ALL
SELECT
  'cleanup_expired_csrf_tokens' as function_name,
  cleanup_expired_csrf_tokens() as records_cleaned
UNION ALL
SELECT
  'cleanup_expired_carts' as function_name,
  cleanup_expired_carts() as records_cleaned;

\echo ''

-- 10. Summary
\echo '========================================='
\echo 'Migration Verification Complete'
\echo '========================================='
\echo ''
\echo 'Expected Results:'
\echo '  - 4 GDPR tables created'
\echo '  - 3 additional columns in carts table'
\echo '  - 6 functions created (4 cleanup + 2 trigger functions)'
\echo '  - 2 triggers created'
\echo '  - 13+ indexes created'
\echo ''
\echo 'If all checks show ✓ SUCCESS, migration completed successfully!'
\echo 'The warnings about triggers not existing during DROP are normal.'
\echo ''
