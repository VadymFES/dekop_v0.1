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

  // If no internal API key is configured, allow the request
  // This allows the endpoint to work during development
  if (!internalApiKey) {
    console.warn('⚠️ INTERNAL_API_KEY not configured - API key validation skipped');
    return true;
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
