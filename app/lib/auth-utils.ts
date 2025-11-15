// app/lib/auth-utils.ts
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import crypto from 'crypto';

/**
 * Generates a secure session token for order access
 */
export function generateOrderAccessToken(orderId: string): string {
  const secret = process.env.ORDER_ACCESS_SECRET || 'change-me-in-production';
  const timestamp = Date.now();
  const data = `${orderId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return Buffer.from(`${data}:${signature}`).toString('base64');
}

/**
 * Verifies order access token
 */
export function verifyOrderAccessToken(
  orderId: string,
  token: string
): boolean {
  try {
    const secret = process.env.ORDER_ACCESS_SECRET || 'change-me-in-production';
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [tokenOrderId, timestamp, signature] = decoded.split(':');

    // Verify order ID matches
    if (tokenOrderId !== orderId) return false;

    // Verify token not expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 24 * 60 * 60 * 1000) return false;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${tokenOrderId}:${timestamp}`)
      .digest('hex');

    return signature === expectedSignature;
  } catch {
    return false;
  }
}

/**
 * Alternative: Verify order ownership via email + order ID
 */
export async function verifyOrderOwnership(
  orderId: string,
  email: string
): Promise<boolean> {
  try {
    const result = await sql`
      SELECT id FROM orders
      WHERE id = ${orderId} AND user_email = ${email}
    `;
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Verifies admin authentication via Bearer token
 */
export function verifyAdminAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  const adminToken = process.env.ADMIN_API_TOKEN;

  if (!adminToken) {
    console.error('ADMIN_API_TOKEN not configured');
    return false;
  }

  return token === adminToken;
}
