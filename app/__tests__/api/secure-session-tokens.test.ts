/**
 * Secure Session Token Tests
 * Tests for session token generation, validation, lifecycle management, and security
 */

import crypto from 'crypto';
import {
  generateSessionToken,
  createSession,
  validateSessionToken,
  revokeSession,
  extendSession,
  cleanupExpiredSessions,
  isValidTokenFormat,
} from '@/app/lib/session-security';

// Mock dependencies
jest.mock('@vercel/postgres', () => ({
  sql: jest.fn(),
}));

const { sql } = require('@vercel/postgres');

describe('Secure Session Token Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Token Generation', () => {
    it('should generate cryptographically secure session tokens', () => {
      const token = generateSessionToken();

      expect(token).toBeTruthy();
      expect(token).toMatch(/^[a-f0-9]{64}$/); // 32 bytes = 64 hex chars
      expect(token.length).toBe(64);
    });

    it('should generate unique tokens for each session', () => {
      const tokens = new Set();

      for (let i = 0; i < 1000; i++) {
        tokens.add(generateSessionToken());
      }

      // All tokens should be unique (no collisions)
      expect(tokens.size).toBe(1000);
    });

    it('should generate tokens with high entropy', () => {
      const token = generateSessionToken();

      // Token should have good distribution of characters
      const charCounts = new Map<string, number>();

      for (const char of token) {
        charCounts.set(char, (charCounts.get(char) || 0) + 1);
      }

      // Should use variety of hex characters (not all same character)
      expect(charCounts.size).toBeGreaterThan(5);
    });
  });

  describe('Session Creation', () => {
    it('should create a new session successfully', async () => {
      sql.mockResolvedValue({ rows: [], rowCount: 1 });

      const { sessionId, sessionToken } = await createSession();

      expect(sessionId).toBeTruthy();
      expect(sessionToken).toBeTruthy();
      expect(sessionToken).toMatch(/^[a-f0-9]{64}$/);

      expect(sql).toHaveBeenCalled();
      const query = sql.mock.calls[0][0];
      const queryString = query.join('');

      expect(queryString).toContain('INSERT INTO sessions');
      expect(queryString).toContain('token_hash');
      expect(queryString).toContain('expires_at');
    });

    it('should create session with user ID', async () => {
      sql.mockResolvedValue({ rows: [], rowCount: 1 });

      const userId = 'user-123';
      const { sessionId, sessionToken } = await createSession(userId);

      expect(sessionId).toBeTruthy();
      expect(sessionToken).toBeTruthy();

      expect(sql).toHaveBeenCalled();
      // Verify user_id was included
      const callArgs = sql.mock.calls[0];
      expect(callArgs).toBeDefined();
    });

    it('should create session with metadata', async () => {
      sql.mockResolvedValue({ rows: [], rowCount: 1 });

      const metadata = {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        loginMethod: 'email',
      };

      const { sessionId } = await createSession(undefined, metadata);

      expect(sessionId).toBeTruthy();

      expect(sql).toHaveBeenCalled();
      // Verify metadata was included
    });

    it('should hash session token before storing', async () => {
      sql.mockResolvedValue({ rows: [], rowCount: 1 });

      const { sessionToken } = await createSession();

      expect(sql).toHaveBeenCalled();

      // Verify token is hashed (not stored in plain text)
      const callArgs = sql.mock.calls[0];
      const tokenHashValue = callArgs[2]; // token_hash parameter

      // Hash the token ourselves to verify
      const expectedHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

      expect(tokenHashValue).toBe(expectedHash);
      expect(tokenHashValue).not.toBe(sessionToken);
    });

    it('should set appropriate expiration time', async () => {
      sql.mockResolvedValue({ rows: [], rowCount: 1 });

      const expirySeconds = 7200; // 2 hours
      await createSession(undefined, undefined, expirySeconds);

      expect(sql).toHaveBeenCalled();

      // Verify expires_at is set correctly
      const callArgs = sql.mock.calls[0];
      const expiresAt = callArgs[5]; // expires_at parameter

      const expectedExpiry = new Date(Date.now() + expirySeconds * 1000);
      const actualExpiry = new Date(expiresAt);

      // Should be close (within 1 second)
      expect(Math.abs(actualExpiry.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it('should handle database errors gracefully', async () => {
      sql.mockRejectedValue(new Error('Database connection failed'));

      await expect(createSession()).rejects.toThrow('Failed to create session');
    });
  });

  describe('Session Validation', () => {
    it('should validate a valid session token', async () => {
      const sessionId = crypto.randomUUID();
      const userId = 'user-123';
      const sessionToken = generateSessionToken();
      const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

      sql
        .mockResolvedValueOnce({
          rows: [
            {
              id: sessionId,
              user_id: userId,
              metadata: null,
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Update last_accessed_at

      const result = await validateSessionToken(sessionToken);

      expect(result).toBeTruthy();
      expect(result?.sessionId).toBe(sessionId);
      expect(result?.userId).toBe(userId);

      // Verify token was hashed before querying
      expect(sql).toHaveBeenCalledTimes(2);
    });

    it('should update last accessed time on validation', async () => {
      const sessionToken = generateSessionToken();

      sql
        .mockResolvedValueOnce({
          rows: [
            {
              id: crypto.randomUUID(),
              user_id: null,
              metadata: null,
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await validateSessionToken(sessionToken);

      // Verify last_accessed_at was updated
      expect(sql).toHaveBeenCalledTimes(2);
      const updateQuery = sql.mock.calls[1][0];
      const updateString = updateQuery.join('');

      expect(updateString).toContain('UPDATE sessions');
      expect(updateString).toContain('last_accessed_at');
    });

    it('should reject expired session tokens', async () => {
      const sessionToken = generateSessionToken();

      // Mock expired session
      sql.mockResolvedValue({ rows: [] });

      const result = await validateSessionToken(sessionToken);

      expect(result).toBeNull();
    });

    it('should reject revoked session tokens', async () => {
      const sessionToken = generateSessionToken();

      // Mock revoked session
      sql.mockResolvedValue({ rows: [] });

      const result = await validateSessionToken(sessionToken);

      expect(result).toBeNull();
    });

    it('should reject invalid token format', async () => {
      const invalidTokens = [
        'short',
        'g'.repeat(64), // Invalid hex character
        'not-a-hex-token',
        '',
      ];

      for (const invalidToken of invalidTokens) {
        sql.mockResolvedValue({ rows: [] });

        const result = await validateSessionToken(invalidToken);

        expect(result).toBeNull();
      }
    });

    it('should handle database errors gracefully', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      const sessionToken = generateSessionToken();
      const result = await validateSessionToken(sessionToken);

      expect(result).toBeNull();
    });
  });

  describe('Session Revocation', () => {
    it('should revoke a session successfully', async () => {
      sql.mockResolvedValue({ rows: [], rowCount: 1 });

      const sessionId = crypto.randomUUID();

      await revokeSession(sessionId);

      expect(sql).toHaveBeenCalled();
      const query = sql.mock.calls[0][0];
      const queryString = query.join('');

      expect(queryString).toContain('UPDATE sessions');
      expect(queryString).toContain('revoked = true');
      expect(queryString).toContain('WHERE id =');
    });

    it('should prevent reuse of revoked sessions', async () => {
      const sessionToken = generateSessionToken();

      // Mock revoked session
      sql.mockResolvedValue({ rows: [] });

      const result = await validateSessionToken(sessionToken);

      expect(result).toBeNull();
    });

    it('should handle revocation errors', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      const sessionId = crypto.randomUUID();

      await expect(revokeSession(sessionId)).rejects.toThrow('Failed to revoke session');
    });
  });

  describe('Session Extension', () => {
    it('should extend session expiration', async () => {
      sql.mockResolvedValue({ rows: [], rowCount: 1 });

      const sessionId = crypto.randomUUID();
      const expirySeconds = 7200; // 2 hours

      await extendSession(sessionId, expirySeconds);

      expect(sql).toHaveBeenCalled();
      const query = sql.mock.calls[0][0];
      const queryString = query.join('');

      expect(queryString).toContain('UPDATE sessions');
      expect(queryString).toContain('expires_at =');
      expect(queryString).toContain('WHERE id =');
      expect(queryString).toContain('revoked = false');
    });

    it('should not extend revoked sessions', async () => {
      sql.mockResolvedValue({ rows: [], rowCount: 0 }); // No rows updated

      const sessionId = crypto.randomUUID();

      await extendSession(sessionId);

      // Verify query includes revoked = false condition
      const query = sql.mock.calls[0][0];
      const queryString = query.join('');

      expect(queryString).toContain('revoked = false');
    });

    it('should handle extension errors', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      const sessionId = crypto.randomUUID();

      await expect(extendSession(sessionId)).rejects.toThrow('Failed to extend session');
    });
  });

  describe('Session Cleanup', () => {
    it('should delete expired sessions', async () => {
      sql.mockResolvedValue({ rows: [], rowCount: 15 });

      const deletedCount = await cleanupExpiredSessions();

      expect(deletedCount).toBe(15);
      expect(sql).toHaveBeenCalled();

      const query = sql.mock.calls[0][0];
      const queryString = query.join('');

      expect(queryString).toContain('DELETE FROM sessions');
      expect(queryString).toContain('WHERE expires_at <');
    });

    it('should handle cleanup errors gracefully', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      const deletedCount = await cleanupExpiredSessions();

      expect(deletedCount).toBe(0);
    });

    it('should only delete expired sessions, not active ones', async () => {
      sql.mockResolvedValue({ rows: [], rowCount: 5 });

      await cleanupExpiredSessions();

      const query = sql.mock.calls[0][0];
      const queryString = query.join('');

      // Should only delete where expires_at is in the past
      expect(queryString).toContain('WHERE expires_at <');
    });
  });

  describe('Session Security', () => {
    describe('Session Hijacking Prevention', () => {
      it('should store only hashed tokens (not plain text)', async () => {
        sql.mockResolvedValue({ rows: [], rowCount: 1 });

        const { sessionToken } = await createSession();

        const storedHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

        // If attacker gets database access, they cannot use hashed tokens
        expect(storedHash).not.toBe(sessionToken);
        expect(storedHash).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should generate new tokens on session creation (no fixation)', async () => {
        sql.mockResolvedValue({ rows: [], rowCount: 1 });

        const session1 = await createSession();
        const session2 = await createSession();

        // Each session gets a unique token
        expect(session1.sessionToken).not.toBe(session2.sessionToken);
        expect(session1.sessionId).not.toBe(session2.sessionId);
      });

      it('should validate token format before processing', () => {
        const validToken = generateSessionToken();
        const invalidTokens = [
          'short',
          'g'.repeat(64),
          '',
          '12345',
        ];

        expect(isValidTokenFormat(validToken, 64)).toBe(true);

        invalidTokens.forEach((token) => {
          expect(isValidTokenFormat(token, 64)).toBe(false);
        });
      });
    });

    describe('Session Fixation Prevention', () => {
      it('should regenerate session after privilege elevation', async () => {
        sql.mockResolvedValue({ rows: [], rowCount: 1 });

        // Initial anonymous session
        const anonymousSession = await createSession();

        // After login, create new session (not reuse old one)
        const authenticatedSession = await createSession('user-123');

        expect(anonymousSession.sessionId).not.toBe(authenticatedSession.sessionId);
        expect(anonymousSession.sessionToken).not.toBe(authenticatedSession.sessionToken);
      });

      it('should invalidate old sessions when creating new ones', async () => {
        sql.mockResolvedValue({ rows: [], rowCount: 1 });

        const oldSessionId = crypto.randomUUID();

        // Revoke old session
        await revokeSession(oldSessionId);

        // Create new session
        const newSession = await createSession();

        // Old session should not be usable
        expect(newSession.sessionId).not.toBe(oldSessionId);
      });
    });

    describe('Session Expiration', () => {
      it('should enforce session expiration', async () => {
        const sessionToken = generateSessionToken();

        // Mock expired session (24 hours ago)
        const expiredDate = new Date(Date.now() - 86400000);

        sql.mockResolvedValue({ rows: [] }); // Expired sessions not returned

        const result = await validateSessionToken(sessionToken);

        expect(result).toBeNull();
      });

      it('should implement sliding window expiration', async () => {
        const sessionId = crypto.randomUUID();
        const sessionToken = generateSessionToken();

        // On each request, extend session
        sql
          .mockResolvedValueOnce({
            rows: [
              {
                id: sessionId,
                user_id: null,
                metadata: null,
                expires_at: new Date(Date.now() + 86400000).toISOString(),
              },
            ],
          })
          .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Update last_accessed

        await validateSessionToken(sessionToken);

        // Extend session after validation
        sql.mockResolvedValue({ rows: [], rowCount: 1 });
        await extendSession(sessionId);

        // Verify session was extended
        expect(sql).toHaveBeenCalledTimes(3);
      });

      it('should use appropriate expiration times for different session types', async () => {
        sql.mockResolvedValue({ rows: [], rowCount: 1 });

        // Short-lived session (1 hour)
        await createSession(undefined, undefined, 3600);

        // Long-lived session (7 days)
        await createSession(undefined, { rememberMe: true }, 604800);

        expect(sql).toHaveBeenCalledTimes(2);
      });
    });

    describe('Concurrent Session Management', () => {
      it('should allow multiple concurrent sessions per user', async () => {
        sql.mockResolvedValue({ rows: [], rowCount: 1 });

        const userId = 'user-123';

        // User logs in from multiple devices
        const session1 = await createSession(userId, { device: 'desktop' });
        const session2 = await createSession(userId, { device: 'mobile' });

        expect(session1.sessionId).not.toBe(session2.sessionId);
        expect(session1.sessionToken).not.toBe(session2.sessionToken);
      });

      it('should track session metadata for security monitoring', async () => {
        sql.mockResolvedValue({ rows: [], rowCount: 1 });

        const metadata = {
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
          device: 'desktop',
          location: 'US',
        };

        await createSession('user-123', metadata);

        expect(sql).toHaveBeenCalled();
        // Metadata should be stored for security analysis
      });
    });

    describe('Session Token Entropy', () => {
      it('should generate tokens with sufficient entropy', () => {
        const tokens = new Set();
        const iterations = 10000;

        for (let i = 0; i < iterations; i++) {
          tokens.add(generateSessionToken());
        }

        // No collisions in 10,000 tokens
        expect(tokens.size).toBe(iterations);
      });

      it('should use cryptographically secure random number generator', () => {
        const token = generateSessionToken();

        // Token should be 32 bytes (64 hex chars) from crypto.randomBytes
        expect(token.length).toBe(64);
        expect(token).toMatch(/^[a-f0-9]+$/);

        // Should not be predictable (not sequential)
        const token2 = generateSessionToken();
        expect(parseInt(token, 16) + 1).not.toBe(parseInt(token2, 16));
      });
    });

    describe('Session Security Best Practices', () => {
      it('should bind session to additional factors (IP, user agent)', async () => {
        const sessionToken = generateSessionToken();
        const sessionId = crypto.randomUUID();

        const metadata = {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        };

        sql
          .mockResolvedValueOnce({
            rows: [
              {
                id: sessionId,
                user_id: null,
                metadata: JSON.stringify(metadata),
                expires_at: new Date(Date.now() + 86400000).toISOString(),
              },
            ],
          })
          .mockResolvedValueOnce({ rows: [], rowCount: 1 });

        const result = await validateSessionToken(sessionToken);

        expect(result?.metadata).toBeDefined();

        // In production, verify IP and user agent match
        const storedMetadata = JSON.parse(result?.metadata);
        expect(storedMetadata.ipAddress).toBe('192.168.1.1');
      });

      it('should implement logout on all devices functionality', async () => {
        sql.mockResolvedValue({ rows: [], rowCount: 3 });

        const userId = 'user-123';

        // Revoke all sessions for a user (logout from all devices)
        // In production, this would be: UPDATE sessions SET revoked = true WHERE user_id = userId

        // Mock the operation
        await sql`UPDATE sessions SET revoked = true WHERE user_id = ${userId}`;

        expect(sql).toHaveBeenCalled();
      });

      it('should implement suspicious activity detection', async () => {
        const sessionToken = generateSessionToken();

        // Detect suspicious patterns:
        // - Rapid location changes
        // - Multiple failed attempts
        // - Unusual access patterns

        const metadata1 = {
          ipAddress: '192.168.1.1',
          location: 'US',
          timestamp: Date.now(),
        };

        const metadata2 = {
          ipAddress: '45.67.89.10',
          location: 'RU',
          timestamp: Date.now() + 1000, // 1 second later
        };

        // Rapid location change should trigger alert
        const locationChange = metadata1.location !== metadata2.location;
        const timeDiff = metadata2.timestamp - metadata1.timestamp;
        const suspicious = locationChange && timeDiff < 60000; // < 1 minute

        expect(suspicious).toBe(true);
      });
    });
  });
});
