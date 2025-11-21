// getProductByName function is defined in app/lib/data.ts:

import { ProductWithImages } from './definitions'
import { logger } from '@/app/lib/logger'

export async function getProducts(): Promise<ProductWithImages[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products`); // Use backticks here
  if (!response.ok) {
    return [];
  }
  return await response.json();
}


export async function getProductBySlug(slug: string): Promise<ProductWithImages | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${encodeURIComponent(slug)}`
    );
    logger.info('Fetching product for slug', { slug });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    logger.error('Error fetching product', error instanceof Error ? error : new Error(String(error)), { slug });
    return null;
  }
}

  export async function getAllProductSlugs(): Promise<Array<{ slug: string }>> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/slugs`); // Use backticks here
    const slugs = await response.json();
    return slugs.map((slug: string) => ({ slug }));
  }
