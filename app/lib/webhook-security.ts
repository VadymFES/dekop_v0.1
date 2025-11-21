// app/lib/webhook-security.ts

/**
 * Webhook Security Utilities
 * Provides protection against replay attacks and IP validation
 */

import { NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * Checks if a webhook has already been processed using database-backed deduplication
 *
 * SECURITY: Prevents replay attacks by tracking webhook IDs in the database
 * This works in serverless/distributed environments unlike in-memory Maps
 * Each webhook can only be processed once within the TTL window
 *
 * @param webhookId - Unique identifier for the webhook (e.g., transaction ID, invoice ID)
 * @param provider - Payment provider name ('liqpay', 'monobank', 'other')
 * @param ttlSeconds - Time to live in seconds (default: 1 hour)
 * @param eventData - Optional webhook payload for debugging
 * @returns true if webhook is new and should be processed, false if already processed
 */
export async function isWebhookUnique(
  webhookId: string,
  provider: 'liqpay' | 'monobank' | 'other' = 'other',
  ttlSeconds: number = 3600,
  eventData?: Record<string, any>
): Promise<boolean> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    // Check if webhook was already processed and hasn't expired
    const existingResult = await sql`
      SELECT id, processed_at, expires_at
      FROM webhook_events
      WHERE webhook_id = ${webhookId}
        AND expires_at > ${now.toISOString()}
      LIMIT 1
    `;

    if (existingResult.rows.length > 0) {
      console.warn(`[SECURITY] Replay attack detected: Webhook ${webhookId} already processed at ${existingResult.rows[0].processed_at}`);

      // Update as duplicate attempt
      await sql`
        UPDATE webhook_events
        SET processing_status = 'duplicate'
        WHERE webhook_id = ${webhookId}
      `;

      return false;
    }

    // Mark webhook as processed in database
    await sql`
      INSERT INTO webhook_events (
        webhook_id,
        provider,
        event_data,
        expires_at,
        processing_status
      ) VALUES (
        ${webhookId},
        ${provider},
        ${eventData ? JSON.stringify(eventData) : null},
        ${expiresAt.toISOString()},
        'processed'
      )
    `;

    console.log(`[SECURITY] Webhook ${webhookId} marked as processed, expires at ${expiresAt.toISOString()}`);
    return true;

  } catch (error) {
    console.error(`Error checking webhook uniqueness for ${webhookId}:`, error);

    // FALLBACK: If database fails, use in-memory cache as backup
    // This prevents system failures from blocking legitimate webhooks
    console.warn('[SECURITY] Database check failed, using in-memory fallback (NOT SUITABLE FOR PRODUCTION DISTRIBUTED SYSTEMS)');

    // In-memory fallback for critical situations
    if (!inMemoryFallbackCache.has(webhookId)) {
      inMemoryFallbackCache.set(webhookId, {
        timestamp: Date.now(),
        expiresAt: Date.now() + (ttlSeconds * 1000)
      });
      return true;
    }

    const cached = inMemoryFallbackCache.get(webhookId)!;
    if (cached.expiresAt > Date.now()) {
      return false;
    }

    // Update expired entry
    inMemoryFallbackCache.set(webhookId, {
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
    return true;
  }
}

/**
 * In-memory fallback cache for webhook deduplication
 * ONLY used when database is unavailable
 * WARNING: This does NOT work in serverless/distributed environments
 */
interface ProcessedWebhook {
  timestamp: number;
  expiresAt: number;
}

const inMemoryFallbackCache = new Map<string, ProcessedWebhook>();

// Cleanup expired entries from fallback cache every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of inMemoryFallbackCache.entries()) {
      if (value.expiresAt < now) {
        inMemoryFallbackCache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Records a failed webhook processing attempt
 *
 * @param webhookId - Unique identifier for the webhook
 * @param provider - Payment provider name
 * @param errorMessage - Error message describing the failure
 * @param ttlSeconds - Time to live in seconds (default: 1 hour)
 */
export async function recordWebhookFailure(
  webhookId: string,
  provider: 'liqpay' | 'monobank' | 'other',
  errorMessage: string,
  ttlSeconds: number = 3600
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    await sql`
      INSERT INTO webhook_events (
        webhook_id,
        provider,
        expires_at,
        processing_status,
        error_message
      ) VALUES (
        ${webhookId},
        ${provider},
        ${expiresAt.toISOString()},
        'failed',
        ${errorMessage}
      )
      ON CONFLICT (webhook_id) DO UPDATE
      SET processing_status = 'failed',
          error_message = ${errorMessage}
    `;
  } catch (error) {
    console.error(`Error recording webhook failure for ${webhookId}:`, error);
  }
}

/**
 * Cleans up expired webhook events from the database
 * Should be called periodically (e.g., via a cron job)
 *
 * @returns Number of expired webhooks deleted
 */
export async function cleanupExpiredWebhooks(): Promise<number> {
  try {
    const result = await sql`SELECT cleanup_expired_webhooks() as deleted_count`;
    const deletedCount = result.rows[0]?.deleted_count || 0;
    console.log(`[CLEANUP] Removed ${deletedCount} expired webhook events`);
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired webhooks:', error);
    return 0;
  }
}

/**
 * IP Whitelist for webhook endpoints
 *
 * SECURITY: Only allow webhooks from trusted payment provider IPs
 * This provides an additional layer of security beyond signature verification
 */

/**
 * LiqPay IP Whitelist
 *
 * CONFIGURATION OPTIONS:
 * 1. Add actual LiqPay IPs here when available
 * 2. Leave empty and set DISABLE_WEBHOOK_IP_VALIDATION=true if IPs not available
 * 3. Contact LiqPay support to request webhook IP ranges
 *
 * Example IPs (UPDATE WITH ACTUAL IPs):
 */
const LIQPAY_IP_WHITELIST = [
  '99.83.131.17',
  '75.2.86.201',
  '54.229.105.178',
  '54.229.105.179',
  '34.255.91.122',
  '34.253.252.244',
  '54.171.60.13',
  '217.117.76.0/24'
];

/**
 * Monobank IP Whitelist
 *
 * CONFIGURATION OPTIONS:
 * 1. Add actual Monobank IPs here when available
 * 2. Leave empty and set DISABLE_WEBHOOK_IP_VALIDATION=true if IPs not available
 * 3. Contact Monobank support to request webhook IP ranges
 *
 * NOTE: Many payment providers use cloud infrastructure with dynamic IPs.
 * If IPs are not available, disable IP validation and rely on signature verification.
 */
const MONOBANK_IP_WHITELIST = [
  '18.203.190.118'
];

/**
 * Validates if an IP address is within an IP range (CIDR notation)
 */
function isIpInRange(ip: string, range: string): boolean {
  // Simple CIDR check - for production, use a library like 'ipaddr.js'
  const [rangeIp, maskBits] = range.split('/');

  if (!maskBits) {
    // Exact IP match
    return ip === rangeIp;
  }

  // For CIDR ranges, use a proper library in production
  // This is a simplified check
  const ipParts = ip.split('.');
  const rangeParts = rangeIp.split('.');
  const mask = parseInt(maskBits, 10);

  // Check first octets based on mask
  const octetsToCheck = Math.floor(mask / 8);
  for (let i = 0; i < octetsToCheck; i++) {
    if (ipParts[i] !== rangeParts[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Validates if the request comes from a whitelisted IP address
 *
 * IMPORTANT: IP validation is OPTIONAL. If you cannot obtain payment provider IPs,
 * you can disable this check by setting the environment variable:
 * DISABLE_WEBHOOK_IP_VALIDATION=true
 *
 * Signature verification (Layer 2) is the PRIMARY security mechanism.
 * IP validation is just an additional defense layer.
 *
 * @param request - Next.js request object
 * @param provider - Payment provider ('liqpay' or 'monobank')
 * @returns validation result with IP information
 */
export function validateWebhookIp(
  request: NextRequest | Request,
  provider: 'liqpay' | 'monobank'
): { valid: boolean; clientIp?: string; reason?: string } {
  // Skip IP validation in development
  if (process.env.NODE_ENV === 'development') {
    return { valid: true, reason: 'Development mode - IP check skipped' };
  }

  // Allow disabling IP validation if provider IPs are not available
  // This is safe because signature verification is the primary security mechanism
  if (process.env.DISABLE_WEBHOOK_IP_VALIDATION === 'true') {
    console.log(`[SECURITY] IP validation disabled for ${provider} webhook (signature verification still active)`);
    return { valid: true, reason: 'IP validation disabled via environment variable' };
  }

  // Get client IP from various headers (Vercel, CloudFlare, etc.)
  let clientIp: string | null = null;

  if ('headers' in request && typeof request.headers.get === 'function') {
    clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      null;
  }

  if (!clientIp) {
    console.error('Unable to determine client IP for webhook validation');
    // Don't fail webhook if IP cannot be determined - rely on signature verification
    console.warn(`[SECURITY] Cannot determine IP for ${provider} webhook, allowing based on signature verification`);
    return {
      valid: true,
      reason: 'IP cannot be determined - relying on signature verification',
    };
  }

  // Select appropriate whitelist
  const whitelist =
    provider === 'liqpay' ? LIQPAY_IP_WHITELIST : MONOBANK_IP_WHITELIST;

  // If whitelist is empty or contains only placeholder IPs, skip validation
  const hasRealIPs = whitelist.some(ip =>
    !ip.includes('0.0.0.0') &&
    !ip.includes('UPDATE_ME') &&
    ip.trim() !== ''
  );

  if (!hasRealIPs) {
    console.warn(
      `[SECURITY] No real IPs configured for ${provider}, skipping IP validation. ` +
      `Consider adding IPs or setting DISABLE_WEBHOOK_IP_VALIDATION=true`
    );
    return {
      valid: true,
      clientIp,
      reason: 'No IPs configured - relying on signature verification',
    };
  }

  // Check if IP is in whitelist
  const isWhitelisted = whitelist.some((range) => isIpInRange(clientIp!, range));

  if (!isWhitelisted) {
    console.warn(
      `[SECURITY WARNING] Webhook IP validation failed for ${provider}: ${clientIp} not in whitelist`
    );
    return {
      valid: false,
      clientIp,
      reason: 'IP address not in whitelist',
    };
  }

  console.log(`[SECURITY] IP validation passed for ${provider}: ${clientIp}`);
  return { valid: true, clientIp };
}

/**
 * Validates webhook timestamp to prevent old/replay attacks
 *
 * @param timestamp - Unix timestamp from webhook (in seconds or milliseconds)
 * @param maxAgeSeconds - Maximum age of webhook in seconds (default: 5 minutes)
 * @returns true if timestamp is recent enough, false if too old
 */
export function validateWebhookTimestamp(
  timestamp: number,
  maxAgeSeconds: number = 300
): boolean {
  const now = Date.now();

  // Convert to milliseconds if timestamp is in seconds
  const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;

  const age = now - timestampMs;
  const maxAgeMs = maxAgeSeconds * 1000;

  if (age > maxAgeMs) {
    console.warn(`Webhook timestamp too old: ${age}ms (max: ${maxAgeMs}ms)`);
    return false;
  }

  // Also reject timestamps from the future (clock skew tolerance: 1 minute)
  if (age < -60000) {
    console.warn(`Webhook timestamp is in the future: ${age}ms`);
    return false;
  }

  return true;
}

/**
 * Cleanup function - useful for testing
 * Clears both in-memory fallback cache and database records
 */
export async function clearProcessedWebhooks(): Promise<void> {
  // Clear in-memory fallback cache
  inMemoryFallbackCache.clear();

  // Clear database records (for testing only)
  try {
    await sql`DELETE FROM webhook_events`;
    console.log('[TEST] Cleared all webhook events from database');
  } catch (error) {
    console.error('Error clearing webhook events:', error);
  }
}
