import type { Metadata } from 'next';
import { sql } from '@vercel/postgres';
import IndividualOrderContent from './IndividualOrderContent';
import type { ProductWithImages } from '@/app/lib/definitions';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Під замовлення | Dekop',
  description:
    'Замовте індивідуальні меблі за Вашими параметрами. Обирайте вид виробу, матеріали та кольори — наш менеджер зв\'яжеться з Вами для уточнення деталей.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dekop.com.ua'}/individual-order`,
  },
  openGraph: {
    title: 'Під замовлення | Dekop',
    description: 'Замовте індивідуальні меблі за Вашими параметрами.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dekop.com.ua'}/individual-order`,
  },
};

export default async function IndividualOrderPage() {
  let suggestions: ProductWithImages[] = [];

  try {
    const result = await sql<ProductWithImages>`
      SELECT
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'alt', pi.alt,
              'is_primary', pi.is_primary,
              'color', pi.color
            ) ORDER BY pi.is_primary DESC, pi.id ASC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE p.stock > 0
      GROUP BY p.id
      ORDER BY p.is_bestseller DESC, p.rating DESC, p.created_at DESC
      LIMIT 12
    `;
    suggestions = result.rows;
  } catch {
    // Suggestions are non-critical — render without them on DB error
  }

  return <IndividualOrderContent suggestions={suggestions} />;
}
