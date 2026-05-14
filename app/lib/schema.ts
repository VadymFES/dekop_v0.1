import { ProductWithImages, Review } from '@/app/lib/definitions';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dekop.com.ua';

export function productSchema(product: ProductWithImages, reviews: Review[], slug: string) {
  const price = product.sale_price ?? product.price;

  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    '@id': `${BASE_URL}/product/${slug}#product`,
    name: product.name,
    description: product.description || product.name,
    url: `${BASE_URL}/product/${slug}`,
    image: product.images?.map(i => i.image_url).filter(Boolean) ?? [],
    brand: { '@type': 'Brand', name: 'Dekop' },
    offers: {
      '@type': 'Offer',
      url: `${BASE_URL}/product/${slug}`,
      priceCurrency: 'UAH',
      price: price.toString(),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Dekop', url: BASE_URL },
    },
    ...(product.rating && product.reviews > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating.toFixed(1),
        reviewCount: product.reviews,
        bestRating: '5',
        worstRating: '1',
      },
    }),
    ...(reviews.length > 0 && {
      review: reviews.slice(0, 5).map(r => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.user_name },
        reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: '5' },
        reviewBody: r.comment,
        datePublished: r.created_at?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      })),
    }),
  };
}

export function breadcrumbSchema(crumbs: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Dekop',
    url: BASE_URL,
    logo: `${BASE_URL}/logomain.png`,
    description: 'Інтернет-магазин меблів — дивани, ліжка, столи, шафи та аксесуари для вашого дому. Доставка по Україні.',
    sameAs: [
      'https://www.instagram.com/meblidekor4you/',
      'https://www.facebook.com/profile.php?id=100093951543078',
    ],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org/',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    name: 'Dekop',
    url: BASE_URL,
    inLanguage: 'uk-UA',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/catalog?q={search_term}` },
      'query-input': 'required name=search_term',
    },
  };
}
