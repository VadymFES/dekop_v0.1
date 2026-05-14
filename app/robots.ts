import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dekop.com.ua';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/product/', '/catalog'],
        disallow: [
          '/api/',
          '/checkout/',
          '/order-success/',
          '/payment-cancelled/',
          '/_next/',
          `/${process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET ?? 'admin-path-57fyg'}/`,
          '/cart/',
          '/favorites/',
          '/coming-soon',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
