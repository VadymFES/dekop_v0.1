/**
 * GDPR Compliance Tests
 * Comprehensive tests for data export, right to deletion, consent management, and privacy policy
 */

import {
  exportUserData,
  deleteUserData,
  recordConsent,
  getUserConsents,
  revokeConsent,
  recordPrivacyPolicyAcceptance,
  hasAcceptedLatestPrivacyPolicy,
  logGDPRAction,
  getGDPRAuditLog,
  hasRequiredConsents,
  scheduleDeletionRequest,
} from '@/app/lib/gdpr-compliance';

// Mock dependencies
jest.mock('@vercel/postgres', () => ({
  sql: jest.fn(),
}));

const { sql } = require('@vercel/postgres');

describe('GDPR Compliance - Data Export', () => {
  const testEmail = 'user@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportUserData', () => {
    it('should export user data in JSON format', async () => {
      // Mock database responses
      sql
        .mockResolvedValueOnce({
          // Personal info
          rows: [
            {
              user_email: testEmail,
              user_name: 'John',
              user_surname: 'Doe',
              user_phone: '+380501234567',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({
          // Orders
          rows: [
            {
              id: 'order-1',
              order_number: '#1234567890',
              total_amount: 1000,
              payment_status: 'paid',
              created_at: '2024-01-15T00:00:00Z',
              items: [],
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }) // Cart items
        .mockResolvedValueOnce({ rows: [] }) // Consents
        .mockResolvedValueOnce({ rows: [] }) // Privacy policy
        .mockResolvedValueOnce({ rows: [] }); // Sessions

      const result = await exportUserData(testEmail, { format: 'json' });

      expect(result.contentType).toBe('application/json');
      expect(result.filename).toContain('user-data');
      expect(result.filename).toContain(testEmail);
      expect(result.data).toBeTruthy();

      const parsedData = JSON.parse(result.data);
      expect(parsedData.personalInfo).toBeDefined();
      expect(parsedData.personalInfo.email).toBe(testEmail);
      expect(parsedData.orders).toBeDefined();
    });

    it('should export user data in CSV format', async () => {
      sql
        .mockResolvedValueOnce({
          rows: [
            {
              user_email: testEmail,
              user_name: 'John',
              user_surname: 'Doe',
              user_phone: '+380501234567',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await exportUserData(testEmail, { format: 'csv' });

      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toContain('.csv');
      expect(result.data).toContain('PERSONAL INFORMATION');
      expect(result.data).toContain(testEmail);
    });

    it('should include orders when requested', async () => {
      sql
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              order_number: '#1234567890',
              total_amount: 1500,
              items: [],
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await exportUserData(testEmail, {
        format: 'json',
        includeOrders: true,
      });

      const data = JSON.parse(result.data);
      expect(data.orders).toHaveLength(1);
      expect(data.orders[0].order_number).toBe('#1234567890');
    });

    it('should exclude orders when not requested', async () => {
      sql
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await exportUserData(testEmail, {
        format: 'json',
        includeOrders: false,
      });

      const data = JSON.parse(result.data);
      expect(data.orders).toEqual([]);
    });

    it('should include cart items when requested', async () => {
      sql
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              cart_id: 'cart-123',
              product_id: 1,
              product_name: 'Product 1',
              quantity: 2,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await exportUserData(testEmail, {
        format: 'json',
        includeCart: true,
      });

      const data = JSON.parse(result.data);
      expect(data.cartItems).toHaveLength(1);
    });

    it('should include consents when requested', async () => {
      sql
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              consent_type: 'marketing',
              granted: true,
              version: '1.0',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await exportUserData(testEmail, {
        format: 'json',
        includeConsents: true,
      });

      const data = JSON.parse(result.data);
      expect(data.consents).toHaveLength(1);
      expect(data.consents[0].consent_type).toBe('marketing');
    });

    it('should handle errors gracefully', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      await expect(exportUserData(testEmail, { format: 'json' })).rejects.toThrow(
        'Failed to export user data'
      );
    });

    it('should generate unique filenames', async () => {
      sql
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] });

      const result1 = await exportUserData(testEmail, { format: 'json' });

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      sql
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] });

      const result2 = await exportUserData(testEmail, { format: 'json' });

      expect(result1.filename).not.toBe(result2.filename);
    });
  });
});

describe('GDPR Compliance - Right to Deletion', () => {
  const testEmail = 'user@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteUserData', () => {
    it('should delete all user data by default', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Log deletion request
        .mockResolvedValueOnce({ rows: [], rowCount: 5 }) // Delete cart_items
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Delete carts
        .mockResolvedValueOnce({ rows: [], rowCount: 10 }) // Delete order_items
        .mockResolvedValueOnce({ rows: [], rowCount: 5 }) // Delete orders
        .mockResolvedValueOnce({ rows: [], rowCount: 3 }) // Delete sessions
        .mockResolvedValueOnce({ rows: [], rowCount: 2 }) // Delete CSRF tokens
        .mockResolvedValueOnce({ rows: [], rowCount: 4 }) // Revoke consents
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Log completion

      const result = await deleteUserData(testEmail);

      expect(result.success).toBe(true);
      expect(result.deletedRecords.cart_items).toBe(5);
      expect(result.deletedRecords.carts).toBe(1);
      expect(result.deletedRecords.order_items).toBe(10);
      expect(result.deletedRecords.orders).toBe(5);
      expect(result.deletedRecords.sessions).toBe(3);
    });

    it('should anonymize orders when keepOrderHistory is true', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Log deletion request
        .mockResolvedValueOnce({ rows: [], rowCount: 5 }) // Delete cart_items
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Delete carts
        .mockResolvedValueOnce({ rows: [], rowCount: 3 }) // Anonymize orders
        .mockResolvedValueOnce({ rows: [], rowCount: 2 }) // Delete sessions
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Delete CSRF tokens
        .mockResolvedValueOnce({ rows: [], rowCount: 4 }) // Revoke consents
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Log completion

      const result = await deleteUserData(testEmail, {
        keepOrderHistory: true,
      });

      expect(result.success).toBe(true);
      expect(result.anonymizedRecords.orders).toBe(3);
      expect(result.retainedRecords.orders).toBe(3);
      expect(result.deletedRecords.orders).toBeUndefined();
    });

    it('should fully anonymize data when anonymizeInsteadOfDelete is true', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Log request
        .mockResolvedValueOnce({ rows: [], rowCount: 3 }) // Anonymize orders
        .mockResolvedValueOnce({ rows: [], rowCount: 5 }) // Delete cart_items
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Delete carts
        .mockResolvedValueOnce({ rows: [], rowCount: 2 }) // Delete sessions
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Log completion

      const result = await deleteUserData(testEmail, {
        anonymizeInsteadOfDelete: true,
      });

      expect(result.success).toBe(true);
      expect(result.anonymizedRecords.orders).toBe(3);
      expect(result.retainedRecords.orders).toBe(3);
    });

    it('should log GDPR actions during deletion', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Log deletion request
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Log completion

      await deleteUserData(testEmail);

      // Verify logging calls
      const logCalls = sql.mock.calls.filter((call: any) =>
        call[0].join('').includes('gdpr_audit_log')
      );

      expect(logCalls.length).toBeGreaterThan(0);
    });

    it('should handle deletion errors gracefully', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Log request
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Log failure

      await expect(deleteUserData(testEmail)).rejects.toThrow(
        'Failed to delete user data'
      );

      // Verify failure was logged - check for the action parameter
      const logCalls = sql.mock.calls.filter((call: any) => {
        // call[2] is the action parameter in logGDPRAction
        return call[2] === 'data_deletion_failed';
      });

      expect(logCalls.length).toBeGreaterThan(0);
    });

    it('should retain transaction records for legal compliance', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 5 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 3 }) // Anonymize orders
        .mockResolvedValueOnce({ rows: [], rowCount: 2 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 4 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await deleteUserData(testEmail, {
        keepTransactionRecords: true,
      });

      expect(result.retainedRecords.orders).toBe(3);
      expect(result.anonymizedRecords.orders).toBe(3);
    });
  });
});

