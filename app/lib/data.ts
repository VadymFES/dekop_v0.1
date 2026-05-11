import { ProductWithImages } from './definitions'

export async function getProducts(): Promise<ProductWithImages[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products`);
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

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function getAllProductSlugs(): Promise<Array<{ slug: string }>> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/slugs`);
    const slugs = await response.json();
    return slugs.map((slug: string) => ({ slug }));
  }
