/**
 * Session Security Utilities
 * Provides cookie encryption, CSRF protection, and secure session token management
 */

import crypto from 'crypto';
import { sql } from '@vercel/postgres';

/**
 * Configuration
 */
const SECRET_KEY = process.env.SESSION_SECRET || 'default-secret-key-change-in-production';
const CSRF_TOKEN_LENGTH = 32;
const SESSION_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 3600; // 1 hour in seconds
const SESSION_TOKEN_EXPIRY = 86400; // 24 hours in seconds

/**
 * Cookie Encryption/Signing Utilities
 */

/**
 * Encrypts a cookie value using AES-256-GCM
 *
 * @param value - Plain text value to encrypt
 * @returns Encrypted value with IV and auth tag (base64 encoded)
 */
export function encryptCookieValue(value: string): string {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher
    const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    // Encrypt the value
    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted value, and auth tag
    const combined = {
      iv: iv.toString('base64'),
      value: encrypted,
      authTag: authTag.toString('base64')
    };

    return Buffer.from(JSON.stringify(combined)).toString('base64');
  } catch (error) {
    console.error('Error encrypting cookie value:', error);
    throw new Error('Failed to encrypt cookie value');
  }
}

/**
 * Decrypts an encrypted cookie value
 *
 * @param encryptedValue - Encrypted value (base64 encoded)
 * @returns Decrypted plain text value
 */
export function decryptCookieValue(encryptedValue: string): string | null {
  try {
    // Parse the encrypted value
    const combined = JSON.parse(Buffer.from(encryptedValue, 'base64').toString('utf8'));
    const { iv, value, authTag } = combined;

    // Create decipher
    const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(iv, 'base64')
    );

    // Set auth tag
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    // Decrypt the value
    let decrypted = decipher.update(value, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Error decrypting cookie value:', error);
    return null;
  }
}

/**
 * Signs a cookie value using HMAC-SHA256
 *
 * @param value - Value to sign
 * @returns Signature (hex encoded)
 */
export function signCookieValue(value: string): string {
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(value);
  return hmac.digest('hex');
}

/**
 * Verifies a signed cookie value
 *
 * @param value - Original value
 * @param signature - Signature to verify
 * @returns True if signature is valid, false otherwise
 */
export function verifyCookieSignature(value: string, signature: string): boolean {
  try {
    const expectedSignature = signCookieValue(value);

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying cookie signature:', error);
    return false;
  }
}

/**
 * Creates a signed cookie value (value + signature)
 *
 * @param value - Value to sign
 * @returns Signed cookie value (base64 encoded)
 */
export function createSignedCookie(value: string): string {
  const signature = signCookieValue(value);
  const combined = { value, signature };
  return Buffer.from(JSON.stringify(combined)).toString('base64');
}

/**
 * Verifies and extracts value from a signed cookie
 *
 * @param signedValue - Signed cookie value
 * @returns Original value if signature is valid, null otherwise
 */
export function verifySignedCookie(signedValue: string): string | null {
  try {
    const combined = JSON.parse(Buffer.from(signedValue, 'base64').toString('utf8'));
    const { value, signature } = combined;

    if (!verifyCookieSignature(value, signature)) {
      console.warn('[SECURITY] Cookie signature verification failed');
      return null;
    }

    return value;
  } catch (error) {
    console.error('Error verifying signed cookie:', error);
    return null;
  }
}

/**
 * CSRF Protection Utilities
 */

/**
 * Generates a cryptographically secure CSRF token
 *
 * @returns CSRF token (hex encoded)
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Stores a CSRF token in the database with expiration
 *
 * @param token - CSRF token to store
 * @param sessionId - Associated session ID
 * @param expirySeconds - Expiry time in seconds (default: 1 hour)
 */
export async function storeCsrfToken(
  token: string,
  sessionId: string,
  expirySeconds: number = CSRF_TOKEN_EXPIRY
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    await sql`
      INSERT INTO csrf_tokens (token, session_id, expires_at)
      VALUES (${token}, ${sessionId}, ${expiresAt.toISOString()})
      ON CONFLICT (token) DO UPDATE
      SET session_id = ${sessionId},
          expires_at = ${expiresAt.toISOString()},
          used = false
    `;
  } catch (error) {
    console.error('Error storing CSRF token:', error);
    throw new Error('Failed to store CSRF token');
  }
}

/**
 * Validates a CSRF token
 *
 * @param token - CSRF token to validate
 * @param sessionId - Expected session ID
 * @returns True if token is valid, false otherwise
 */
