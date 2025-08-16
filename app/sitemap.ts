import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/catalog`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about-us`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/individual-order`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ]

  // Category pages
  const categories = [
    'sofas',
    'sofaBeds', 
    'cornerSofas',
    'chairs',
    'tables',
    'wardrobes',
    'beds',
    'mattresses',
    'accessories'
  ]

  const categoryPages = categories.map(category => ({
    url: `${baseUrl}/catalog?category=${category}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Fetch all products for dynamic product pages
  let productPages: MetadataRoute.Sitemap = []
  
  try {
    // Use internal API call for better performance during build
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? `${baseUrl}/api/products`
      : 'http://localhost:3000/api/products'
      
    const response = await fetch(apiUrl, {
      next: { revalidate: 3600 }, // Revalidate every hour
      headers: {
        'User-Agent': 'Sitemap Generator',
      },
    })
    
    if (response.ok) {
      const products = await response.json()
      
      productPages = products.map((product: { 
        slug: string; 
        updated_at?: string; 
        created_at?: string;
        name?: string;
      }) => ({
        url: `${baseUrl}/product/${encodeURIComponent(product.slug)}`,
        lastModified: new Date(product.updated_at || product.created_at || new Date()),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    } else {
      console.warn(`Failed to fetch products for sitemap: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error fetching products for sitemap:', error)
    // Continue without product pages rather than failing the build
  }

  // Brand/manufacturer pages
  const brands = [
    'alta', 'artex', 'busol', 'divotex', 'etera', 'pulsar', 'swisspan', 
    'mebtex', 'megatex', 'textoria'
  ]

  const brandPages = brands.map(brand => ({
    url: `${baseUrl}/catalog?brand=${brand}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [
    ...staticPages,
    ...categoryPages,
    ...brandPages,
    ...productPages,
  ]
}