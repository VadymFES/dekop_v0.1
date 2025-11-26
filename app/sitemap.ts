import { MetadataRoute } from 'next';
import { sql } from '@vercel/postgres';

/**
 * Dynamic Sitemap Generation
 *
 * Generates a sitemap.xml file for SEO optimization.
 * Includes all static pages and dynamic product pages from the database.
 *
 * Next.js automatically serves this at /sitemap.xml
 *
 * Updates:
 * - Static pages: daily
 * - Product pages: weekly
 * - Priority: homepage (1.0), catalog (0.9), products (0.8), other pages (0.5)
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dekop.com.ua';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/catalog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/cart`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/favorites`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/checkout`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  // Fetch all products from database for dynamic product pages
  let productPages: MetadataRoute.Sitemap = [];

  try {
    const { rows } = await sql`
      SELECT slug, updated_at, created_at
      FROM products
      WHERE slug IS NOT NULL
      ORDER BY updated_at DESC
    `;

    productPages = rows.map((product) => ({
      url: `${baseUrl}/product/${product.slug}`,
      lastModified: new Date(product.updated_at || product.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
    // Return static pages even if products fetch fails
  }

  // Combine static and dynamic pages
  return [...staticPages, ...productPages];
}
