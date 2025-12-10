/**
 * Admin Authentication Library
 *
 * Provides secure authentication utilities for the admin panel:
 * - Password hashing with bcrypt
 * - Session management with secure tokens
 * - Login attempt tracking and lockout
 * - Audit logging
 * - In-memory session cache with LRU eviction (Task 2)
 */

import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { db } from './db';
import { cookies } from 'next/headers';

// Constants
const BCRYPT_ROUNDS = 12;
const SESSION_DURATION_HOURS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const SESSION_COOKIE_NAME = 'admin_session';

// Session Cache Constants (Task 2)
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_CACHE_MAX_SIZE = 1000; // Max 1000 entries

// Types
export interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_locked: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface AdminSession {
  id: string;
  user_id: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface AdminUserWithPermissions extends AdminUser {
  permissions: string[];
  roles: string[];
}

// Session cache entry with metadata for TTL and LRU
interface SessionCacheEntry {
  user: AdminUserWithPermissions;
  cachedAt: number;
  lastAccessed: number;
  sessionId: string;
}

// =====================================================
// SESSION CACHE (Task 2 - In-memory LRU cache with TTL)
// =====================================================

/**
 * LRU Cache for validated sessions
 * - Keyed by hashed token
 * - TTL: 5 minutes
 * - Max size: 1000 entries with LRU eviction
 * - Works in serverless (per-instance cache, acceptable)
 */
const sessionCache = new Map<string, SessionCacheEntry>();

/**
 * Get cached session if valid (not expired)
 */
function getCachedSession(tokenHash: string): AdminUserWithPermissions | null {
  const entry = sessionCache.get(tokenHash);
  if (!entry) {
    console.log(`[SessionCache] MISS - token not in cache (cache size: ${sessionCache.size})`);
    return null;
  }

  const now = Date.now();

  // Check TTL expiry
  if (now - entry.cachedAt > SESSION_CACHE_TTL_MS) {
    sessionCache.delete(tokenHash);
    console.log(`[SessionCache] MISS - token expired (age: ${Math.round((now - entry.cachedAt) / 1000)}s)`);
    return null;
  }

  // Update last accessed for LRU
  entry.lastAccessed = now;

  const ageSeconds = Math.round((now - entry.cachedAt) / 1000);
  console.log(`[SessionCache] HIT - user: ${entry.user.email} (age: ${ageSeconds}s, cache size: ${sessionCache.size})`);

  return entry.user;
}

/**
 * Cache a validated session
 */
function cacheSession(tokenHash: string, user: AdminUserWithPermissions, sessionId: string): void {
  const now = Date.now();

  // Enforce max size with LRU eviction
  if (sessionCache.size >= SESSION_CACHE_MAX_SIZE) {
    console.log(`[SessionCache] Evicting LRU entry (max size: ${SESSION_CACHE_MAX_SIZE})`);
    evictLRUEntry();
  }

  sessionCache.set(tokenHash, {
    user,
    cachedAt: now,
    lastAccessed: now,
    sessionId,
  });

  console.log(`[SessionCache] CACHED - user: ${user.email} (cache size: ${sessionCache.size})`);
}

/**
 * Evict the least recently used entry
 */
function evictLRUEntry(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, entry] of sessionCache.entries()) {
    if (entry.lastAccessed < oldestTime) {
      oldestTime = entry.lastAccessed;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    sessionCache.delete(oldestKey);
  }
}

/**
 * Invalidate session cache entry by token hash
 */
export function invalidateSessionCache(tokenHash: string): void {
  sessionCache.delete(tokenHash);
}

/**
 * Invalidate all cache entries for a user (used on logout, password change)
 */
export function invalidateUserSessions(userId: string): void {
  for (const [key, entry] of sessionCache.entries()) {
    if (entry.user.id === userId) {
      sessionCache.delete(key);
    }
  }
}

/**
 * Invalidate session cache by session ID
 */
