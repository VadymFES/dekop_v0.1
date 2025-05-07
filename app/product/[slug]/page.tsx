// app/product/[slug]/page.tsx

import { Metadata } from 'next';
import { ProductWithImages } from '@/app/lib/definitions';
import { notFound } from 'next/navigation';

// Import client components
import ClientProductPage from './client-page';

// Define type for page props
interface ProductPageProps {
  params: {
    slug: string;
  };
}

// Define type for metadata props
interface GenerateMetadataProps {
  params: {
    slug: string;
  };
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

// Data fetching function
async function getProductData(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';

  try {
    // Fetch main product data
    const productRes = await fetch(`${baseUrl}/api/products/${slug}`, { next: { revalidate: 3600 } });
    if (!productRes.ok) throw new Error('Product not found');
    const product = await productRes.json();

    // Fetch specs, colors, and similar products
    const [specsRes, colorsRes, similarProductsRes, reviewsRes] = await Promise.all([
      fetch(`${baseUrl}/api/products/product-specs/${product.id}`, { next: { revalidate: 3600 } }),
      fetch(`${baseUrl}/api/products/product-colors/${product.id}`, { next: { revalidate: 3600 } }),
      fetch(`${baseUrl}/api/products/similarRecommendations/${slug}`, { next: { revalidate: 3600 } }),
      fetch(`${baseUrl}/api/products/reviews/${product.id}`, { next: { revalidate: 3600 } })
    ]);

    // Process specs data
    let specsData = null;
    let categoryOverride = null;
    
    if (specsRes.ok) {
      const specsResponse = await specsRes.json();
      
      // Check if the response has a specs property (from our updated API)
      if (specsResponse && specsResponse.specs) {
        specsData = specsResponse.specs;  // Extract just the specs object
        categoryOverride = specsResponse.category; // Get the normalized category from the API
      } else {
        // Handle the case where the API hasn't been updated yet
        specsData = specsResponse;
      }    
    }

    // Get other data
    const colors = colorsRes.ok ? await colorsRes.json() : [];
    const similarProducts = similarProductsRes.ok ? await similarProductsRes.json() : [];
    const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

    // Combine all data
    const fullProduct: ProductWithImages = {
      ...product,
      // Override category if we got a normalized one from the API
      category: categoryOverride || product.category,
      specs: specsData,
      colors,
    };

    console.log('Full product with specs:', {
      id: fullProduct.id,
      category: fullProduct.category,
      hasSpecs: Boolean(fullProduct.specs)
    });

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

// Generate metadata for the page
export async function generateMetadata({ params }: GenerateMetadataProps): Promise<Metadata> {
  const awaitedParams = await Promise.resolve(params);
  const slug = awaitedParams.slug;
  const data = await getProductData(slug);

  if (!data || !data.product) {
    return {
      title: 'Product Not Found | Dekop Furniture Enterprise',
    };
  }

  return {
    title: `${data.product.name} | Dekop Furniture Enterprise - меблі для вашого дому`,
    openGraph: {
      title: data.product.name,
    },
  };
}

// Main component - Server Component that passes data to Client Component
export default async function ProductPage({ params }: ProductPageProps) {
  const awaitedParams = await Promise.resolve(params);
  const slug = awaitedParams.slug;
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