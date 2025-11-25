/**
 * GDPR Compliance Utilities
 * Implements data export, right to deletion, consent management, and privacy policy tracking
 */

import { sql } from '@vercel/postgres';
import crypto from 'crypto';

/**
 * Types and Interfaces
 */

export interface UserData {
  personalInfo: {
    email: string;
    name?: string;
    surname?: string;
    phone?: string;
    createdAt: string;
    updatedAt: string;
  };
  orders: any[];
  cartItems: any[];
  favorites: any[];
  consents: any[];
  privacyPolicyAcceptances: any[];
  sessions: any[];
}

export interface ConsentType {
  type: 'cookies' | 'marketing' | 'analytics' | 'data_processing' | 'third_party';
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
  version: string;
}

export interface PrivacyPolicyAcceptance {
  version: string;
  acceptedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataExportOptions {
  format: 'json' | 'csv';
  includeOrders?: boolean;
  includeCart?: boolean;
  includeFavorites?: boolean;
  includeConsents?: boolean;
  includeSessions?: boolean;
}

export interface DeletionOptions {
  keepOrderHistory?: boolean; // For legal/accounting requirements
  keepTransactionRecords?: boolean;
  anonymizeInsteadOfDelete?: boolean;
}

/**
 * Data Export Functionality
 */

/**
 * Exports all user data in the specified format
 *
 * @param userEmail - User's email address
 * @param options - Export options
 * @returns User data in the requested format
 */
export async function exportUserData(
  userEmail: string,
  options: DataExportOptions = { format: 'json' }
): Promise<{ data: string; contentType: string; filename: string }> {
  try {
    // Fetch all user data
    const userData = await fetchAllUserData(userEmail, options);

    if (options.format === 'json') {
      return {
        data: JSON.stringify(userData, null, 2),
        contentType: 'application/json',
        filename: `user-data-${userEmail}-${Date.now()}.json`,
      };
    } else {
      // CSV format
      const csv = convertUserDataToCSV(userData);
      return {
        data: csv,
        contentType: 'text/csv',
        filename: `user-data-${userEmail}-${Date.now()}.csv`,
      };
    }
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw new Error('Failed to export user data');
  }
}

/**
 * Fetches all user data from the database
 *
 * @param userEmail - User's email address
 * @param options - Data fetch options
 * @returns Complete user data object
 */
async function fetchAllUserData(
  userEmail: string,
  options: DataExportOptions
): Promise<UserData> {
  const userData: UserData = {
    personalInfo: {
      email: userEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    orders: [],
    cartItems: [],
    favorites: [],
    consents: [],
    privacyPolicyAcceptances: [],
    sessions: [],
  };

  // Fetch personal info from orders (users table doesn't exist in this schema)
  const personalInfoResult = await sql`
    SELECT user_email, user_name, user_surname, user_phone, MIN(created_at) as created_at
    FROM orders
    WHERE LOWER(user_email) = LOWER(${userEmail})
    GROUP BY user_email, user_name, user_surname, user_phone
    LIMIT 1
  `;

  if (personalInfoResult.rows.length > 0) {
    const info = personalInfoResult.rows[0];
    userData.personalInfo.name = info.user_name;
    userData.personalInfo.surname = info.user_surname;
    userData.personalInfo.phone = info.user_phone;
    userData.personalInfo.createdAt = info.created_at;
  }

  // Fetch orders if requested
  if (options.includeOrders !== false) {
    const ordersResult = await sql`
      SELECT o.*,
        json_agg(
          json_build_object(
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'color', oi.color
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE LOWER(o.user_email) = LOWER(${userEmail})
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
    userData.orders = ordersResult.rows;
  }

  // Fetch cart items if requested
  if (options.includeCart !== false) {
    const cartResult = await sql`
      SELECT c.id as cart_id, ci.*, p.name as product_name, p.price
      FROM carts c
      JOIN cart_items ci ON c.id = ci.cart_id
      JOIN products p ON ci.product_id = p.id
      WHERE c.user_email = ${userEmail}
    `;
    userData.cartItems = cartResult.rows;
  }

  // Fetch consents if requested
  if (options.includeConsents !== false) {
    const consentsResult = await sql`
      SELECT consent_type, granted, granted_at, revoked_at, version
      FROM user_consents
      WHERE user_email = ${userEmail}
      ORDER BY granted_at DESC
    `;
    userData.consents = consentsResult.rows;
  }

  // Fetch privacy policy acceptances
  const privacyResult = await sql`
    SELECT version, accepted_at, ip_address, user_agent
    FROM privacy_policy_acceptances
    WHERE user_email = ${userEmail}
    ORDER BY accepted_at DESC
  `;
  userData.privacyPolicyAcceptances = privacyResult.rows;

  // Fetch active sessions (without token hashes for security)
  if (options.includeSessions !== false) {
    const sessionsResult = await sql`
      SELECT id, created_at, last_accessed_at, expires_at, metadata
      FROM sessions
      WHERE user_id = ${userEmail}
        AND revoked = false
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `;
    userData.sessions = sessionsResult.rows;
  }

  return userData;
}

/**
 * Converts user data to CSV format
 *
 * @param userData - User data object
 * @returns CSV string
 */
function convertUserDataToCSV(userData: UserData): string {
  const lines: string[] = [];

  // Personal Info section
  lines.push('PERSONAL INFORMATION');
  lines.push('Email,Name,Surname,Phone,Created At');
  lines.push(
    `${userData.personalInfo.email},${userData.personalInfo.name || ''},${userData.personalInfo.surname || ''},${userData.personalInfo.phone || ''},${userData.personalInfo.createdAt}`
  );
  lines.push('');

  // Orders section
  if (userData.orders.length > 0) {
    lines.push('ORDERS');
    lines.push('Order Number,Total Amount,Payment Status,Order Status,Created At');
    userData.orders.forEach((order) => {
      lines.push(
        `${order.order_number},${order.total_amount},${order.payment_status},${order.order_status},${order.created_at}`
      );
    });
    lines.push('');
  }

  // Consents section
  if (userData.consents.length > 0) {
    lines.push('CONSENTS');
    lines.push('Type,Granted,Granted At,Revoked At,Version');
    userData.consents.forEach((consent) => {
      lines.push(
        `${consent.consent_type},${consent.granted},${consent.granted_at || ''},${consent.revoked_at || ''},${consent.version}`
      );
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Right to Deletion (Right to be Forgotten)
 */

/**
 * Deletes or anonymizes user data according to GDPR requirements
 *
 * @param userEmail - User's email address
 * @param options - Deletion options
 * @returns Deletion summary
 */
export async function deleteUserData(
  userEmail: string,
  options: DeletionOptions = {}
): Promise<{
  success: boolean;
  deletedRecords: { [key: string]: number };
  anonymizedRecords: { [key: string]: number };
  retainedRecords: { [key: string]: number };
}> {
  const deletedRecords: { [key: string]: number } = {};
  const anonymizedRecords: { [key: string]: number } = {};
  const retainedRecords: { [key: string]: number } = {};

  try {
    // Log the deletion request for audit purposes
    await logGDPRAction(userEmail, 'data_deletion_requested', {
      options,
      timestamp: new Date().toISOString(),
    });

    if (options.anonymizeInsteadOfDelete) {
      // Anonymize data instead of deleting
      await anonymizeUserData(userEmail, anonymizedRecords, retainedRecords);
    } else {
      // Delete cart items
      const cartResult = await sql`
        DELETE FROM cart_items
        WHERE cart_id IN (
          SELECT id FROM carts WHERE user_email = ${userEmail}
        )
      `;
      deletedRecords.cart_items = cartResult.rowCount || 0;

      // Delete carts
      const cartsResult = await sql`
        DELETE FROM carts WHERE user_email = ${userEmail}
      `;
      deletedRecords.carts = cartsResult.rowCount || 0;

      // Handle orders based on options
      if (options.keepOrderHistory || options.keepTransactionRecords) {
        // Anonymize orders instead of deleting (for legal requirements)
        const anonymizedEmail = `deleted-user-${crypto.randomUUID()}@anonymized.local`;
        const orderAnonymizeResult = await sql`
          UPDATE orders
          SET user_email = ${anonymizedEmail},
              user_name = 'Deleted',
              user_surname = 'User',
              user_phone = 'REDACTED',
              delivery_address = 'REDACTED',
              delivery_city = 'REDACTED',
              delivery_street = 'REDACTED',
              delivery_building = 'REDACTED',
              delivery_apartment = 'REDACTED',
              delivery_postal_code = 'REDACTED',
              customer_notes = NULL
          WHERE LOWER(user_email) = LOWER(${userEmail})
        `;
        anonymizedRecords.orders = orderAnonymizeResult.rowCount || 0;
        retainedRecords.orders = orderAnonymizeResult.rowCount || 0;
      } else {
        // Delete order items first (foreign key constraint)
        const orderItemsResult = await sql`
          DELETE FROM order_items
          WHERE order_id IN (
            SELECT id FROM orders WHERE LOWER(user_email) = LOWER(${userEmail})
          )
        `;
        deletedRecords.order_items = orderItemsResult.rowCount || 0;

        // Delete orders
        const ordersResult = await sql`
          DELETE FROM orders WHERE LOWER(user_email) = LOWER(${userEmail})
        `;
        deletedRecords.orders = ordersResult.rowCount || 0;
      }

      // Delete sessions
      const sessionsResult = await sql`
        DELETE FROM sessions WHERE user_id = ${userEmail}
      `;
      deletedRecords.sessions = sessionsResult.rowCount || 0;

      // Delete CSRF tokens
      const csrfResult = await sql`
        DELETE FROM csrf_tokens
        WHERE session_id IN (
          SELECT id FROM sessions WHERE user_id = ${userEmail}
        )
      `;
      deletedRecords.csrf_tokens = csrfResult.rowCount || 0;

      // Revoke consents (keep audit trail)
      const consentsResult = await sql`
        UPDATE user_consents
        SET granted = false,
            revoked_at = NOW()
        WHERE user_email = ${userEmail}
          AND granted = true
      `;
      retainedRecords.consent_records = consentsResult.rowCount || 0;
    }

    // Log the deletion completion
    await logGDPRAction(userEmail, 'data_deletion_completed', {
      deletedRecords,
      anonymizedRecords,
      retainedRecords,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      deletedRecords,
      anonymizedRecords,
      retainedRecords,
    };
  } catch (error) {
    console.error('Error deleting user data:', error);
    await logGDPRAction(userEmail, 'data_deletion_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    throw new Error('Failed to delete user data');
  }
}

/**
 * Anonymizes user data while retaining necessary records
 *
 * @param userEmail - User's email address
 * @param anonymizedRecords - Record counter
 * @param retainedRecords - Record counter
 */
async function anonymizeUserData(
  userEmail: string,
  anonymizedRecords: { [key: string]: number },
  retainedRecords: { [key: string]: number }
): Promise<void> {
  const anonymizedEmail = `anonymized-${crypto.randomUUID()}@deleted.local`;

  // Anonymize orders
  const ordersResult = await sql`
    UPDATE orders
    SET user_email = ${anonymizedEmail},
        user_name = 'Anonymized',
        user_surname = 'User',
        user_phone = 'REDACTED',
        delivery_address = 'REDACTED',
        customer_notes = NULL
    WHERE LOWER(user_email) = LOWER(${userEmail})
  `;
  anonymizedRecords.orders = ordersResult.rowCount || 0;
  retainedRecords.orders = ordersResult.rowCount || 0;

  // Delete carts (not needed after anonymization)
  const cartItemsResult = await sql`
    DELETE FROM cart_items
    WHERE cart_id IN (
      SELECT id FROM carts WHERE user_email = ${userEmail}
    )
  `;
  anonymizedRecords.cart_items = cartItemsResult.rowCount || 0;

  const cartsResult = await sql`
    DELETE FROM carts WHERE user_email = ${userEmail}
  `;
  anonymizedRecords.carts = cartsResult.rowCount || 0;

  // Delete sessions
  const sessionsResult = await sql`
    DELETE FROM sessions WHERE user_id = ${userEmail}
  `;
  anonymizedRecords.sessions = sessionsResult.rowCount || 0;
}

/**
 * Consent Management
 */

/**
 * Records a user consent
 *
 * @param userEmail - User's email address
 * @param consentType - Type of consent
 * @param granted - Whether consent was granted
 * @param version - Consent policy version
 * @param metadata - Additional metadata (IP, user agent, etc.)
 */
export async function recordConsent(
  userEmail: string,
  consentType: ConsentType['type'],
  granted: boolean,
  version: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  try {
    await sql`
      INSERT INTO user_consents (
        user_email,
        consent_type,
        granted,
        granted_at,
        revoked_at,
        version,
        ip_address,
        user_agent
      ) VALUES (
        ${userEmail},
        ${consentType},
        ${granted},
        ${granted ? new Date().toISOString() : null},
        ${!granted ? new Date().toISOString() : null},
        ${version},
        ${metadata?.ipAddress || null},
        ${metadata?.userAgent || null}
      )
      ON CONFLICT (user_email, consent_type)
      DO UPDATE SET
        granted = ${granted},
        granted_at = CASE WHEN ${granted} THEN ${new Date().toISOString()}::timestamptz ELSE user_consents.granted_at END,
        revoked_at = CASE WHEN ${!granted} THEN ${new Date().toISOString()}::timestamptz ELSE NULL END,
        version = ${version},
        ip_address = ${metadata?.ipAddress || null},
        user_agent = ${metadata?.userAgent || null}
    `;

    await logGDPRAction(userEmail, 'consent_updated', {
      consentType,
      granted,
      version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error recording consent:', error);
    throw new Error('Failed to record consent');
  }
}

/**
 * Retrieves user consents
 *
 * @param userEmail - User's email address
 * @returns Array of user consents
 */
export async function getUserConsents(userEmail: string): Promise<ConsentType[]> {
  try {
    const result = await sql`
      SELECT consent_type as type, granted, granted_at, revoked_at, version
      FROM user_consents
      WHERE user_email = ${userEmail}
      ORDER BY granted_at DESC
    `;

    return result.rows.map((row) => ({
      type: row.type,
      granted: row.granted,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      version: row.version,
    }));
  } catch (error) {
    console.error('Error fetching user consents:', error);
    return [];
  }
}

/**
 * Revokes a specific consent
 *
 * @param userEmail - User's email address
 * @param consentType - Type of consent to revoke
 */
export async function revokeConsent(
  userEmail: string,
  consentType: ConsentType['type']
): Promise<void> {
  try {
    await sql`
      UPDATE user_consents
      SET granted = false,
          revoked_at = NOW()
      WHERE user_email = ${userEmail}
        AND consent_type = ${consentType}
    `;

    await logGDPRAction(userEmail, 'consent_revoked', {
      consentType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error revoking consent:', error);
    throw new Error('Failed to revoke consent');
  }
}

/**
 * Privacy Policy Integration
 */

/**
 * Records a privacy policy acceptance
 *
 * @param userEmail - User's email address
 * @param version - Privacy policy version
 * @param metadata - Additional metadata (IP, user agent, etc.)
 */
export async function recordPrivacyPolicyAcceptance(
  userEmail: string,
  version: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  try {
    await sql`
      INSERT INTO privacy_policy_acceptances (
        user_email,
        version,
        accepted_at,
        ip_address,
        user_agent
      ) VALUES (
        ${userEmail},
        ${version},
        NOW(),
        ${metadata?.ipAddress || null},
        ${metadata?.userAgent || null}
      )
    `;

    await logGDPRAction(userEmail, 'privacy_policy_accepted', {
      version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error recording privacy policy acceptance:', error);
    throw new Error('Failed to record privacy policy acceptance');
  }
}

/**
 * Checks if user has accepted the latest privacy policy
 *
 * @param userEmail - User's email address
 * @param currentVersion - Current privacy policy version
 * @returns True if user has accepted the latest version
 */
export async function hasAcceptedLatestPrivacyPolicy(
  userEmail: string,
  currentVersion: string
): Promise<boolean> {
  try {
    const result = await sql`
      SELECT version
      FROM privacy_policy_acceptances
      WHERE user_email = ${userEmail}
      ORDER BY accepted_at DESC
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].version === currentVersion;
  } catch (error) {
    console.error('Error checking privacy policy acceptance:', error);
    return false;
  }
}

/**
 * Audit Logging
 */

/**
 * Logs a GDPR-related action for audit purposes
 *
 * @param userEmail - User's email address
 * @param action - Action type
 * @param details - Action details
 */
export async function logGDPRAction(
  userEmail: string,
  action: string,
  details: any
): Promise<void> {
  try {
    await sql`
      INSERT INTO gdpr_audit_log (
        user_email,
        action,
        details,
        created_at
      ) VALUES (
        ${userEmail},
        ${action},
        ${JSON.stringify(details)},
        NOW()
      )
    `;
  } catch (error) {
    console.error('Error logging GDPR action:', error);
    // Don't throw - audit logging failures shouldn't break the main flow
  }
}

/**
 * Retrieves GDPR audit log for a user
 *
 * @param userEmail - User's email address
 * @param limit - Maximum number of records to return
 * @returns Array of audit log entries
 */
export async function getGDPRAuditLog(
  userEmail: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const result = await sql`
      SELECT action, details, created_at
      FROM gdpr_audit_log
      WHERE user_email = ${userEmail}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return result.rows;
  } catch (error) {
    console.error('Error fetching GDPR audit log:', error);
    return [];
  }
}

/**
 * Utility Functions
 */

/**
 * Validates if an email has required consents for processing
 *
 * @param userEmail - User's email address
 * @param requiredConsents - Array of required consent types
 * @returns True if all required consents are granted
 */
export async function hasRequiredConsents(
  userEmail: string,
  requiredConsents: ConsentType['type'][]
): Promise<boolean> {
  try {
    const result = await sql`
      SELECT consent_type, granted
      FROM user_consents
      WHERE user_email = ${userEmail}
        AND consent_type = ANY(${requiredConsents})
        AND granted = true
    `;

    return result.rows.length === requiredConsents.length;
  } catch (error) {
    console.error('Error checking required consents:', error);
    return false;
  }
}

/**
 * Schedules a data deletion request (for verification period)
 *
 * @param userEmail - User's email address
 * @param verificationToken - Token for verification
 * @param scheduledDate - Date when deletion should occur
 */
export async function scheduleDeletionRequest(
  userEmail: string,
  verificationToken: string,
  scheduledDate: Date
): Promise<void> {
  try {
    await sql`
      INSERT INTO data_deletion_requests (
        user_email,
        verification_token,
        scheduled_date,
        status,
        created_at
      ) VALUES (
        ${userEmail},
        ${verificationToken},
        ${scheduledDate.toISOString()},
        'pending',
        NOW()
      )
    `;

    await logGDPRAction(userEmail, 'deletion_request_scheduled', {
      scheduledDate: scheduledDate.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error scheduling deletion request:', error);
    throw new Error('Failed to schedule deletion request');
  }
}
