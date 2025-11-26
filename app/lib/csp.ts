// app/lib/csp.ts
import { headers } from 'next/headers';

/**
 * CSP Utilities for Next.js
 * 
 * This module provides utilities for working with Content Security Policy
 * in Next.js applications.
 */

/**
 * Retrieves the CSP nonce from request headers.
 * 
 * The nonce is generated in middleware.ts and passed via the x-nonce header.
 * This should be used in Server Components that need to pass the nonce
 * to client components or inline scripts.
 * 
 * @returns The nonce string, or empty string if not available
 * 
 * @example
 * // In a Server Component
 * import { getNonce } from '@/app/lib/csp';
 * 
 * export default async function Page() {
 *   const nonce = await getNonce();
 *   return <Script nonce={nonce} src="..." />;
 * }
 */
export async function getNonce(): Promise<string> {
  const headerList = await headers();
  return headerList.get('x-nonce') || '';
}

/**
 * CSP Directive Configuration
 * 
 * These are the allowed sources for each CSP directive.
 * They should match the configuration in middleware.ts.
 * 
 * This is exported for reference/documentation purposes.
 */
export const CSP_DIRECTIVES = {
  scriptSources: [
    "'self'",
    "'strict-dynamic'",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://www.liqpay.ua",
    "https://api.monobank.ua",
    "https://pay.google.com",
    "https://va.vercel-scripts.com",
  ],
  
  styleSources: [
    "'self'",
    "'unsafe-inline'", // Required for React inline styles
    "https://fonts.googleapis.com",
    "https://unpkg.com",
  ],
  
  imgSources: [
    "'self'",
    "data:",
    "blob:",
    "https:",
  ],
  
  fontSources: [
    "'self'",
    "data:",
    "https://fonts.gstatic.com",
    "https://unpkg.com",
  ],
  
  connectSources: [
    "'self'",
    "https://api.liqpay.ua",
    "https://www.liqpay.ua",
    "https://api.monobank.ua",
    "https://pay.google.com",
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
    "https://www.google-analytics.com",
    "https://www.googletagmanager.com",
    "https://analytics.google.com",
  ],
  
  frameSources: [
    "'self'",
    "https://www.liqpay.ua",
    "https://pay.google.com",
  ],
} as const;

/**
 * Security Headers Reference
 * 
 * These headers are set by the middleware for all requests.
 */
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-XSS-Protection': '1; mode=block',
  'X-DNS-Prefetch-Control': 'on',
} as const;
