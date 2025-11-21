// app/lib/webhook-security.ts

/**
 * Webhook Security Utilities
 * Provides protection against replay attacks and IP validation
 */

import { NextRequest } from 'next/server';

// In-memory cache for tracking processed webhooks
// In production, use Redis or a database for distributed systems
interface ProcessedWebhook {
  timestamp: number;
  expiresAt: number;
}

const processedWebhooks = new Map<string, ProcessedWebhook>();

// Cleanup interval: remove expired entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Starts the cleanup timer to remove expired webhook entries
 */
function startCleanupTimer() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of processedWebhooks.entries()) {
      if (value.expiresAt < now) {
        processedWebhooks.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Prevent the timer from keeping the process alive
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Checks if a webhook has already been processed
 *
 * SECURITY: Prevents replay attacks by tracking webhook IDs
 * Each webhook can only be processed once within the TTL window
 *
 * @param webhookId - Unique identifier for the webhook (e.g., transaction ID, invoice ID)
 * @param ttlSeconds - Time to live in seconds (default: 1 hour)
 * @returns true if webhook is new and should be processed, false if already processed
 */
export function isWebhookUnique(
  webhookId: string,
  ttlSeconds: number = 3600
): boolean {
  startCleanupTimer();

  const now = Date.now();
  const existing = processedWebhooks.get(webhookId);

  // Check if webhook was already processed and hasn't expired
  if (existing && existing.expiresAt > now) {
    console.warn(`Replay attack detected: Webhook ${webhookId} already processed`);
    return false;
  }

  // Mark webhook as processed
  processedWebhooks.set(webhookId, {
    timestamp: now,
    expiresAt: now + (ttlSeconds * 1000),
  });

  return true;
}

/**
 * IP Whitelist for webhook endpoints
 *
 * SECURITY: Only allow webhooks from trusted payment provider IPs
 * This provides an additional layer of security beyond signature verification
 */

// LiqPay IP ranges (update based on official documentation)
const LIQPAY_IP_WHITELIST = [
  '91.226.25.0/24',    // LiqPay production IPs
  '77.120.109.0/24',   // LiqPay backup IPs
  // Add more IP ranges as provided by LiqPay
];

// Monobank IP ranges (update based on official documentation)
const MONOBANK_IP_WHITELIST = [
  '195.69.188.0/24',   // Monobank production IPs
  // Add more IP ranges as provided by Monobank
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
 * @param request - Next.js request object
 * @param provider - Payment provider ('liqpay' or 'monobank')
 * @returns true if IP is whitelisted, false otherwise
 */
export function validateWebhookIp(
  request: NextRequest | Request,
  provider: 'liqpay' | 'monobank'
): { valid: boolean; clientIp?: string; reason?: string } {
  // Skip IP validation in development
  if (process.env.NODE_ENV === 'development') {
    return { valid: true, reason: 'Development mode - IP check skipped' };
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
    return {
      valid: false,
      reason: 'Unable to determine client IP',
    };
  }

  // Select appropriate whitelist
  const whitelist =
    provider === 'liqpay' ? LIQPAY_IP_WHITELIST : MONOBANK_IP_WHITELIST;

  // Check if IP is in whitelist
  const isWhitelisted = whitelist.some((range) => isIpInRange(clientIp!, range));

  if (!isWhitelisted) {
    console.warn(
      `Webhook IP validation failed for ${provider}: ${clientIp} not in whitelist`
    );
    return {
      valid: false,
      clientIp,
      reason: 'IP address not in whitelist',
    };
  }

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
 */
export function clearProcessedWebhooks() {
  processedWebhooks.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