export async function validateCsrfToken(
  token: string,
  sessionId: string
): Promise<boolean> {
  try {
    const now = new Date();

    const result = await sql`
      SELECT token, session_id, expires_at, used
      FROM csrf_tokens
      WHERE token = ${token}
        AND session_id = ${sessionId}
        AND expires_at > ${now.toISOString()}
        AND used = false
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      console.warn('[SECURITY] CSRF token validation failed: token not found, expired, or already used');
      return false;
    }

    // Mark token as used (one-time use)
    await sql`
      UPDATE csrf_tokens
      SET used = true
      WHERE token = ${token}
    `;

    console.log('[SECURITY] CSRF token validated successfully');
    return true;
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return false;
  }
}

/**
 * Cleans up expired CSRF tokens
 *
 * @returns Number of expired tokens deleted
 */
export async function cleanupExpiredCsrfTokens(): Promise<number> {
  try {
    const now = new Date();

    const result = await sql`
      DELETE FROM csrf_tokens
      WHERE expires_at < ${now.toISOString()}
      RETURNING token
    `;

    console.log(`[CLEANUP] Removed ${result.rowCount} expired CSRF tokens`);
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up expired CSRF tokens:', error);
    return 0;
  }
}

/**
 * Session Token Management
 */

/**
 * Generates a cryptographically secure session token
 *
 * @returns Session token (hex encoded)
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(SESSION_TOKEN_LENGTH).toString('hex');
}

/**
 * Creates a new session with a secure token
 *
 * @param userId - Optional user ID (for authenticated sessions)
 * @param metadata - Optional session metadata
 * @param expirySeconds - Expiry time in seconds (default: 24 hours)
 * @returns Session token and session ID
 */
export async function createSession(
  userId?: string,
  metadata?: Record<string, any>,
  expirySeconds: number = SESSION_TOKEN_EXPIRY
): Promise<{ sessionId: string; sessionToken: string }> {
  try {
    const sessionId = crypto.randomUUID();
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    // Hash the session token before storing (defense in depth)
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

    await sql`
      INSERT INTO sessions (
        id,
        token_hash,
        user_id,
        metadata,
        expires_at
      ) VALUES (
        ${sessionId},
        ${tokenHash},
        ${userId || null},
        ${metadata ? JSON.stringify(metadata) : null},
        ${expiresAt.toISOString()}
      )
    `;

    console.log(`[SESSION] Created session ${sessionId}`);
    return { sessionId, sessionToken };
  } catch (error) {
    console.error('Error creating session:', error);
    throw new Error('Failed to create session');
  }
}

/**
 * Validates a session token
 *
 * @param sessionToken - Session token to validate
 * @returns Session data if valid, null otherwise
 */
export async function validateSessionToken(
  sessionToken: string
): Promise<{ sessionId: string; userId?: string; metadata?: any } | null> {
  try {
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const now = new Date();

    const result = await sql`
      SELECT id, user_id, metadata, expires_at
      FROM sessions
      WHERE token_hash = ${tokenHash}
        AND expires_at > ${now.toISOString()}
        AND revoked = false
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      console.warn('[SECURITY] Session token validation failed: token not found, expired, or revoked');
      return null;
    }

    const session = result.rows[0];

    // Update last accessed time
    await sql`
      UPDATE sessions
      SET last_accessed_at = ${now.toISOString()}
      WHERE id = ${session.id}
    `;

    console.log(`[SESSION] Session ${session.id} validated successfully`);
    return {
      sessionId: session.id,
      userId: session.user_id,
      metadata: session.metadata
    };
  } catch (error) {
    console.error('Error validating session token:', error);
    return null;
  }
}

/**
 * Revokes a session (logout)
 *
 * @param sessionId - Session ID to revoke
 */
export async function revokeSession(sessionId: string): Promise<void> {
  try {
    await sql`
      UPDATE sessions
      SET revoked = true
      WHERE id = ${sessionId}
    `;

    console.log(`[SESSION] Session ${sessionId} revoked`);
  } catch (error) {
    console.error('Error revoking session:', error);
    throw new Error('Failed to revoke session');
  }
}

/**
 * Extends a session's expiration time
 *
 * @param sessionId - Session ID to extend
 * @param expirySeconds - New expiry time in seconds
 */
export async function extendSession(
  sessionId: string,
  expirySeconds: number = SESSION_TOKEN_EXPIRY
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    await sql`
      UPDATE sessions
      SET expires_at = ${expiresAt.toISOString()}
      WHERE id = ${sessionId}
        AND revoked = false
    `;

    console.log(`[SESSION] Session ${sessionId} extended until ${expiresAt.toISOString()}`);
  } catch (error) {
    console.error('Error extending session:', error);
    throw new Error('Failed to extend session');
  }
}

/**
 * Cleans up expired sessions
 *
 * @returns Number of expired sessions deleted
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const now = new Date();

    const result = await sql`
      DELETE FROM sessions
      WHERE expires_at < ${now.toISOString()}
      RETURNING id
    `;

    console.log(`[CLEANUP] Removed ${result.rowCount} expired sessions`);
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}

/**
 * Security Helper Functions
 */

/**
 * Generates a secure random string
 *
 * @param length - Length of the random string
 * @returns Random string (hex encoded)
 */
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validates that a string is a valid session/CSRF token format
 *
 * @param token - Token to validate
 * @param expectedLength - Expected token length (in hex characters)
 * @returns True if token format is valid, false otherwise
 */
export function isValidTokenFormat(token: string, expectedLength: number = 64): boolean {
  return /^[a-f0-9]+$/i.test(token) && token.length === expectedLength;
}

/**
 * Prevents timing attacks by ensuring constant-time string comparison
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal, false otherwise
 */
export function timingSafeEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(
      Buffer.from(a),
      Buffer.from(b)
    );
  } catch {
    return false;
  }
}
