/**
 * Admin Path Utility (Task 7)
 *
 * Provides utility functions for getting the admin path from environment variables.
 * The actual folder structure stays as [admin-path-57fyg] (Next.js constraint),
 * but all internal references use the environment variable.
 */

/**
 * Get the admin path for server components
 * Uses NEXT_PUBLIC_ADMIN_PATH_SECRET environment variable
 * Defaults to 'admin' if not set
 */
export function getAdminPath(): string {
  return process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET || 'admin';
}

/**
 * Get the full admin URL path
 * @param subPath - Optional subpath (e.g., 'login', 'products', 'orders')
 * @returns Full path like '/admin-secret/login'
 */
export function getAdminUrl(subPath?: string): string {
  const basePath = `/${getAdminPath()}`;
  if (!subPath) return basePath;
  return `${basePath}/${subPath}`;
}

/**
 * Get admin API path
 * @param endpoint - API endpoint path (e.g., 'auth/login', 'products')
 * @returns Full API path like '/admin-secret/api/auth/login'
 */
export function getAdminApiUrl(endpoint: string): string {
  return `/${getAdminPath()}/api/${endpoint}`;
}

/**
 * Client-side compatible admin path getter
 * Note: For client components, use process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET directly
 * This function is for server components or shared code
 */
export const ADMIN_PATH = process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET || 'admin';