describe('GDPR Compliance - Consent Management', () => {
  const testEmail = 'user@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordConsent', () => {
    it('should record a new consent', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Insert consent
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Log action

      await recordConsent(testEmail, 'marketing', true, '1.0');

      expect(sql).toHaveBeenCalledTimes(2);
      const insertCall = sql.mock.calls[0][0];
      expect(insertCall.join('')).toContain('user_consents');
      expect(insertCall.join('')).toContain('consent_type');
      // Verify the actual value is passed as a parameter
      expect(sql.mock.calls[0][2]).toBe('marketing');
    });

    it('should record consent with metadata', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await recordConsent(testEmail, 'cookies', true, '2.0', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(sql).toHaveBeenCalled();
    });

    it('should update existing consent', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await recordConsent(testEmail, 'analytics', false, '1.0');

      const updateCall = sql.mock.calls[0][0];
      expect(updateCall.join('')).toContain('ON CONFLICT');
    });

    it('should log consent changes', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await recordConsent(testEmail, 'data_processing', true, '1.0');

      const logCall = sql.mock.calls[1][0];
      expect(logCall.join('')).toContain('gdpr_audit_log');
    });

    it('should handle recording errors', async () => {
      sql.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        recordConsent(testEmail, 'marketing', true, '1.0')
      ).rejects.toThrow('Failed to record consent');
    });
  });

  describe('getUserConsents', () => {
    it('should retrieve all user consents', async () => {
      sql.mockResolvedValue({
        rows: [
          {
            type: 'marketing',
            granted: true,
            granted_at: '2024-01-01T00:00:00Z',
            version: '1.0',
          },
          {
            type: 'cookies',
            granted: false,
            revoked_at: '2024-01-15T00:00:00Z',
            version: '1.0',
          },
        ],
      });

      const consents = await getUserConsents(testEmail);

      expect(consents).toHaveLength(2);
      expect(consents[0].type).toBe('marketing');
      expect(consents[0].granted).toBe(true);
      expect(consents[1].type).toBe('cookies');
      expect(consents[1].granted).toBe(false);
    });

    it('should return empty array if no consents found', async () => {
      sql.mockResolvedValue({ rows: [] });

      const consents = await getUserConsents(testEmail);

      expect(consents).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      const consents = await getUserConsents(testEmail);

      expect(consents).toEqual([]);
    });
  });

  describe('revokeConsent', () => {
    it('should revoke a specific consent', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update consent
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Log action

      await revokeConsent(testEmail, 'marketing');

      const updateCall = sql.mock.calls[0][0];
      expect(updateCall.join('')).toContain('UPDATE user_consents');
      expect(updateCall.join('')).toContain('granted = false');
    });

    it('should log consent revocation', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await revokeConsent(testEmail, 'analytics');

      const logCall = sql.mock.calls[1][0];
      expect(logCall.join('')).toContain('gdpr_audit_log');
      // Verify the action parameter contains 'consent_revoked'
      expect(sql.mock.calls[1][2]).toBe('consent_revoked');
    });

    it('should handle revocation errors', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      await expect(revokeConsent(testEmail, 'marketing')).rejects.toThrow(
        'Failed to revoke consent'
      );
    });
  });

  describe('hasRequiredConsents', () => {
    it('should return true if all required consents are granted', async () => {
      sql.mockResolvedValue({
        rows: [
          { consent_type: 'data_processing', granted: true },
          { consent_type: 'cookies', granted: true },
        ],
      });

      const hasConsents = await hasRequiredConsents(testEmail, [
        'data_processing',
        'cookies',
      ]);

      expect(hasConsents).toBe(true);
    });

    it('should return false if not all required consents are granted', async () => {
      sql.mockResolvedValue({
        rows: [{ consent_type: 'data_processing', granted: true }],
      });

      const hasConsents = await hasRequiredConsents(testEmail, [
        'data_processing',
        'marketing',
      ]);

      expect(hasConsents).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      const hasConsents = await hasRequiredConsents(testEmail, ['cookies']);

      expect(hasConsents).toBe(false);
    });
  });
});

