# Database Migrations

This directory contains SQL migration scripts for the Dekop furniture e-commerce application.

## Migration Files

1. **001_create_orders_tables.sql** - Orders and order items tables
2. **002_add_performance_indexes.sql** - Performance optimization indexes
3. **003_create_webhook_deduplication_table.sql** - Webhook deduplication
4. **004_create_users_and_gdpr_tables.sql** - Users, sessions, carts, and GDPR compliance tables

## Tables Created in Migration 004

### User Management
- **users** - User accounts (optional, for future authentication)

### Session Security (Phase 2)
- **sessions** - User sessions with token hashing (SHA-256)
- **csrf_tokens** - CSRF protection tokens

### Shopping Cart
- **carts** - Shopping cart containers
- **cart_items** - Items within shopping carts

### GDPR Compliance (Phase 3)
- **user_consents** - User consent management (Article 7)
- **privacy_policy_acceptances** - Privacy policy tracking
- **gdpr_audit_log** - Audit trail for GDPR actions
- **data_deletion_requests** - Right to erasure requests (Article 17)

## How to Run Migrations

### Option 1: Using psql (Recommended)

```bash
# Connect to your database and run the migration
psql $DATABASE_URL -f app/db/migrations/004_create_users_and_gdpr_tables.sql
```

### Option 2: Using Vercel Postgres CLI

```bash
# If using Vercel Postgres
vercel env pull .env.local
# Then use the connection string from .env.local
psql "$(grep POSTGRES_URL .env.local | cut -d= -f2-)" -f app/db/migrations/004_create_users_and_gdpr_tables.sql
```

## Cleanup Functions

The migration includes several utility functions for maintenance:

### Clean Up Expired Sessions
```sql
SELECT cleanup_expired_sessions();
```

### Clean Up Expired CSRF Tokens
```sql
SELECT cleanup_expired_csrf_tokens();
```

### Clean Up Expired Carts
```sql
SELECT cleanup_expired_carts();
```

### Process Scheduled Deletions
```sql
SELECT process_scheduled_deletions();
```

## GDPR Compliance

This schema supports:
- ✅ **Article 7**: Conditions for consent
- ✅ **Article 17**: Right to erasure (Right to be Forgotten)
- ✅ **Article 20**: Right to data portability

### Consent Types Supported
- marketing, analytics, cookies, data_processing, third_party_sharing

### Data Deletion Process (No Verification Required)
1. User requests deletion → Immediately confirmed with 30-day grace period
2. User can cancel during grace period using request ID
3. After 30 days, status changes to 'processing'
4. Data anonymized or deleted based on legal requirements
5. User receives notification after completion
