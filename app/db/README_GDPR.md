# GDPR Database Management Guide

This guide explains how to manage the GDPR-related database components.

## Table of Contents
1. [Migration Status Messages](#migration-status-messages)
2. [Running the Migration](#running-the-migration)
3. [Verification](#verification)
4. [Cleanup Functions](#cleanup-functions)
5. [Common Queries](#common-queries)
6. [Troubleshooting](#troubleshooting)

---

## Migration Status Messages

### Expected Warnings (Safe to Ignore)

When running migration 004 for the first time, you'll see these messages:

```
NOTICE:  trigger "user_consents_updated_at_trigger" does not exist, skipping
NOTICE:  trigger "deletion_requests_updated_at_trigger" does not exist, skipping
```

**These are NORMAL** ✅ - The migration uses `DROP TRIGGER IF EXISTS` to ensure clean creation. If the triggers don't exist yet (first run), PostgreSQL skips the drop and shows this notice.

### Expected Success Messages

After successful migration, you should see:

```
NOTICE:  SUCCESS: All 4 GDPR tables created successfully
NOTICE:  SUCCESS: All 4 cleanup functions created successfully
NOTICE:  =======================================================
NOTICE:  Migration 004 completed successfully!
NOTICE:  =======================================================
```

---

## Running the Migration

### Method 1: Using npm script (Recommended)

```bash
npm run migrate:004
```

### Method 2: Using psql directly

```bash
psql $POSTGRES_URL -f app/db/migrations/004_create_users_and_gdpr_tables.sql
```

### Method 3: Using Vercel Postgres dashboard

1. Go to Vercel Dashboard → Storage → Your Database
2. Navigate to "Query" tab
3. Copy contents of `004_create_users_and_gdpr_tables.sql`
4. Execute the query

---

## Verification

After running the migration, verify everything was created successfully:

```bash
psql $POSTGRES_URL -f app/db/verify-gdpr-migration.sql
```

### Expected Output

```
1. Checking GDPR Tables...
✓ SUCCESS: All 4 GDPR tables exist

2. GDPR Tables with Row Counts:
   user_consents                  | 0 rows
   privacy_policy_acceptances     | 0 rows
   gdpr_audit_log                 | 0 rows
   data_deletion_requests         | 0 rows

3. Checking carts table GDPR columns...
   user_email  | character varying | NULL
   session_id  | uuid             | NULL
   metadata    | jsonb            | NULL

4. Checking cleanup functions...
✓ SUCCESS: All 4 cleanup functions exist

6. Checking triggers...
✓ SUCCESS: Triggers exist
```

---

## Cleanup Functions

The migration creates 4 cleanup functions for data retention compliance:

### 1. `cleanup_expired_sessions()`

Deletes expired and non-revoked sessions.

```sql
-- Run manually
SELECT cleanup_expired_sessions();
-- Returns: number of deleted sessions

-- Schedule with cron (recommended: daily at 2 AM)
-- Add to your cron job or scheduled task
```

### 2. `cleanup_expired_csrf_tokens()`

Deletes expired or used CSRF tokens.

```sql
-- Run manually
SELECT cleanup_expired_csrf_tokens();
-- Returns: number of deleted tokens

-- Recommended: Run hourly or daily
```

### 3. `cleanup_expired_carts()`

Deletes expired shopping carts (default: 30 days).

```sql
-- Run manually
SELECT cleanup_expired_carts();
-- Returns: number of deleted carts

-- Recommended: Run daily
```

### 4. `process_scheduled_deletions()`

Processes data deletion requests that are due.

```sql
-- Run manually
SELECT process_scheduled_deletions();
-- Returns: number of deletion requests marked for processing

-- ⚠️ IMPORTANT: Schedule this daily
-- Deletion requests with status='confirmed' and scheduled_for <= NOW()
-- will be marked as 'processing' for the application to handle
```

### Setting Up Automated Cleanup

#### Option 1: PostgreSQL pg_cron (if available)

```sql
-- Daily cleanup at 2 AM UTC
SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions();');
SELECT cron.schedule('cleanup-csrf', '0 2 * * *', 'SELECT cleanup_expired_csrf_tokens();');
SELECT cron.schedule('cleanup-carts', '0 2 * * *', 'SELECT cleanup_expired_carts();');
SELECT cron.schedule('process-deletions', '0 3 * * *', 'SELECT process_scheduled_deletions();');
```

#### Option 2: Application-level cron (Next.js)

Create `app/api/cron/cleanup/route.ts`:

```typescript
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Run cleanup functions
  const sessions = await sql`SELECT cleanup_expired_sessions()`;
  const csrf = await sql`SELECT cleanup_expired_csrf_tokens()`;
  const carts = await sql`SELECT cleanup_expired_carts()`;
  const deletions = await sql`SELECT process_scheduled_deletions()`;

  return Response.json({
    success: true,
    cleaned: {
      sessions: sessions.rows[0].cleanup_expired_sessions,
      csrf: csrf.rows[0].cleanup_expired_csrf_tokens,
      carts: carts.rows[0].cleanup_expired_carts,
      deletions: deletions.rows[0].process_scheduled_deletions,
    },
  });
}
```

Then configure Vercel Cron in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## Common Queries

### Check Consent Status for User

```sql
SELECT
  consent_type,
  granted,
  granted_at,
  version
FROM user_consents
WHERE user_email = 'user@example.com'
ORDER BY granted_at DESC;
```

### View Recent GDPR Actions

```sql
SELECT
  user_email,
  action,
  details,
  created_at
FROM gdpr_audit_log
ORDER BY created_at DESC
LIMIT 50;
```

### Check Pending Deletion Requests

```sql
SELECT
  user_email,
  scheduled_for,
  status,
  requested_at,
  EXTRACT(DAY FROM (scheduled_for - NOW())) as days_remaining
FROM data_deletion_requests
WHERE status IN ('pending', 'confirmed')
  AND scheduled_for > NOW()
ORDER BY scheduled_for ASC;
```

### Get Privacy Policy Acceptance Rate

```sql
SELECT
  policy_version,
  COUNT(DISTINCT user_email) as users_accepted,
  MIN(accepted_at) as first_acceptance,
  MAX(accepted_at) as latest_acceptance
FROM privacy_policy_acceptances
GROUP BY policy_version
ORDER BY policy_version DESC;
```

### Find Users Without Consent

```sql
-- Users with orders but no cookie consent
SELECT DISTINCT o.user_email
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM user_consents uc
  WHERE uc.user_email = o.user_email
    AND uc.consent_type = 'cookies'
    AND uc.granted = true
)
ORDER BY o.user_email;
```

---

## Troubleshooting

### Issue: Migration fails with "table already exists"

**Solution**: The migration uses `CREATE TABLE IF NOT EXISTS`, so this shouldn't happen. If it does:

```sql
-- Check which tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_consents', 'privacy_policy_acceptances', 'gdpr_audit_log', 'data_deletion_requests');

-- If tables exist but migration failed, manually create missing objects
-- Review the migration file to see what's missing
```

### Issue: Triggers not working

**Check trigger status**:

```sql
SELECT
  t.tgname as trigger_name,
  c.relname as table_name,
  t.tgenabled as enabled,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname LIKE '%updated_at_trigger%';
```

**Re-create triggers if needed**:

```sql
-- Drop and recreate
DROP TRIGGER IF EXISTS user_consents_updated_at_trigger ON user_consents;
CREATE TRIGGER user_consents_updated_at_trigger
  BEFORE UPDATE ON user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_user_consents_updated_at();
```

### Issue: Cleanup functions not deleting data

**Test individual function**:

```sql
-- Check what would be deleted first
SELECT COUNT(*) FROM sessions WHERE expires_at < NOW() AND revoked = FALSE;

-- Then run cleanup
SELECT cleanup_expired_sessions();

-- Verify deletion
SELECT COUNT(*) FROM sessions WHERE expires_at < NOW() AND revoked = FALSE;
-- Should be 0
```

### Issue: Foreign key constraint errors

**Check dependencies**:

```sql
-- View foreign key constraints on carts
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'carts';
```

---

## Data Retention Policies

According to GDPR and Ukrainian Law:

| Data Type | Retention Period | Auto-Cleanup |
|-----------|------------------|--------------|
| Active sessions | Until expiration | ✅ Yes (cleanup_expired_sessions) |
| CSRF tokens | Until expiration or use | ✅ Yes (cleanup_expired_csrf_tokens) |
| Shopping carts | 30 days after expiration | ✅ Yes (cleanup_expired_carts) |
| Deletion requests | 30-day grace period | ✅ Yes (process_scheduled_deletions) |
| Consent records | Indefinitely (audit trail) | ❌ No |
| Audit logs | 3-5 years (compliance) | ❌ No (manual review) |
| Order records | 5 years (tax law) | ❌ No (legal requirement) |

---

## Performance Monitoring

### Monitor Cleanup Performance

```sql
-- Create a monitoring table (optional)
CREATE TABLE IF NOT EXISTS cleanup_log (
  id SERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  records_cleaned INTEGER NOT NULL,
  execution_time INTERVAL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log cleanup results
INSERT INTO cleanup_log (function_name, records_cleaned, execution_time)
SELECT
  'cleanup_expired_sessions',
  cleanup_expired_sessions(),
  NOW() - start_time
FROM (SELECT NOW() as start_time) as timing;
```

### Check Table Sizes

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_consents', 'privacy_policy_acceptances', 'gdpr_audit_log', 'data_deletion_requests')
ORDER BY size_bytes DESC;
```

---

## Support

For GDPR compliance questions:
- **Privacy Email**: privacy@dekop.ua
- **DPO** (when appointed): dpo@dekop.ua
- **Technical Support**: Review `docs/API_GDPR_ENDPOINTS.md`

---

**Document Version**: 1.0
**Created**: November 2024
**Last Updated**: November 2024