describe('GDPR Compliance - Privacy Policy', () => {
  const testEmail = 'user@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordPrivacyPolicyAcceptance', () => {
    it('should record privacy policy acceptance', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Insert acceptance
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Log action

      await recordPrivacyPolicyAcceptance(testEmail, '2.0');

      const insertCall = sql.mock.calls[0][0];
      expect(insertCall.join('')).toContain('privacy_policy_acceptances');
    });

    it('should record acceptance with metadata', async () => {
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await recordPrivacyPolicyAcceptance(testEmail, '2.0', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(sql).toHaveBeenCalled();
    });

    it('should handle recording errors', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      await expect(
        recordPrivacyPolicyAcceptance(testEmail, '2.0')
      ).rejects.toThrow('Failed to record privacy policy acceptance');
    });
  });

  describe('hasAcceptedLatestPrivacyPolicy', () => {
    it('should return true if user accepted latest version', async () => {
      sql.mockResolvedValue({
        rows: [{ version: '2.0' }],
      });

      const hasAccepted = await hasAcceptedLatestPrivacyPolicy(testEmail, '2.0');

      expect(hasAccepted).toBe(true);
    });

    it('should return false if user accepted older version', async () => {
      sql.mockResolvedValue({
        rows: [{ version: '1.0' }],
      });

      const hasAccepted = await hasAcceptedLatestPrivacyPolicy(testEmail, '2.0');

      expect(hasAccepted).toBe(false);
    });

    it('should return false if no acceptance found', async () => {
      sql.mockResolvedValue({ rows: [] });

      const hasAccepted = await hasAcceptedLatestPrivacyPolicy(testEmail, '2.0');

      expect(hasAccepted).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      const hasAccepted = await hasAcceptedLatestPrivacyPolicy(testEmail, '2.0');

      expect(hasAccepted).toBe(false);
    });
  });
});

