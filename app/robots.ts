import { MetadataRoute } from 'next';

/**
 * Robots.txt Configuration
 *
 * Configures search engine crawler behavior.
 * Next.js automatically serves this at /robots.txt
 *
 * Configuration:
 * - Allow all crawlers to index all pages
 * - Disallow crawling of API routes, admin pages, and user-specific pages
 * - Point crawlers to sitemap.xml
 */

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dekop.com.ua';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/product/',
        ],
        disallow: [
          '/api/', // API routes should not be indexed
          '/checkout/', // User checkout pages
          '/order-success/', // Order confirmation pages
          '/payment-cancelled/', // Payment cancellation pages
          '/_next/', // Next.js internal files
          '/admin/', // Admin pages
          '/cart/',
          '/favorites/',
          '/search*',
        ],
        crawlDelay: 1, 
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
