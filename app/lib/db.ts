/**
 * Database Query Wrapper with Performance Monitoring
 *
 * This module wraps @vercel/postgres sql function with performance logging.
 * Note: @vercel/postgres already handles connection pooling internally,
 * so we don't need to implement it ourselves.
 *
 * Performance Benefits:
 * - Logs slow queries for monitoring (>100ms)
 * - Tracks query statistics
 * - Better error messages with query context
 */

import { sql } from '@vercel/postgres';

// Query statistics for monitoring
let totalQueries = 0;
let slowQueries = 0;

/**
 * Execute a SQL query with performance monitoring
 * Wrapper around @vercel/postgres sql that adds logging
 */
export const db = {
  /**
   * Execute a parameterized SQL query
   * Uses template literals for safe parameterization
   *
   * @example
   * ```typescript
   * const result = await db.query`SELECT * FROM products WHERE id = ${productId}`;
   * ```
   */
  query: async (strings: TemplateStringsArray | string, ...values: any[]) => {
    const start = Date.now();

    try {
      // Handle both template literal and string queries
      const result = typeof strings === 'string'
        ? await sql.query(strings, values)
        : await sql(strings, ...values);

      const duration = Date.now() - start;
      totalQueries++;

      // Log slow queries (>100ms) for monitoring
      if (duration > 100) {
        slowQueries++;
        const queryText = typeof strings === 'string'
          ? strings
          : strings.join('?');
        console.warn(
          `⚠️ Slow query (${duration}ms) [${slowQueries}/${totalQueries} slow]:`,
          queryText.substring(0, 100) + '...'
        );
      }

      // Log query stats every 100 queries in development
      if (process.env.NODE_ENV === 'development' && totalQueries % 100 === 0) {
        console.log(
          `📊 Query Stats: ${totalQueries} total, ${slowQueries} slow (${((slowQueries / totalQueries) * 100).toFixed(1)}%)`
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      const queryText = typeof strings === 'string'
        ? strings
        : strings.join('?');

      console.error(
        `❌ Database error (${duration}ms):`,
        error instanceof Error ? error.message : 'Unknown error',
        '\nQuery:',
        queryText.substring(0, 100) + '...'
      );
      throw error;
    }
  },

  /**
   * Get query statistics for monitoring
   */
  getStats: () => ({
    totalQueries,
    slowQueries,
    slowQueryPercentage: totalQueries > 0 ? (slowQueries / totalQueries) * 100 : 0,
  }),
};

export default db;
