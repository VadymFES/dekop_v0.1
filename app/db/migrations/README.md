# Database Migrations

This directory contains SQL migration files for the Dekop e-commerce database.

## Running Migrations

Since this project uses Vercel PostgreSQL, you need to run migrations manually using the Vercel CLI or pgAdmin.

### Option 1: Using Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Run the migration
vercel env pull .env.local
psql $POSTGRES_URL < app/db/migrations/001_create_orders_tables.sql
```

### Option 2: Using Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to Storage → Your Postgres database
3. Click on "Query" tab
4. Copy and paste the SQL from `001_create_orders_tables.sql`
5. Click "Run Query"

### Option 3: Using psql directly

```bash
# Make sure you have your database URL from Vercel
psql "postgres://username:password@host/database" < app/db/migrations/001_create_orders_tables.sql
```

## Migration Files

| File | Description | Date |
|------|-------------|------|
| `001_create_orders_tables.sql` | Creates orders and order_items tables with indexes and triggers | 2025-11-15 |

## Schema Overview

### orders table
- Stores complete order information including customer details, delivery, and payment
- Unique order numbers in format: `#1234567890`
- Supports multiple delivery methods: Nova Poshta, courier, store pickup
- Supports multiple payment methods: Stripe, Monobank, cash on delivery
- Tracks order status and payment status separately

### order_items table
- Stores snapshot of products at time of order
- Prevents issues when product details change later
- Includes product name, price, color, and image at time of purchase
- Links to products table via product_id (but not a foreign key)

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling
- Automatic `updated_at` triggers are set up for both tables
- Indexes are created for common query patterns (email lookups, status filtering, etc.)
- Product information is denormalized in order_items to preserve order history
