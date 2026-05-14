import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dekop.com.ua';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/product/',
          '/catalog',
          '/api/products/',  // needed for page rendering
          '/api/cart',       // needed for cart rendering
        ],
        disallow: [
          '/api/webhooks/',
          '/api/payments/',
          '/api/upload',
          '/api/orders/',
          '/api/gdpr/',
          '/api/cron/',
          '/api/test/',
          '/checkout/',
          '/order-success/',
          '/payment-cancelled/',
          `/${process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET ?? 'admin-path-57fyg'}/`,
          '/cart/',
          '/favorites/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
