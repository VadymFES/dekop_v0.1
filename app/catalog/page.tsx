import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import CatalogContent from './CatalogContent.tsx';

const CATEGORY_LABELS: Record<string, string> = {
  sofas:       'Дивани',
  sofaBeds:    'Дивани-ліжка',
  cornerSofas: 'Кутові дивани',
  chairs:      'Стільці',
  tables:      'Столи',
  wardrobes:   'Шафи',
  beds:        'Ліжка',
  mattresses:  'Матраци',
  accessories: 'Аксесуари',
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const label = category ? CATEGORY_LABELS[category] : undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dekop.com.ua';

  const title = label ? `${label} купити онлайн | Dekop` : 'Каталог меблів | Dekop';
  const description = label
    ? `Купити ${label.toLowerCase()} в інтернет-магазині Dekop. Широкий вибір моделей, доступні ціни, доставка по Україні.`
    : 'Каталог меблів Dekop — дивани, ліжка, столи, шафи та аксесуари для вашого дому. Доставка по Україні.';

  return {
    title,
    description,
    alternates: {
      canonical: category ? `${baseUrl}/catalog?category=${category}` : `${baseUrl}/catalog`,
    },
    openGraph: {
      title,
      description,
      url: category ? `${baseUrl}/catalog?category=${category}` : `${baseUrl}/catalog`,
    },
  };
}

export default function CatalogPage(): React.ReactElement {
  return (
    <Suspense>
      <CatalogContent />
    </Suspense>
  );
}
