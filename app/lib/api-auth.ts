/**
 * API Authentication utilities
 * Provides internal API key verification for protected endpoints
 */

/**
 * Validates internal API key from request headers
 * Used to protect endpoints that need to be called internally or by trusted services
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

  // Validate the API key
  return apiKey === internalApiKey;
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
