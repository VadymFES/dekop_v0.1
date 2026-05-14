import { Metadata, ResolvingMetadata } from 'next';
import { headers } from 'next/headers';
import { ProductWithImages } from '@/app/lib/definitions';
import { notFound } from 'next/navigation';
import { productSchema, breadcrumbSchema } from '@/app/lib/schema';

import ClientProductPage from './client-page';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const CATEGORY_SLUG_MAP: Record<string, { dbValue: string; uaName: string }> = {
  sofas:      { dbValue: "Диван", uaName: "Дивани" },
  sofaBeds:   { dbValue: "Диван-Ліжко", uaName: "Дивани-ліжка" },
  cornerSofas:{ dbValue: "Кутовий Диван", uaName: "Кутові дивани" }, 
  chairs:     { dbValue: "Стілець", uaName: "Стільці" },
  tables:     { dbValue: "Стіл", uaName: "Столи" },
  wardrobes:  { dbValue: "Шафа", uaName: "Шафи" },
  beds:       { dbValue: "Ліжко", uaName: "Ліжка" },
  mattresses: { dbValue: "Матрац", uaName: "Матраци" },
  accessories:{ dbValue: "Аксесуар", uaName: "Аксесуари" }
};

async function getProductData(slug: string) {
  const headersList = await headers();
  const host = headersList.get('host') || 'dekop.com.ua';
  const baseUrl = host.includes('localhost') ? `http://${host}` : `https://${host}`;

  try {
    const productRes = await fetch(`${baseUrl}/api/products/${slug}`, { next: { revalidate: 60 } });
    if (!productRes.ok) throw new Error('Product not found');
    const product = await productRes.json();

    const [specsRes, colorsRes, similarProductsRes, reviewsRes] = await Promise.all([
      fetch(`${baseUrl}/api/products/specs/${product.id}`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/products/colors/${product.id}`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/product/api/similarRecommendations/${slug}`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/products/reviews/${product.id}`, { next: { revalidate: 60 } })
    ]);

    let specsData = null;
    let categoryOverride = null;

    if (specsRes.ok) {
      const specsResponse = await specsRes.json();
      if (specsResponse && specsResponse.specs) {
        specsData = specsResponse.specs;
        categoryOverride = specsResponse.category;
      } else {
        specsData = specsResponse;
      }
    }

    const colors = colorsRes.ok ? await colorsRes.json() : [];
    const similarProducts = similarProductsRes.ok ? await similarProductsRes.json() : [];
    const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

    const fullProduct: ProductWithImages = {
      ...product,
      category: categoryOverride || product.category,
      specs: specsData,
      colors,
    };

    return {
      product: fullProduct,
      reviews,
      similarProducts,
    };
  } catch (error) {
    console.error('Error loading product data:', error);
    return null;
  }
}

export async function generateMetadata(
  { params, searchParams }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductData(slug);

  if (!data || !data.product) {
    return {
      title: 'Товар не знайдений | Dekop Furniture Enterprise',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dekop.com.ua';
  const product = data.product;
  const primaryImage = product.images?.find(i => i.is_primary) ?? product.images?.[0];
  const desc = product.description
    ? `${product.description.slice(0, 120)}. Ціна: ${product.sale_price ?? product.price} грн. Доставка по Україні.`
    : `Купити ${product.name} в Dekop. Ціна: ${product.sale_price ?? product.price} грн. Доставка по Україні.`;

  return {
    title: `${product.name} | Dekop`,
    description: desc,
    alternates: { canonical: `${baseUrl}/product/${slug}` },
    openGraph: {
      title: product.name,
      description: desc,
      url: `${baseUrl}/product/${slug}`,
      type: 'website',
      locale: 'uk_UA',
      images: primaryImage?.image_url
        ? [{ url: primaryImage.image_url, width: 800, height: 800, alt: product.name }]
        : (await parent).openGraph?.images || [],
    },
    twitter: { card: 'summary_large_image', title: product.name, description: desc },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const data = await getProductData(slug);
  
  if (!data || !data.product) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dekop.com.ua';
  const category = Object.entries(CATEGORY_SLUG_MAP).find(
    ([, v]) => v.dbValue.toLowerCase() === data.product.category?.toLowerCase()
  );
  const categorySlug = category?.[0];
  const categoryUa = category?.[1].uaName ?? 'Каталог';

  const schemas = [
    productSchema(data.product, data.reviews, slug),
    breadcrumbSchema([
      { name: 'Головна', url: baseUrl },
      { name: 'Каталог', url: `${baseUrl}/catalog` },
      ...(categorySlug ? [{ name: categoryUa, url: `${baseUrl}/catalog?category=${categorySlug}` }] : []),
      { name: data.product.name, url: `${baseUrl}/product/${slug}` },
    ]),
  ];

  return (
    <>
      {schemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
      <ClientProductPage
        product={data.product}
        reviews={data.reviews}
        similarProducts={data.similarProducts}
        categorySlugMap={CATEGORY_SLUG_MAP}
      />
    </>
  );
}