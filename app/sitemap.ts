import { MetadataRoute } from 'next';
import { db } from '@/app/lib/db';

export const revalidate = 86400; // regenerate once per day

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dekop.com.ua';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/catalog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/payment-delivery-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/return-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/user-agreement`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Product pages — wrapped in a timeout so a slow DB never blocks the sitemap
  try {
    const queryPromise = db.query`
      SELECT slug, updated_at
      FROM products
      WHERE stock > 0
         OR updated_at > NOW() - INTERVAL '30 days'
      ORDER BY updated_at DESC
    `;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('sitemap db timeout')), 5000)
    );

    const { rows } = await Promise.race([queryPromise, timeoutPromise]);

    const productPages: MetadataRoute.Sitemap = rows.map((row) => ({
      url: `${baseUrl}/product/${row.slug}`,
      lastModified: new Date(row.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticPages, ...productPages];
  } catch {
    return staticPages;
  }
}
