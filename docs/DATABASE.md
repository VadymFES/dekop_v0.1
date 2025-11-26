# Database Configuration Guide

## Overview

This application uses **Vercel Postgres** with automatic connection pooling via **PgBouncer**. This guide covers database configuration, connection pooling, and best practices for high-traffic scenarios.

## Connection Pooling

### What is PgBouncer?

PgBouncer is a lightweight connection pooler for PostgreSQL that sits between your application and the database. It significantly improves performance by:

- Reusing existing database connections instead of creating new ones
- Reducing connection overhead and database load
- Handling many more concurrent clients than direct connections
- Managing connection limits efficiently

### Default Configuration

Vercel Postgres comes with **pre-configured connection pooling** optimized for most applications:

| Setting | Hobby Plan | Pro Plan | Description |
|---------|-----------|----------|-------------|
| Max Connections | 20 | 100 | Maximum concurrent connections allowed |
| Pool Mode | transaction | transaction | How connections are pooled |
| Default Pool Size | 20 | 20 | Connections per user/database pair |
| Min Pool Size | 10 | 10 | Minimum connections to maintain |
| Connect Timeout | 30s | 30s | Max time to establish connection |
| Idle Timeout | 600s | 600s | Max idle time before disconnect |

### Pool Modes Explained

PgBouncer supports three pool modes:

1. **Transaction Mode** (Default - Recommended)
   - Connections are pooled per transaction
   - Best balance of performance and compatibility
   - Works with most applications
   - **Use this unless you have specific requirements**

2. **Session Mode**
   - One connection per client session
   - Required for prepared statements
   - Less efficient pooling but full PostgreSQL feature support
   - Use if your app needs session-level features

3. **Statement Mode**
   - Most aggressive pooling (per SQL statement)
   - Highest performance but limited compatibility
   - Multi-statement transactions won't work
   - Only use for very specific read-heavy scenarios

## Configuration for High-Traffic Scenarios

### When to Adjust Settings

Consider customizing connection pool settings if you experience:

- **Connection exhaustion errors** (too many clients)
- **High request latency** during traffic spikes
- **Database connection timeouts**
- **"Sorry, the database connection pool is full"** errors

### Recommended High-Traffic Configuration

Add these environment variables to your `.env.local` or Vercel project settings:

```bash
# Increase maximum concurrent connections (Pro plan)
PGBOUNCER_MAX_CLIENT_CONN=200

# Keep default transaction mode for best compatibility
PGBOUNCER_POOL_MODE=transaction

# Increase pool size for heavy traffic
PGBOUNCER_DEFAULT_POOL_SIZE=50

# Maintain minimum connections for faster response
PGBOUNCER_MIN_POOL_SIZE=20

# Reduce timeout for faster failure detection
PGBOUNCER_CONNECT_TIMEOUT=20

# Set query timeout to prevent connection exhaustion
PGBOUNCER_QUERY_TIMEOUT=60

# Reduce idle timeout to free connections faster
PGBOUNCER_IDLE_TRANSACTION_TIMEOUT=300
```

### Configuration by Traffic Level

#### Low Traffic (< 1,000 req/day)
```bash
# Use defaults - no configuration needed
```

#### Medium Traffic (1,000 - 10,000 req/day)
```bash
PGBOUNCER_MAX_CLIENT_CONN=100
PGBOUNCER_DEFAULT_POOL_SIZE=30
PGBOUNCER_QUERY_TIMEOUT=60
```

#### High Traffic (10,000 - 100,000 req/day)
```bash
PGBOUNCER_MAX_CLIENT_CONN=200
PGBOUNCER_DEFAULT_POOL_SIZE=50
PGBOUNCER_MIN_POOL_SIZE=25
PGBOUNCER_QUERY_TIMEOUT=45
PGBOUNCER_IDLE_TRANSACTION_TIMEOUT=300
```

#### Very High Traffic (> 100,000 req/day)
```bash
PGBOUNCER_MAX_CLIENT_CONN=500
PGBOUNCER_DEFAULT_POOL_SIZE=100
PGBOUNCER_MIN_POOL_SIZE=50
PGBOUNCER_QUERY_TIMEOUT=30
PGBOUNCER_IDLE_TRANSACTION_TIMEOUT=180
PGBOUNCER_CONNECT_TIMEOUT=15
```

**Note:** Very high traffic configurations require Vercel Pro or Enterprise plan.

## Best Practices

### 1. Application-Level Optimizations

Before adjusting pool settings, optimize your application:

```typescript
// ✅ GOOD: Use connection pooling efficiently
export async function getProducts() {
  // Single query with joins
  const result = await db.query`
    SELECT p.*, pi.image_url
    FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id
  `;
  return result.rows;
}

// ❌ BAD: Multiple sequential queries
export async function getProducts() {
  const products = await db.query`SELECT * FROM products`;
  for (const product of products.rows) {
    // This creates N+1 queries - kills connection pool!
    const images = await db.query`SELECT * FROM product_images WHERE product_id = ${product.id}`;
  }
}
```

### 2. Connection Management

