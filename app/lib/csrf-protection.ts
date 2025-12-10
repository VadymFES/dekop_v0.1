/**
 * CSRF Protection Utilities (Task 6)
 *
 * Provides CSRF token generation and validation for mutation endpoints.
 * Uses cryptographic HMAC-based tokens that don't require database storage.
 *
 * Security approach:
 * - Token = HMAC-SHA256(sessionId + timestamp, secret)
 * - Tokens are validated by recomputing the HMAC
 * - Tokens expire after 1 hour
 * - Each token is tied to the session
 */

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, hashToken } from './admin-auth';

// Configuration
const CSRF_SECRET = process.env.SESSION_SECRET || process.env.CSRF_SECRET || 'csrf-default-secret-change-in-production';
const CSRF_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a CSRF token for the current session
 * Token format: base64(timestamp:hmac)
 */
export function generateCsrfToken(sessionTokenHash: string): string {
  const timestamp = Date.now().toString();
  const data = `${sessionTokenHash}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('hex');

  // Encode timestamp and hmac together
  const token = Buffer.from(`${timestamp}:${hmac}`).toString('base64');
  return token;
}

/**
 * Validate a CSRF token
 * Returns true if valid, false otherwise
 */
export function validateCsrfToken(token: string, sessionTokenHash: string): boolean {
  try {
    // Decode token
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [timestamp, providedHmac] = decoded.split(':');

    if (!timestamp || !providedHmac) {
      console.warn('[CSRF] Invalid token format');
      return false;
    }

    // Check expiry
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime) || Date.now() - tokenTime > CSRF_TOKEN_EXPIRY_MS) {
      console.warn('[CSRF] Token expired');
      return false;
    }

    // Recompute HMAC
    const data = `${sessionTokenHash}:${timestamp}`;
    const expectedHmac = crypto.createHmac('sha256', CSRF_SECRET)
      .update(data)
      .digest('hex');

    // Timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(providedHmac),
      Buffer.from(expectedHmac)
    );

    if (!isValid) {
      console.warn('[CSRF] Token validation failed - HMAC mismatch');
    }

    return isValid;
  } catch (error) {
    console.error('[CSRF] Token validation error:', error);
    return false;
  }
}

/**
 * Set CSRF token cookie
 */
export async function setCsrfCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: CSRF_TOKEN_EXPIRY_MS / 1000,
  });
}

/**
 * Get CSRF token from cookie
 */
export async function getCsrfCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Clear CSRF cookie (on logout)
 */
export async function clearCsrfCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_COOKIE_NAME);
}

/**
 * Generate and set a new CSRF token for the current session
 * Returns the token for immediate use
 */
export async function refreshCsrfToken(): Promise<string | null> {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return null;

  const sessionTokenHash = hashToken(sessionToken);
  const csrfToken = generateCsrfToken(sessionTokenHash);
  await setCsrfCookie(csrfToken);

  return csrfToken;
}

/**
 * Validate CSRF token from request header
 * Returns true if valid or if request is exempt (GET, HEAD, OPTIONS)
 */
export async function validateCsrfRequest(request: NextRequest): Promise<boolean> {
  // Skip validation for safe methods
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  // Get session token
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    console.warn('[CSRF] No session token found');
    return false;
  }

  // Get CSRF token from header
  const csrfToken = request.headers.get(CSRF_HEADER_NAME);
  if (!csrfToken) {
    console.warn('[CSRF] No CSRF token in header');
    return false;
  }

  // Validate token
  const sessionTokenHash = hashToken(sessionToken);
  return validateCsrfToken(csrfToken, sessionTokenHash);
}

/**
 * CSRF validation wrapper for API routes
 * Returns 403 response if CSRF validation fails
 */
export async function withCsrfProtection(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const isValid = await validateCsrfRequest(request);

  if (!isValid) {
    return NextResponse.json(
      { error: 'CSRF validation failed', code: 'CSRF_INVALID' },
      { status: 403 }
    );
  }

  // Rotate CSRF token after successful mutation (optional but recommended)
  const response = await handler();

  // On successful mutation, generate new CSRF token
  if (response.status >= 200 && response.status < 300) {
    await refreshCsrfToken();
  }

  return response;
}

/**
 * Helper to get current CSRF token for client-side use
 * This is called by components to get the token for fetch requests
 */
export async function getCurrentCsrfToken(): Promise<string | null> {
  // First try to get from cookie
  let token = await getCsrfCookie();

  // If no token exists, generate a new one
  if (!token) {
    token = await refreshCsrfToken();
  }

  return token;
}
