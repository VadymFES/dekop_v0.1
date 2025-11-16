import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/private/',
          '/*.json',
          '/cart?*', // Don't index cart with parameters
          '/checkout',
          '/account',
          '/login',
          '/register',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: [
          '/',
          '/catalog',
          '/product/*',
          '/about-us',
          '/individual-order',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/private/',
          '/cart',
          '/checkout',
          '/account',
        ],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: [
          '/',
          '/catalog',
          '/product/*',
          '/about-us',
          '/individual-order',
        ],
        disallow: [
          '/api/',
          '/admin/', 
          '/private/',
          '/cart',
          '/checkout',
          '/account',
        ],
      },
      {
        userAgent: 'Claude-Web',
        allow: [
          '/',
          '/catalog',
          '/product/*',
          '/about-us',
          '/individual-order',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/private/',
          '/cart',
          '/checkout',
          '/account',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/private/',
          '/cart',
          '/checkout',
          '/account',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/private/',
          '/cart?*',
          '/checkout',
          '/account',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}