```typescript
// ✅ GOOD: Let the pool handle connections
async function handler(req: Request) {
  const result = await db.query`SELECT * FROM products`;
  return Response.json(result.rows);
  // Connection automatically returned to pool
}

// ❌ BAD: Don't hold connections longer than needed
async function handler(req: Request) {
  const result = await db.query`SELECT * FROM products`;
  await new Promise(resolve => setTimeout(resolve, 5000)); // Holding connection!
  return Response.json(result.rows);
}
```

### 3. Query Optimization

```typescript
// ✅ GOOD: Efficient query with pagination
const products = await db.query`
  SELECT * FROM products
  WHERE category = ${category}
  ORDER BY created_at DESC
  LIMIT 20 OFFSET ${page * 20}
`;

// ❌ BAD: Loading all data at once
const products = await db.query`
  SELECT * FROM products WHERE category = ${category}
`;
```

### 4. Error Handling

```typescript
// ✅ GOOD: Proper error handling
try {
  const result = await db.query`SELECT * FROM products`;
  return result.rows;
} catch (error) {
  console.error('Database error:', error);
  // Connection is released even on error
  throw error;
}
```

### 5. Use Caching

Reduce database load by caching frequently accessed data:

```typescript
// Example: Cache product catalog
export async function GET(request: Request) {
  const products = await db.query`SELECT * FROM products`;

  return NextResponse.json(products.rows, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
```

## Monitoring

### Performance Monitoring

The application includes built-in query performance monitoring in `app/lib/db.ts`:

```typescript
// Automatically logs slow queries (>100ms)
// Check your application logs for warnings like:
// ⚠️ Slow query (250ms) [1/100 slow]: SELECT * FROM products...
```

### Query Statistics

Access query statistics in your application:

```typescript
import { db } from '@/app/lib/db';

const stats = db.getStats();
console.log(stats);
// {
//   totalQueries: 1000,
//   slowQueries: 50,
//   slowQueryPercentage: 5.0
// }
```

### Vercel Monitoring

Monitor your database performance in Vercel:

1. Go to your project dashboard
2. Navigate to **Storage** → **Your Database**
3. Check the **Metrics** tab for:
   - Active connections
   - Query duration
   - Connection pool usage
   - Error rates

## Troubleshooting

### Connection Pool Exhaustion

**Symptom:** "Sorry, the database connection pool is full" errors

**Solutions:**
1. Increase `PGBOUNCER_MAX_CLIENT_CONN` and `PGBOUNCER_DEFAULT_POOL_SIZE`
2. Reduce `PGBOUNCER_IDLE_TRANSACTION_TIMEOUT` to free connections faster
3. Optimize queries to execute faster
4. Add query timeout: `PGBOUNCER_QUERY_TIMEOUT=60`
5. Check for connection leaks in your code

### Slow Queries

**Symptom:** High latency, timeout errors

**Solutions:**
1. Check slow query logs (>100ms)
2. Add database indexes for frequently queried columns
3. Optimize complex joins
4. Use pagination for large result sets
5. Implement caching for frequently accessed data

### Connection Timeouts

**Symptom:** "Connection timeout" errors

**Solutions:**
1. Increase `PGBOUNCER_CONNECT_TIMEOUT` (default: 30s)
2. Check network connectivity
3. Verify database is not overloaded
4. Consider upgrading Vercel plan for more database resources

### Transaction Deadlocks

**Symptom:** "Deadlock detected" errors

**Solutions:**
1. Keep transactions short
2. Access tables in consistent order
3. Use row-level locking judiciously
4. Reduce `PGBOUNCER_IDLE_TRANSACTION_TIMEOUT`

## Scaling Considerations

### Vertical Scaling (Upgrade Database)

Upgrade your Vercel Postgres plan for:
- More connections (Hobby: 20 → Pro: 100)
- More storage
- Better performance
- Higher availability

### Horizontal Scaling (Read Replicas)

For very high traffic:
1. Use Vercel Postgres read replicas
2. Route read queries to replicas
3. Route write queries to primary
4. Implement caching layer (Redis, CDN)

### Application Scaling

Optimize your application architecture:
- Use edge caching (CDN)
- Implement Redis for session storage
- Use static generation for product pages
- Implement incremental static regeneration (ISR)

## Environment Variables Reference

See `.env.example` for all available configuration options.

### Required
- `POSTGRES_URL` - Automatically provided by Vercel

### Optional (Pool Configuration)
- `PGBOUNCER_MAX_CLIENT_CONN` - Max concurrent connections
- `PGBOUNCER_POOL_MODE` - Pool mode (transaction/session/statement)
- `PGBOUNCER_DEFAULT_POOL_SIZE` - Default pool size
- `PGBOUNCER_MIN_POOL_SIZE` - Minimum pool size
- `PGBOUNCER_CONNECT_TIMEOUT` - Connection timeout (seconds)
- `PGBOUNCER_QUERY_TIMEOUT` - Query timeout (seconds)
- `PGBOUNCER_IDLE_TRANSACTION_TIMEOUT` - Idle timeout (seconds)

## Resources

- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [PostgreSQL Connection Pooling Best Practices](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Next.js Database Best Practices](https://nextjs.org/docs/app/building-your-application/data-fetching)

## Support

For issues or questions:
1. Check Vercel Postgres metrics dashboard
2. Review application logs for database errors
3. Contact Vercel support for plan-specific issues
4. See `app/lib/db.ts` for query performance monitoring
