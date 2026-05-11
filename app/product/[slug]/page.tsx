import { Metadata, ResolvingMetadata } from 'next';
import { ProductWithImages } from '@/app/lib/definitions';
import { notFound } from 'next/navigation';

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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';

  try {
    const productRes = await fetch(`${baseUrl}/api/products/${slug}`, { next: { revalidate: 60 } });
    if (!productRes.ok) throw new Error('Product not found');
    const product = await productRes.json();

    const [specsRes, colorsRes, similarProductsRes, reviewsRes] = await Promise.all([
      fetch(`${baseUrl}/api/products/product-specs/${product.id}`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/products/product-colors/${product.id}`, { next: { revalidate: 60 } }),
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

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${data.product.name} | Dekop Furniture Enterprise`,
    openGraph: {
      title: data.product.name,
      images: [...(previousImages || [])],
    },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const data = await getProductData(slug);
  
  if (!data || !data.product) {
    notFound();
  }

  return <ClientProductPage 
    product={data.product} 
    reviews={data.reviews} 
    similarProducts={data.similarProducts} 
    categorySlugMap={CATEGORY_SLUG_MAP}
  />;
}