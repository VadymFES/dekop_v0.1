/**
 * API Authentication utilities
 * Provides internal API key verification for protected endpoints
 */

import { timingSafeEqual } from 'crypto';

/**
 * Performs timing-safe string comparison to prevent timing attacks
 *
 * SECURITY: Regular string comparison (===) can leak information through timing,
 * allowing attackers to brute-force keys by measuring response times.
 * This function uses constant-time comparison to prevent such attacks.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
function timingSafeStringCompare(a: string, b: string): boolean {
  try {
    // Convert strings to buffers for constant-time comparison
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');

    // If lengths don't match, still perform comparison to prevent timing leaks
    if (bufferA.length !== bufferB.length) {
      // Create dummy buffers of same length to prevent timing attacks
      const dummyBuffer = Buffer.alloc(bufferA.length);
      timingSafeEqual(bufferA, dummyBuffer);
      return false;
    }

    // Constant-time comparison
    return timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    console.error('Timing-safe comparison error:', error);
    return false;
  }
}

/**
 * Validates internal API key from request headers
 * Used to protect endpoints that need to be called internally or by trusted services
 *
 * SECURITY: Uses timing-safe comparison to prevent timing attacks
 *
 * @param request - The Next.js request object
 * @returns true if API key is valid, false otherwise
 */
export function validateInternalApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key');
  const internalApiKey = process.env.INTERNAL_API_KEY;

  // CRITICAL SECURITY: NEVER allow requests without proper authentication in production
  // If INTERNAL_API_KEY is not configured, deny all requests
  if (!internalApiKey) {
    console.error('🚨 CRITICAL: INTERNAL_API_KEY not configured - denying access');
    return false;
  }

  // Require API key to be present
  if (!apiKey) {
    return false;
  }

  // SECURITY: Use timing-safe comparison to prevent timing attacks
  return timingSafeStringCompare(apiKey, internalApiKey);
}

/**
 * Validates API key (alias for validateInternalApiKey)
 * Used for admin/protected endpoints
 */
export async function validateApiKey(request: Request): Promise<boolean> {
  return validateInternalApiKey(request);
}

/**
 * Gets error response for unauthorized requests
 */
export function getUnauthorizedResponse() {
  return {
    error: 'Unauthorized',
    message: 'Valid API key required. Include x-api-key header with your request.',
    status: 401
  };
}