describe('GDPR Compliance - Audit Logging', () => {
  const testEmail = 'user@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logGDPRAction', () => {
    it('should log a GDPR action', async () => {
      sql.mockResolvedValue({ rows: [], rowCount: 1 });

      await logGDPRAction(testEmail, 'data_export_requested', {
        format: 'json',
        timestamp: new Date().toISOString(),
      });

      expect(sql).toHaveBeenCalled();
      const call = sql.mock.calls[0][0];
      expect(call.join('')).toContain('gdpr_audit_log');
    });

    it('should not throw on logging errors', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      // Should not throw - audit logging failures shouldn't break main flow
      await expect(
        logGDPRAction(testEmail, 'test_action', {})
      ).resolves.not.toThrow();
    });
  });

  describe('getGDPRAuditLog', () => {
    it('should retrieve audit log entries', async () => {
      sql.mockResolvedValue({
        rows: [
          {
            action: 'consent_updated',
            details: '{"consentType":"marketing"}',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            action: 'data_export_requested',
            details: '{"format":"json"}',
            created_at: '2024-01-02T00:00:00Z',
          },
        ],
      });

      const log = await getGDPRAuditLog(testEmail);

      expect(log).toHaveLength(2);
      expect(log[0].action).toBe('consent_updated');
      expect(log[1].action).toBe('data_export_requested');
    });

    it('should respect limit parameter', async () => {
      sql.mockResolvedValue({ rows: [] });

      await getGDPRAuditLog(testEmail, 50);

      const call = sql.mock.calls[0][0];
      expect(call.join('')).toContain('LIMIT');
    });

    it('should handle errors gracefully', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      const log = await getGDPRAuditLog(testEmail);

      expect(log).toEqual([]);
    });
  });
});

describe('GDPR Compliance - Deletion Request Scheduling', () => {
  const testEmail = 'user@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleDeletionRequest', () => {
    it('should schedule a deletion request', async () => {
      const verificationToken = 'token-123';
      const scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Insert request
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Log action

      await scheduleDeletionRequest(testEmail, verificationToken, scheduledDate);

      const insertCall = sql.mock.calls[0][0];
      expect(insertCall.join('')).toContain('data_deletion_requests');
      expect(insertCall.join('')).toContain('pending');
    });

    it('should log the scheduled deletion', async () => {
      const verificationToken = 'token-456';
      const scheduledDate = new Date();

      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await scheduleDeletionRequest(testEmail, verificationToken, scheduledDate);

      const logCall = sql.mock.calls[1][0];
      expect(logCall.join('')).toContain('gdpr_audit_log');
      // Verify the action parameter contains 'deletion_request_scheduled'
      expect(sql.mock.calls[1][2]).toBe('deletion_request_scheduled');
    });

    it('should handle scheduling errors', async () => {
      sql.mockRejectedValue(new Error('Database error'));

      const scheduledDate = new Date();

      await expect(
        scheduleDeletionRequest(testEmail, 'token', scheduledDate)
      ).rejects.toThrow('Failed to schedule deletion request');
    });
  });
});
