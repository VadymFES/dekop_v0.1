import type { Metadata } from 'next';
import { db } from '@/app/lib/db';
import KitchensContent from './KitchensContent';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Кухні на замовлення | Dekop',
  description:
    'Виготовляємо кухні за індивідуальними замовленнями. Обирайте матеріали, кольори та техніку — наш менеджер уточнить деталі.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dekop.com.ua'}/kitchens`,
  },
  openGraph: {
    title: 'Кухні на замовлення | Dekop',
    description:
      'Виготовляємо кухні за індивідуальними замовленнями. Обирайте матеріали, кольори та техніку.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dekop.com.ua'}/kitchens`,
  },
};

export default async function KitchensPage() {
  let cards: { id: number; name: string; description: string; price: number; image_url: string }[] = [];
  let gallery: { id: number; image_url: string; alt: string }[] = [];

  try {
    const [cardsRes, galleryRes] = await Promise.all([
      db.query`SELECT id, name, description, price, image_url FROM kitchen_cards ORDER BY sort_order ASC, created_at ASC`,
      db.query`SELECT id, image_url, alt FROM kitchen_gallery ORDER BY sort_order ASC, created_at ASC`,
    ]);
    cards = cardsRes.rows;
    gallery = galleryRes.rows;
  } catch {
    // fallback to static defaults in the client component
  }

  return <KitchensContent dbCards={cards} dbGallery={gallery} />;
}
