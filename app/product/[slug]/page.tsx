import { Metadata, ResolvingMetadata } from 'next';
import { ProductWithImages, Review } from '@/app/lib/definitions';
import { notFound } from 'next/navigation';
import { productSchema, breadcrumbSchema } from '@/app/lib/schema';
import { db } from '@/app/lib/db';

import ClientProductPage from './client-page';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const CATEGORY_SLUG_MAP: Record<string, { dbValue: string; uaName: string }> = {
  sofas:        { dbValue: "Диван",          uaName: "Дивани" },
  sofaBeds:     { dbValue: "Диван-Ліжко",    uaName: "Дивани-ліжка" },
  cornerSofas:  { dbValue: "Кутовий Диван",  uaName: "Кутові дивани" },
  chairs:       { dbValue: "Стілець",        uaName: "Стільці" },
  tables:       { dbValue: "Стіл",           uaName: "Столи" },
  wardrobes:    { dbValue: "Шафа",           uaName: "Шафи" },
  beds:         { dbValue: "Ліжко",          uaName: "Ліжка" },
  mattresses:   { dbValue: "Матрац",         uaName: "Матраци" },
  accessories:  { dbValue: "Аксесуар",       uaName: "Аксесуари" },
};

async function getProductData(slug: string) {
  try {
    // 1. Core product with aggregated rating
    const { rows: productRows } = await db.query`
      SELECT p.*,
        COALESCE(AVG(r.rating), 0)::float AS avg_rating,
        COUNT(r.id)::int                  AS review_count
      FROM products p
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE p.slug = ${slug}
      GROUP BY p.id
    `;
    if (productRows.length === 0) return null;
    const p = productRows[0];

    // 2. Images, colors, reviews, similar products — parallel
    const [imageResult, colorResult, reviewResult, similarResult, specResult] = await Promise.all([
      db.query`
        SELECT id, image_url, alt, is_primary, color
        FROM product_images WHERE product_id = ${p.id}
        ORDER BY is_primary DESC, id ASC
      `,
      db.query`
        SELECT product_id, color, image_url
        FROM product_spec_colors WHERE product_id = ${p.id}
      `,
      db.query`
        SELECT id, product_id, user_name, rating, comment, created_at
        FROM reviews WHERE product_id = ${p.id}
        ORDER BY created_at DESC
      `,
      db.query`
        SELECT p2.id, p2.name, p2.slug, p2.price, p2.sale_price,
               p2.category, p2.stock, p2.rating, p2.is_on_sale, p2.is_new, p2.is_bestseller,
               p2.created_at, p2.updated_at,
               (SELECT json_agg(json_build_object('id',pi.id,'image_url',pi.image_url,
                 'alt',pi.alt,'is_primary',pi.is_primary))
                FROM product_images pi WHERE pi.product_id = p2.id) AS images
        FROM products p2
        WHERE p2.category = ${p.category} AND p2.id != ${p.id} AND p2.stock > 0
        ORDER BY p2.is_bestseller DESC, p2.rating DESC
        LIMIT 8
      `,
      db.query`SELECT * FROM product_specs WHERE product_id = ${p.id} LIMIT 1`,
    ]);

    const images = imageResult.rows.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      image_url: (r.image_url as string) || '',
      alt: (r.alt as string) || '',
      is_primary: Boolean(r.is_primary),
      color: (r.color as string | null) || null,
    }));

    const colors = colorResult.rows.map((r: Record<string, unknown>) => ({
      product_id: r.product_id as number,
      color: (r.color as string) || '',
      image_url: (r.image_url as string) || '',
    }));

    const reviews: Review[] = reviewResult.rows.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      product_id: r.product_id as number,
      user_name: (r.user_name as string) || '',
      rating: r.rating as number,
      comment: (r.comment as string) || '',
      created_at: r.created_at ? new Date(r.created_at as string | Date).toISOString() : new Date().toISOString(),
    }));

    const similarProducts: ProductWithImages[] = similarResult.rows.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      name: (r.name as string) || '',
      slug: (r.slug as string) || '',
      description: '',
      category: (r.category as string) || '',
      price: parseFloat(String(r.price)) || 0,
      sale_price: r.sale_price ? parseFloat(String(r.sale_price)) : null,
      stock: (r.stock as number) || 0,
      rating: parseFloat(String(r.rating)) || 0,
      reviews: 0,
      is_on_sale: Boolean(r.is_on_sale),
      is_new: Boolean(r.is_new),
      is_bestseller: Boolean(r.is_bestseller),
      created_at: r.created_at ? new Date(r.created_at as string | Date).toISOString() : '',
      updated_at: r.updated_at ? new Date(r.updated_at as string | Date).toISOString() : '',
      images: Array.isArray(r.images) ? r.images : [],
      colors: [],
      specs: null,
    }));

    const product: ProductWithImages = {
      id: p.id,
      name: p.name || '',
      slug: p.slug || '',
      description: p.description || '',
      category: p.category || '',
      price: parseFloat(String(p.price)) || 0,
      sale_price: p.sale_price ? parseFloat(String(p.sale_price)) : null,
      stock: p.stock || 0,
      rating: parseFloat(String(p.avg_rating)) || 0,
      reviews: p.review_count || 0,
      is_on_sale: Boolean(p.is_on_sale),
      is_new: Boolean(p.is_new),
      is_bestseller: Boolean(p.is_bestseller),
      created_at: p.created_at ? new Date(p.created_at).toISOString() : '',
      updated_at: p.updated_at ? new Date(p.updated_at).toISOString() : '',
      images,
      colors,
      specs: specResult.rows[0] || null,
    };

    return { product, reviews, similarProducts };
  } catch (error) {
    console.error('Error loading product data:', error);
    return null;
  }
}

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductData(slug);

  if (!data || !data.product) {
    return { title: 'Товар не знайдений | Dekop' };
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

export default async function ProductPage({ params }: PageProps) {
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
