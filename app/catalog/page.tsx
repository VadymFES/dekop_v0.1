// /app/catalog/page.tsx
import React, { Suspense } from 'react';
import { Metadata } from 'next';
import CatalogContent from './CatalogContent.tsx';

export const metadata: Metadata = {
  title: "Каталог - Dekop Furniture Enterprise",
  description: "Широкий вибір якісних меблів: дивани, стільці, столи, шафи, ліжка та матраци. Фільтрація за категоріями, ціною та характеристиками.",
  keywords: "каталог, купити меблі, дивани, стільці, столи, шафи, ліжка, матраци, фільтр меблів",
  openGraph: {
    title: "Каталог - Dekop Furniture Enterprise",
    description: "Широкий вибір якісних меблів для вашого дому. Зручна фільтрація та швидке замовлення.",
    type: "website",
  },
};

export default function CatalogPage(): React.ReactElement {
  return (
    <Suspense fallback={<div>Завантаження каталогу...</div>}>
      <CatalogContent />
    </Suspense>
  );
}