export function invalidateSessionCacheBySessionId(sessionId: string): void {
  for (const [key, entry] of sessionCache.entries()) {
    if (entry.sessionId === sessionId) {
      sessionCache.delete(key);
    }
  }
}

/**
 * Clear entire session cache (for permission changes that affect all users)
 */
export function clearSessionCache(): void {
  sessionCache.clear();
}

// =====================================================
// PASSWORD UTILITIES
// =====================================================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash a token for storage (we store hashes, not raw tokens)
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// =====================================================
// SESSION MANAGEMENT
// =====================================================

/**
 * Create a new admin session
 */
export async function createSession(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  await db.query`
    INSERT INTO admin_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
    VALUES (${userId}, ${tokenHash}, ${ipAddress}, ${userAgent}, ${expiresAt.toISOString()})
  `;

  return token;
}

/**
 * Validate a session token and return the user
 *
 * Optimizations (Task 1 & 2):
 * - Single JOIN query combines session, user, permissions, and roles
 * - In-memory cache with 5-minute TTL (0 DB queries on cache hit)
 * - Non-blocking last_activity_at update (fire-and-forget)
 * - Maintains all security checks (expiry, revoked, is_active, is_locked)
 */
export async function validateSession(token: string): Promise<AdminUserWithPermissions | null> {
  if (!token) return null;

  const tokenHash = hashToken(token);

  // Check cache first (Task 2)
  const cachedUser = getCachedSession(tokenHash);
  if (cachedUser) {
    return cachedUser;
  }

  // Single optimized query combining session, user, permissions, and roles (Task 1)
  // Uses array_agg to collect permissions and roles in one query
  const result = await db.query`
    SELECT
      s.id as session_id,
      s.expires_at,
      s.revoked,
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.is_active,
      u.is_locked,
      u.must_change_password,
      u.last_login_at,
      u.created_at,
      COALESCE(
        (SELECT array_agg(DISTINCT ap.name)
         FROM admin_user_roles aur
         JOIN admin_role_permissions arp ON aur.role_id = arp.role_id
         JOIN admin_permissions ap ON arp.permission_id = ap.id
         WHERE aur.user_id = u.id),
        ARRAY[]::text[]
      ) as permissions,
      COALESCE(
        (SELECT array_agg(ar.name)
         FROM admin_user_roles aur
         JOIN admin_roles ar ON aur.role_id = ar.id
         WHERE aur.user_id = u.id),
        ARRAY[]::text[]
      ) as roles
    FROM admin_sessions s
    JOIN admin_users u ON s.user_id = u.id
    WHERE s.token_hash = ${tokenHash}
      AND s.revoked = false
      AND s.expires_at > NOW()
      AND u.is_active = true
      AND u.is_locked = false
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Non-blocking last_activity update (fire-and-forget) - Task 1
  // We don't await this - it runs in the background
  db.query`
    UPDATE admin_sessions
    SET last_activity_at = NOW()
    WHERE id = ${row.session_id}
  `.catch(err => {
    // Log but don't fail the request
    console.warn('Failed to update last_activity_at:', err);
  });

  const user: AdminUserWithPermissions = {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    is_active: row.is_active,
    is_locked: row.is_locked,
    must_change_password: row.must_change_password,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    permissions: row.permissions || [],
    roles: row.roles || [],
  };

  // Cache the validated session (Task 2)
  cacheSession(tokenHash, user, row.session_id);

  return user;
}

/**
 * Revoke a session (logout)
 * Also invalidates the session cache entry
 */
export async function revokeSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  // Invalidate cache entry (Task 2)
  invalidateSessionCache(tokenHash);

  await db.query`
    UPDATE admin_sessions
    SET revoked = true, revoked_at = NOW(), revoked_reason = 'logout'
    WHERE token_hash = ${tokenHash}
  `;
}

/**
 * Revoke all sessions for a user
 * Also invalidates all cache entries for this user
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  // Invalidate all cache entries for this user (Task 2)
  invalidateUserSessions(userId);

  await db.query`
    UPDATE admin_sessions
    SET revoked = true, revoked_at = NOW(), revoked_reason = 'logout_all'
    WHERE user_id = ${userId} AND revoked = false
  `;
}

// =====================================================
// LOGIN & LOCKOUT
// =====================================================

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
  email: string,
  userId: string | null,
  success: boolean,
  failureReason: string | null,
  ipAddress: string | null,
  userAgent: string | null
): Promise<void> {
  await db.query`
    INSERT INTO admin_login_attempts
      (email, user_id, success, failure_reason, ip_address, user_agent)
    VALUES
      (${email}, ${userId}, ${success}, ${failureReason}, ${ipAddress}, ${userAgent})
  `;
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId: string): Promise<boolean> {
  const result = await db.query`
    SELECT is_locked, locked_until
    FROM admin_users
    WHERE id = ${userId}
  `;

  if (result.rows.length === 0) return true;

  const user = result.rows[0];

  if (!user.is_locked) return false;

  // Check if lockout has expired
  if (user.locked_until && new Date(user.locked_until) < new Date()) {
    // Unlock the account
    await db.query`
      UPDATE admin_users
      SET is_locked = false, locked_until = NULL, failed_login_attempts = 0
      WHERE id = ${userId}
    `;
    return false;
  }

  return true;
}

/**
 * Increment failed login attempts and lock if necessary
 */
export async function incrementFailedAttempts(userId: string): Promise<void> {
  const result = await db.query`
    UPDATE admin_users
    SET failed_login_attempts = failed_login_attempts + 1
    WHERE id = ${userId}
    RETURNING failed_login_attempts
  `;

  const attempts = result.rows[0]?.failed_login_attempts || 0;

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    await db.query`
      UPDATE admin_users
      SET is_locked = true, locked_until = ${lockUntil.toISOString()}
      WHERE id = ${userId}
    `;
  }
}

/**
 * Reset failed login attempts on successful login
 */
export async function resetFailedAttempts(userId: string): Promise<void> {
  await db.query`
    UPDATE admin_users
    SET failed_login_attempts = 0, is_locked = false, locked_until = NULL
    WHERE id = ${userId}
  `;
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: string, ipAddress: string | null): Promise<void> {
  await db.query`
    UPDATE admin_users
    SET last_login_at = NOW(), last_login_ip = ${ipAddress}
    WHERE id = ${userId}
  `;
}

// =====================================================
// USER LOOKUP
// =====================================================

/**
 * Get admin user by email
 */
export async function getAdminByEmail(email: string): Promise<{
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_locked: boolean;
} | null> {
  const result = await db.query`
    SELECT id, email, password_hash, first_name, last_name, is_active, is_locked
    FROM admin_users
    WHERE email = ${email.toLowerCase()}
  `;

  return result.rows[0] || null;
}

/**
 * Get admin user by ID
 */
export async function getAdminById(id: string): Promise<AdminUser | null> {
  const result = await db.query`
    SELECT id, email, first_name, last_name, is_active, is_locked,
           must_change_password, last_login_at, created_at
    FROM admin_users
    WHERE id = ${id}
  `;

  return result.rows[0] || null;
}

// =====================================================
// AUDIT LOGGING
// =====================================================

/**
 * Log an admin action for audit trail
 */
export async function logAdminAction(
  userId: string | null,
  userEmail: string | null,
  action: string,
  resource: string | null,
  resourceId: string | null,
  details: Record<string, unknown> | null,
  ipAddress: string | null,
  userAgent: string | null,
  success: boolean = true,
  errorMessage: string | null = null
): Promise<void> {
  await db.query`
    INSERT INTO admin_audit_log
      (user_id, user_email, action, resource, resource_id, details,
       ip_address, user_agent, success, error_message)
    VALUES
      (${userId}, ${userEmail}, ${action}, ${resource}, ${resourceId},
       ${details ? JSON.stringify(details) : null}::jsonb,
       ${ipAddress}, ${userAgent}, ${success}, ${errorMessage})
  `;
}

// =====================================================
// COOKIE HELPERS
// =====================================================

/**
 * Set the session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
    // Set domain for subdomain access in production
    ...(isProduction && { domain: '.dekop.com.ua' }),
  });
}

/**
 * Get the session token from cookie
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

/**
 * Clear the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// =====================================================
// PERMISSION CHECKING
// =====================================================

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: AdminUserWithPermissions, permission: string): boolean {
  return user.permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: AdminUserWithPermissions, permissions: string[]): boolean {
  return permissions.some(p => user.permissions.includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: AdminUserWithPermissions, permissions: string[]): boolean {
  return permissions.every(p => user.permissions.includes(p));
}

// =====================================================
// AUTHENTICATION FLOW
// =====================================================

/**
 * Authenticate admin user with email and password
 */
export async function authenticateAdmin(
  email: string,
  password: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ success: boolean; token?: string; error?: string; user?: AdminUser }> {
  // Get user by email
  const user = await getAdminByEmail(email);

  if (!user) {
    await recordLoginAttempt(email, null, false, 'user_not_found', ipAddress, userAgent);
    await logAdminAction(null, email, 'login_failed', 'auth', null,
      { reason: 'user_not_found' }, ipAddress, userAgent, false, 'User not found');
    return { success: false, error: 'Invalid email or password' };
  }

  // Check if account is active
  if (!user.is_active) {
    await recordLoginAttempt(email, user.id, false, 'account_inactive', ipAddress, userAgent);
    await logAdminAction(user.id, email, 'login_failed', 'auth', null,
      { reason: 'account_inactive' }, ipAddress, userAgent, false, 'Account inactive');
    return { success: false, error: 'Account is inactive' };
  }

  // Check if account is locked
  if (await isAccountLocked(user.id)) {
    await recordLoginAttempt(email, user.id, false, 'account_locked', ipAddress, userAgent);
    await logAdminAction(user.id, email, 'login_failed', 'auth', null,
      { reason: 'account_locked' }, ipAddress, userAgent, false, 'Account locked');
    return { success: false, error: 'Account is locked. Please try again later.' };
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    await incrementFailedAttempts(user.id);
    await recordLoginAttempt(email, user.id, false, 'invalid_password', ipAddress, userAgent);
    await logAdminAction(user.id, email, 'login_failed', 'auth', null,
      { reason: 'invalid_password' }, ipAddress, userAgent, false, 'Invalid password');
    return { success: false, error: 'Invalid email or password' };
  }

  // Successful login
  await resetFailedAttempts(user.id);
  await updateLastLogin(user.id, ipAddress);

  // Create session
  const token = await createSession(user.id, ipAddress, userAgent);

  // Log successful login
  await recordLoginAttempt(email, user.id, true, null, ipAddress, userAgent);
  await logAdminAction(user.id, email, 'login_success', 'auth', null,
    null, ipAddress, userAgent, true, null);

  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      is_locked: user.is_locked,
      must_change_password: false,
      last_login_at: new Date().toISOString(),
      created_at: '',
    },
  };
}

/**
 * Get current authenticated admin from session cookie
 */
export async function getCurrentAdmin(): Promise<AdminUserWithPermissions | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return validateSession(token);
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AdminUserWithPermissions> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error('Authentication required');
  }
  return admin;
}

/**
 * Logout current admin
 */
export async function logoutAdmin(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    const admin = await validateSession(token);
    if (admin) {
      await logAdminAction(admin.id, admin.email, 'logout', 'auth', null, null, null, null);
    }
    await revokeSession(token);
  }
  await clearSessionCookie();
}
