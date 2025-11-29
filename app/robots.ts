import { MetadataRoute } from 'next';

/**
 * Robots.txt Configuration
 *
 * Configures search engine crawler behavior.
 * Next.js automatically serves this at /robots.txt
 *
 * Configuration:
 * - Block all search engines from indexing the site
 * - This prevents the site from appearing in search results
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
  };
}
